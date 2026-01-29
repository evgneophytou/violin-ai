'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  FEATURES,
  EVENTS,
  type FeatureValue,
  trackEvent,
  trackFeatureView,
  endFeatureView,
  trackClick,
  getTracker,
} from '@/lib/analytics/tracking';

// Re-export for convenience
export { FEATURES, EVENTS } from '@/lib/analytics/tracking';
export type { FeatureValue } from '@/lib/analytics/tracking';

/**
 * Hook for tracking feature usage with automatic session management
 * 
 * @param feature - The feature being viewed/used
 * @param options - Configuration options
 * 
 * @example
 * ```tsx
 * function PracticeTab() {
 *   const { track, trackClick } = useAnalytics(FEATURES.PRACTICE);
 *   
 *   const handleGenerateExercise = () => {
 *     track('exercise_generated', { difficulty: 5 });
 *     // ... generate exercise
 *   };
 *   
 *   return (
 *     <button onClick={() => trackClick('generate_exercise')}>
 *       Generate Exercise
 *     </button>
 *   );
 * }
 * ```
 */
export const useAnalytics = (
  feature: FeatureValue,
  options?: {
    /** Whether to auto-track session start/end (default: true) */
    autoTrackSession?: boolean;
    /** Custom properties to include with all events */
    defaultProperties?: Record<string, unknown>;
  }
) => {
  const { autoTrackSession = true, defaultProperties } = options ?? {};
  const isTracking = useRef(false);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  // Start session tracking when component mounts
  useEffect(() => {
    if (!autoTrackSession) return;

    // Prevent double-tracking in strict mode
    if (isTracking.current) return;
    isTracking.current = true;

    trackFeatureView(feature);

    // Send heartbeat every 30 seconds while feature is active
    heartbeatInterval.current = setInterval(() => {
      getTracker().sendHeartbeat();
    }, 30000);

    return () => {
      isTracking.current = false;
      endFeatureView(feature);
      
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
    };
  }, [feature, autoTrackSession]);

  /**
   * Track a custom event for this feature
   */
  const track = useCallback(
    (event: string, properties?: Record<string, unknown>, duration?: number) => {
      trackEvent(
        event,
        feature,
        { ...defaultProperties, ...properties },
        duration
      );
    },
    [feature, defaultProperties]
  );

  /**
   * Track a button click for this feature
   */
  const handleTrackClick = useCallback(
    (buttonName: string, properties?: Record<string, unknown>) => {
      trackClick(feature, buttonName, { ...defaultProperties, ...properties });
    },
    [feature, defaultProperties]
  );

  return {
    /** Track a custom event */
    track,
    /** Track a button click */
    trackClick: handleTrackClick,
    /** The current feature being tracked */
    feature,
  };
};

/**
 * Hook for tracking tab changes with timing
 * 
 * @example
 * ```tsx
 * function App() {
 *   const [activeTab, setActiveTab] = useState('practice');
 *   const { handleTabChange } = useTabTracking();
 *   
 *   const switchTab = (newTab: string) => {
 *     handleTabChange(activeTab, newTab);
 *     setActiveTab(newTab);
 *   };
 * }
 * ```
 */
export const useTabTracking = () => {
  const previousTab = useRef<FeatureValue | null>(null);
  const tabStartTime = useRef<number>(Date.now());

  /**
   * Handle tab change and track the transition
   */
  const handleTabChange = useCallback((fromTab: FeatureValue, toTab: FeatureValue) => {
    const duration = Math.round((Date.now() - tabStartTime.current) / 1000);

    // End session for previous tab
    if (previousTab.current) {
      endFeatureView(previousTab.current);
    }

    // Track the tab switch event
    trackEvent(EVENTS.TAB_SWITCHED, toTab, {
      from_tab: fromTab,
      to_tab: toTab,
      duration,
    });

    // Start session for new tab
    trackFeatureView(toTab);

    // Update refs
    previousTab.current = toTab;
    tabStartTime.current = Date.now();
  }, []);

  /**
   * Initialize tracking for the first tab
   */
  const initializeTab = useCallback((tab: FeatureValue) => {
    previousTab.current = tab;
    tabStartTime.current = Date.now();
    trackFeatureView(tab);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previousTab.current) {
        endFeatureView(previousTab.current);
      }
    };
  }, []);

  return {
    handleTabChange,
    initializeTab,
  };
};

/**
 * Hook for tracking timed actions (e.g., recording duration)
 * 
 * @example
 * ```tsx
 * function RecordingButton() {
 *   const { startTiming, stopTiming, isActive } = useTimedEvent(
 *     FEATURES.PRACTICE,
 *     'recording'
 *   );
 *   
 *   return (
 *     <button onClick={isActive ? stopTiming : startTiming}>
 *       {isActive ? 'Stop Recording' : 'Start Recording'}
 *     </button>
 *   );
 * }
 * ```
 */
export const useTimedEvent = (
  feature: FeatureValue,
  eventName: string,
  options?: {
    /** Custom properties to include with events */
    properties?: Record<string, unknown>;
  }
) => {
  const startTime = useRef<number | null>(null);
  const isActive = useRef(false);

  /**
   * Start timing an event
   */
  const startTiming = useCallback(
    (additionalProperties?: Record<string, unknown>) => {
      if (isActive.current) return;
      
      isActive.current = true;
      startTime.current = Date.now();
      
      trackEvent(`${eventName}_started`, feature, {
        ...options?.properties,
        ...additionalProperties,
      });
    },
    [feature, eventName, options?.properties]
  );

  /**
   * Stop timing and track the duration
   */
  const stopTiming = useCallback(
    (additionalProperties?: Record<string, unknown>) => {
      if (!isActive.current || !startTime.current) return 0;
      
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      isActive.current = false;
      
      trackEvent(`${eventName}_stopped`, feature, {
        ...options?.properties,
        ...additionalProperties,
        duration,
      });
      
      startTime.current = null;
      return duration;
    },
    [feature, eventName, options?.properties]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isActive.current && startTime.current) {
        const duration = Math.round((Date.now() - startTime.current) / 1000);
        trackEvent(`${eventName}_stopped`, feature, {
          ...options?.properties,
          duration,
          reason: 'unmount',
        });
      }
    };
  }, [feature, eventName, options?.properties]);

  return {
    startTiming,
    stopTiming,
    isActive: isActive.current,
    getElapsedTime: () => startTime.current 
      ? Math.round((Date.now() - startTime.current) / 1000) 
      : 0,
  };
};

/**
 * Simple tracking function for one-off events (doesn't need hooks)
 * Use this when you don't need session tracking
 */
export const simpleTrack = trackEvent;

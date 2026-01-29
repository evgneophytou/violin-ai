/**
 * Feature Usage Analytics - Client-side tracking service
 * Tracks user interactions with frontend features for developer insights
 */

// Feature identifiers for tracking
export const FEATURES = {
  PRACTICE: 'practice',
  SIGHT_READING: 'sight_reading',
  STUDIO: 'studio',
  EXPRESSION: 'expression',
  TOOLS: 'tools',
  JOURNAL: 'journal',
  THEORY: 'theory',
  REVIEW: 'review',
  METRONOME: 'metronome',
  TECHNIQUE: 'technique',
  EXAMS: 'exams',
  STATS: 'stats',
  REPERTOIRE: 'repertoire',
  WELLNESS: 'wellness',
  SCHEDULE: 'schedule',
  REFERENCE: 'reference',
  MY_PIECES: 'my_pieces',
  COACH: 'coach',
} as const;

export type FeatureKey = keyof typeof FEATURES;
export type FeatureValue = (typeof FEATURES)[FeatureKey];

// Event types for tracking
export const EVENTS = {
  // Navigation events
  TAB_VIEWED: 'tab_viewed',
  TAB_SWITCHED: 'tab_switched',
  
  // Practice events
  EXERCISE_GENERATED: 'exercise_generated',
  EXERCISE_PLAYED: 'exercise_played',
  RECORDING_STARTED: 'recording_started',
  RECORDING_STOPPED: 'recording_stopped',
  PERFORMANCE_ANALYZED: 'performance_analyzed',
  DIFFICULTY_CHANGED: 'difficulty_changed',
  FOCUS_CHANGED: 'focus_changed',
  
  // Exam events
  EXAM_STARTED: 'exam_started',
  EXAM_COMPLETED: 'exam_completed',
  EXAM_GRADE_SELECTED: 'exam_grade_selected',
  
  // Coach events
  COACH_MESSAGE_SENT: 'coach_message_sent',
  COACH_QUICK_ACTION: 'coach_quick_action',
  
  // Piece upload events
  PIECE_UPLOADED: 'piece_uploaded',
  PIECE_ANALYSIS_COMPLETED: 'piece_analysis_completed',
  
  // Theory events
  THEORY_TOPIC_SELECTED: 'theory_topic_selected',
  THEORY_QUIZ_COMPLETED: 'theory_quiz_completed',
  
  // Journal events
  JOURNAL_ENTRY_CREATED: 'journal_entry_created',
  JOURNAL_ENTRY_VIEWED: 'journal_entry_viewed',
  
  // Session events
  SESSION_STARTED: 'session_started',
  SESSION_ENDED: 'session_ended',
  SESSION_HEARTBEAT: 'session_heartbeat',
  
  // Generic
  FEATURE_USED: 'feature_used',
  BUTTON_CLICKED: 'button_clicked',
} as const;

export type EventKey = keyof typeof EVENTS;
export type EventValue = (typeof EVENTS)[EventKey];

// Event structure
export interface AnalyticsEvent {
  event: string;
  feature: FeatureValue;
  properties?: Record<string, unknown>;
  duration?: number;
  timestamp: number;
}

// Batch configuration
const BATCH_SIZE = 10;
const BATCH_INTERVAL_MS = 5000; // Send batch every 5 seconds
const MAX_QUEUE_SIZE = 100;

// Session ID management
const SESSION_KEY = 'violin_ai_session_id';
const SESSION_EXPIRY_KEY = 'violin_ai_session_expiry';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Generate a unique session ID
 */
const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

/**
 * Get or create a session ID (persisted in sessionStorage)
 */
export const getSessionId = (): string => {
  if (typeof window === 'undefined') {
    return 'server-side';
  }

  const existingId = sessionStorage.getItem(SESSION_KEY);
  const expiry = sessionStorage.getItem(SESSION_EXPIRY_KEY);

  // Check if session is still valid
  if (existingId && expiry && Date.now() < parseInt(expiry, 10)) {
    // Extend session expiry
    sessionStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + SESSION_DURATION_MS));
    return existingId;
  }

  // Create new session
  const newId = generateSessionId();
  sessionStorage.setItem(SESSION_KEY, newId);
  sessionStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + SESSION_DURATION_MS));
  return newId;
};

/**
 * Analytics tracker singleton
 */
class AnalyticsTracker {
  private eventQueue: AnalyticsEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isEnabled: boolean = true;
  private activeFeatureSessions: Map<FeatureValue, number> = new Map(); // feature -> startTime

  constructor() {
    if (typeof window !== 'undefined') {
      // Start batch timer
      this.startBatchTimer();
      
      // Send events on page unload
      window.addEventListener('beforeunload', () => {
        this.flush();
      });

      // Track visibility changes for session duration
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.endAllFeatureSessions();
          this.flush();
        }
      });
    }
  }

  /**
   * Enable or disable tracking
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if tracking is enabled
   */
  isTrackingEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Track an event
   */
  track(
    event: string,
    feature: FeatureValue,
    properties?: Record<string, unknown>,
    duration?: number
  ): void {
    if (!this.isEnabled || typeof window === 'undefined') {
      return;
    }

    const analyticsEvent: AnalyticsEvent = {
      event,
      feature,
      properties: this.sanitizeProperties(properties),
      duration,
      timestamp: Date.now(),
    };

    this.eventQueue.push(analyticsEvent);

    // Flush if queue is getting large
    if (this.eventQueue.length >= BATCH_SIZE) {
      this.flush();
    }

    // Prevent queue from growing too large
    if (this.eventQueue.length > MAX_QUEUE_SIZE) {
      this.eventQueue = this.eventQueue.slice(-MAX_QUEUE_SIZE);
    }
  }

  /**
   * Start tracking a feature session (for duration tracking)
   */
  startFeatureSession(feature: FeatureValue): void {
    if (!this.isEnabled || typeof window === 'undefined') {
      return;
    }

    // End any existing session for this feature
    this.endFeatureSession(feature);

    this.activeFeatureSessions.set(feature, Date.now());
    this.track(EVENTS.TAB_VIEWED, feature);
  }

  /**
   * End a feature session and record duration
   */
  endFeatureSession(feature: FeatureValue): void {
    const startTime = this.activeFeatureSessions.get(feature);
    if (startTime) {
      const duration = Math.round((Date.now() - startTime) / 1000); // seconds
      this.activeFeatureSessions.delete(feature);
      
      // Only track if duration is meaningful (> 1 second)
      if (duration > 1) {
        this.track(EVENTS.SESSION_ENDED, feature, { feature }, duration);
      }
    }
  }

  /**
   * End all active feature sessions
   */
  endAllFeatureSessions(): void {
    for (const feature of this.activeFeatureSessions.keys()) {
      this.endFeatureSession(feature);
    }
  }

  /**
   * Send heartbeat for active sessions (called periodically)
   */
  sendHeartbeat(): void {
    for (const [feature, startTime] of this.activeFeatureSessions.entries()) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      this.track(EVENTS.SESSION_HEARTBEAT, feature, { duration });
    }
  }

  /**
   * Sanitize properties to remove any potential PII
   */
  private sanitizeProperties(
    properties?: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    if (!properties) return undefined;

    const sanitized: Record<string, unknown> = {};
    const allowedKeys = [
      'difficulty',
      'focus',
      'score',
      'duration',
      'grade',
      'level',
      'topic',
      'action',
      'type',
      'count',
      'success',
      'error_type',
      'tempo',
      'key',
      'time_signature',
      'measures',
      'from_tab',
      'to_tab',
      'file_type',
      'file_size',
    ];

    for (const [key, value] of Object.entries(properties)) {
      // Only include allowed keys
      if (allowedKeys.includes(key)) {
        // Don't include large strings (potential content)
        if (typeof value === 'string' && value.length > 100) {
          sanitized[key] = `[string:${value.length}]`;
        } else {
          sanitized[key] = value;
        }
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }

  /**
   * Start the batch timer
   */
  private startBatchTimer(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    this.batchTimer = setInterval(() => {
      this.flush();
    }, BATCH_INTERVAL_MS);

    // Don't prevent Node.js from exiting
    if (this.batchTimer.unref) {
      this.batchTimer.unref();
    }
  }

  /**
   * Flush the event queue to the server
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0 || typeof window === 'undefined') {
      return;
    }

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const sessionId = getSessionId();
      
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          events: eventsToSend,
        }),
        // Use keepalive to ensure the request completes even on page unload
        keepalive: true,
      });
    } catch (error) {
      // Re-queue events on failure (but limit queue size)
      this.eventQueue = [...eventsToSend.slice(-50), ...this.eventQueue].slice(-MAX_QUEUE_SIZE);
      
      // Log error in development only
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Analytics] Failed to send events:', error);
      }
    }
  }

  /**
   * Get current queue size (for debugging)
   */
  getQueueSize(): number {
    return this.eventQueue.length;
  }
}

// Singleton instance
let trackerInstance: AnalyticsTracker | null = null;

/**
 * Get the analytics tracker instance
 */
export const getTracker = (): AnalyticsTracker => {
  if (!trackerInstance) {
    trackerInstance = new AnalyticsTracker();
  }
  return trackerInstance;
};

// Convenience functions

/**
 * Track an event
 */
export const trackEvent = (
  event: string,
  feature: FeatureValue,
  properties?: Record<string, unknown>,
  duration?: number
): void => {
  getTracker().track(event, feature, properties, duration);
};

/**
 * Track a tab/feature view with automatic session tracking
 */
export const trackFeatureView = (feature: FeatureValue): void => {
  getTracker().startFeatureSession(feature);
};

/**
 * End tracking for a feature
 */
export const endFeatureView = (feature: FeatureValue): void => {
  getTracker().endFeatureSession(feature);
};

/**
 * Track a button click
 */
export const trackClick = (
  feature: FeatureValue,
  buttonName: string,
  properties?: Record<string, unknown>
): void => {
  trackEvent(EVENTS.BUTTON_CLICKED, feature, { action: buttonName, ...properties });
};

/**
 * Check if analytics is enabled
 */
export const isAnalyticsEnabled = (): boolean => {
  return getTracker().isTrackingEnabled();
};

/**
 * Enable or disable analytics
 */
export const setAnalyticsEnabled = (enabled: boolean): void => {
  getTracker().setEnabled(enabled);
};

/**
 * Manually flush events to server
 */
export const flushAnalytics = (): Promise<void> => {
  return getTracker().flush();
};

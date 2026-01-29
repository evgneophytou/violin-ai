import type { PerformanceAnalysis, ExerciseFocus, DifficultyAdjustment } from '@/types';

const MASTERY_THRESHOLD = 85;
const STRUGGLE_THRESHOLD = 60;
const CONSECUTIVE_SUCCESSES_NEEDED = 3;
const CONSECUTIVE_FAILURES_NEEDED = 2;

export interface DifficultyState {
  currentLevel: number;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  focusAreas: ExerciseFocus[];
  history: Array<{
    level: number;
    score: number;
    timestamp: number;
  }>;
}

export const createInitialDifficultyState = (startingLevel: number = 3): DifficultyState => ({
  currentLevel: Math.min(10, Math.max(1, startingLevel)),
  consecutiveSuccesses: 0,
  consecutiveFailures: 0,
  focusAreas: ['mixed'],
  history: [],
});

export const adjustDifficulty = (
  state: DifficultyState,
  analysis: PerformanceAnalysis
): DifficultyAdjustment => {
  const score = analysis.overallScore;
  const newState = { ...state };
  
  // Track history
  newState.history.push({
    level: state.currentLevel,
    score,
    timestamp: analysis.timestamp,
  });
  
  // Determine success or failure
  if (score >= MASTERY_THRESHOLD) {
    newState.consecutiveSuccesses++;
    newState.consecutiveFailures = 0;
  } else if (score < STRUGGLE_THRESHOLD) {
    newState.consecutiveFailures++;
    newState.consecutiveSuccesses = 0;
  } else {
    // In the middle zone - reset streaks but don't adjust
    newState.consecutiveSuccesses = Math.max(0, newState.consecutiveSuccesses - 1);
    newState.consecutiveFailures = Math.max(0, newState.consecutiveFailures - 1);
  }
  
  // Determine difficulty adjustment
  let newLevel = state.currentLevel;
  let reason = '';
  
  if (newState.consecutiveSuccesses >= CONSECUTIVE_SUCCESSES_NEEDED) {
    // Increase difficulty
    newLevel = Math.min(10, state.currentLevel + 1);
    newState.consecutiveSuccesses = 0;
    reason = `Excellent progress! You've mastered level ${state.currentLevel}. Moving to level ${newLevel}.`;
  } else if (newState.consecutiveFailures >= CONSECUTIVE_FAILURES_NEEDED) {
    // Decrease difficulty
    newLevel = Math.max(1, state.currentLevel - 1);
    newState.consecutiveFailures = 0;
    reason = `Let's take a step back to reinforce fundamentals. Adjusting to level ${newLevel}.`;
  } else if (score >= MASTERY_THRESHOLD) {
    reason = `Great performance! ${CONSECUTIVE_SUCCESSES_NEEDED - newState.consecutiveSuccesses} more at this level to advance.`;
  } else if (score < STRUGGLE_THRESHOLD) {
    reason = `This level is challenging. Let's focus on specific areas.`;
  } else {
    reason = `Good progress! Keep practicing at level ${state.currentLevel}.`;
  }
  
  newState.currentLevel = newLevel;
  
  // Determine focus areas based on performance analysis
  const focusAreas = determineFocusAreas(analysis);
  newState.focusAreas = focusAreas;
  
  return {
    newDifficulty: newLevel,
    reason,
    focusAreas,
  };
};

const determineFocusAreas = (analysis: PerformanceAnalysis): ExerciseFocus[] => {
  const areas: Array<{ focus: ExerciseFocus; score: number }> = [
    { focus: 'intonation', score: analysis.pitch.accuracy },
    { focus: 'rhythm', score: analysis.rhythm.accuracy },
    { focus: 'bowing', score: (analysis.dynamics.crescendoControl + analysis.dynamics.diminuendoControl) / 2 },
    { focus: 'arpeggios', score: analysis.phrasing.articulation },
    { focus: 'scales', score: analysis.phrasing.legato },
  ];
  
  // Sort by score (lowest first - areas needing work)
  areas.sort((a, b) => a.score - b.score);
  
  // Return the two weakest areas, or 'mixed' if everything is good
  const weakAreas = areas.filter(a => a.score < 80);
  
  if (weakAreas.length === 0) {
    return ['mixed'];
  }
  
  return weakAreas.slice(0, 2).map(a => a.focus);
};

export const getProgressSummary = (state: DifficultyState): {
  currentLevel: number;
  trend: 'improving' | 'steady' | 'struggling';
  averageScore: number;
  sessionsAtCurrentLevel: number;
  recommendation: string;
} => {
  const recentHistory = state.history.slice(-10);
  
  if (recentHistory.length === 0) {
    return {
      currentLevel: state.currentLevel,
      trend: 'steady',
      averageScore: 0,
      sessionsAtCurrentLevel: 0,
      recommendation: 'Start practicing to see your progress!',
    };
  }
  
  // Calculate average score
  const averageScore = Math.round(
    recentHistory.reduce((sum, h) => sum + h.score, 0) / recentHistory.length
  );
  
  // Determine trend
  let trend: 'improving' | 'steady' | 'struggling';
  if (recentHistory.length >= 3) {
    const recentAvg = recentHistory.slice(-3).reduce((s, h) => s + h.score, 0) / 3;
    const olderAvg = recentHistory.slice(0, -3).reduce((s, h) => s + h.score, 0) / Math.max(1, recentHistory.length - 3);
    
    if (recentAvg > olderAvg + 5) {
      trend = 'improving';
    } else if (recentAvg < olderAvg - 5) {
      trend = 'struggling';
    } else {
      trend = 'steady';
    }
  } else {
    trend = 'steady';
  }
  
  // Count sessions at current level
  const sessionsAtCurrentLevel = recentHistory.filter(
    h => h.level === state.currentLevel
  ).length;
  
  // Generate recommendation
  let recommendation: string;
  if (trend === 'improving' && averageScore >= 80) {
    recommendation = 'Excellent progress! You\'re ready for more challenging material.';
  } else if (trend === 'struggling') {
    recommendation = 'Focus on fundamentals. Try slower tempos and simpler exercises.';
  } else if (state.focusAreas.includes('intonation')) {
    recommendation = 'Practice scales slowly with a tuner to improve intonation.';
  } else if (state.focusAreas.includes('rhythm')) {
    recommendation = 'Use a metronome consistently to strengthen your rhythmic accuracy.';
  } else {
    recommendation = 'Continue with consistent daily practice for best results.';
  }
  
  return {
    currentLevel: state.currentLevel,
    trend,
    averageScore,
    sessionsAtCurrentLevel,
    recommendation,
  };
};

export const suggestNextExercise = (
  state: DifficultyState,
  lastAnalysis?: PerformanceAnalysis
): {
  difficulty: number;
  focus: ExerciseFocus;
  reason: string;
} => {
  // Default to current state
  let difficulty = state.currentLevel;
  let focus: ExerciseFocus = state.focusAreas[0] || 'mixed';
  let reason = 'Continuing at current level';
  
  if (lastAnalysis) {
    // Adjust based on recent performance
    if (lastAnalysis.overallScore >= 90) {
      // If they aced it, maybe try something harder or different
      focus = state.focusAreas[1] || 'mixed';
      reason = 'Great job! Trying a different focus area.';
    } else if (lastAnalysis.overallScore < 70) {
      // Struggling - focus on weakest area
      if (lastAnalysis.pitch.accuracy < lastAnalysis.rhythm.accuracy) {
        focus = 'intonation';
        reason = 'Let\'s focus on pitch accuracy.';
      } else {
        focus = 'rhythm';
        reason = 'Let\'s work on rhythmic precision.';
      }
    }
  }
  
  return { difficulty, focus, reason };
};

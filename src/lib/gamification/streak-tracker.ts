// Streak tracking utilities

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastPracticeAt: Date | null;
  streakStatus: 'active' | 'at_risk' | 'broken' | 'none';
  hoursUntilStreakLost: number | null;
}

export const getStreakInfo = (
  currentStreak: number,
  longestStreak: number,
  lastPracticeAt: Date | null
): StreakInfo => {
  if (!lastPracticeAt || currentStreak === 0) {
    return {
      currentStreak: 0,
      longestStreak,
      lastPracticeAt,
      streakStatus: 'none',
      hoursUntilStreakLost: null,
    };
  }

  const now = new Date();
  const lastPractice = new Date(lastPracticeAt);
  
  // Get the end of the day of last practice (midnight the next day)
  const endOfLastPracticeDay = new Date(lastPractice);
  endOfLastPracticeDay.setDate(endOfLastPracticeDay.getDate() + 1);
  endOfLastPracticeDay.setHours(23, 59, 59, 999);
  
  // Get today's date at midnight
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const lastPracticeDay = new Date(lastPractice);
  lastPracticeDay.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((todayStart.getTime() - lastPracticeDay.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 0) {
    // Practiced today - streak is active
    const endOfToday = new Date(todayStart);
    endOfToday.setDate(endOfToday.getDate() + 1);
    endOfToday.setHours(23, 59, 59, 999);
    
    const hoursLeft = Math.max(0, Math.floor((endOfToday.getTime() - now.getTime()) / (1000 * 60 * 60)));
    
    return {
      currentStreak,
      longestStreak,
      lastPracticeAt,
      streakStatus: 'active',
      hoursUntilStreakLost: hoursLeft + 24, // Today + tomorrow
    };
  } else if (daysDiff === 1) {
    // Practiced yesterday - streak at risk
    const endOfToday = new Date(todayStart);
    endOfToday.setHours(23, 59, 59, 999);
    
    const hoursLeft = Math.max(0, Math.floor((endOfToday.getTime() - now.getTime()) / (1000 * 60 * 60)));
    
    return {
      currentStreak,
      longestStreak,
      lastPracticeAt,
      streakStatus: 'at_risk',
      hoursUntilStreakLost: hoursLeft,
    };
  } else {
    // More than 1 day gap - streak is broken
    return {
      currentStreak: 0,
      longestStreak,
      lastPracticeAt,
      streakStatus: 'broken',
      hoursUntilStreakLost: null,
    };
  }
};

export const calculateNewStreak = (
  currentStreak: number,
  lastPracticeAt: Date | null
): { newStreak: number; isNewDay: boolean } => {
  if (!lastPracticeAt) {
    return { newStreak: 1, isNewDay: true };
  }

  const now = new Date();
  const lastPractice = new Date(lastPracticeAt);
  
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const lastPracticeDay = new Date(lastPractice);
  lastPracticeDay.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((todayStart.getTime() - lastPracticeDay.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 0) {
    // Same day - no streak change
    return { newStreak: currentStreak, isNewDay: false };
  } else if (daysDiff === 1) {
    // Next day - increment streak
    return { newStreak: currentStreak + 1, isNewDay: true };
  } else {
    // Streak broken - start fresh
    return { newStreak: 1, isNewDay: true };
  }
};

export const formatStreakMessage = (streakInfo: StreakInfo): string => {
  switch (streakInfo.streakStatus) {
    case 'active':
      if (streakInfo.currentStreak === 1) {
        return "Great start! Practice tomorrow to build your streak.";
      } else if (streakInfo.currentStreak < 7) {
        return `${streakInfo.currentStreak} day streak! Keep it going!`;
      } else if (streakInfo.currentStreak < 30) {
        return `${streakInfo.currentStreak} day streak! You're on fire!`;
      } else {
        return `${streakInfo.currentStreak} day streak! Incredible dedication!`;
      }
    case 'at_risk':
      return `Practice today to keep your ${streakInfo.currentStreak} day streak! ${streakInfo.hoursUntilStreakLost}h left.`;
    case 'broken':
      return "Start a new streak today!";
    case 'none':
    default:
      return "Practice today to start your streak!";
  }
};

export const getStreakMilestone = (streak: number): { isMilestone: boolean; milestone: number } => {
  const milestones = [7, 14, 21, 30, 60, 90, 100, 180, 365];
  
  for (const milestone of milestones) {
    if (streak === milestone) {
      return { isMilestone: true, milestone };
    }
  }
  
  return { isMilestone: false, milestone: 0 };
};

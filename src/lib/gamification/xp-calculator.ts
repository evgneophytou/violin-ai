// XP calculation and reward system

export const XP_REWARDS = {
  // Exercise completion
  exerciseComplete: 10,
  exerciseGoodScore: 15,    // 70-84%
  exerciseGreatScore: 20,   // 85-94%
  exercisePerfectScore: 30, // 95-100%
  
  // Streaks
  streakDay: 25,
  streakWeek: 100,          // Bonus for 7-day streak
  streakMonth: 500,         // Bonus for 30-day streak
  
  // Achievements
  achievementUnlock: 50,
  
  // Milestones
  firstExercise: 25,
  tenExercises: 50,
  fiftyExercises: 100,
  hundredExercises: 200,
  
  // Practice time
  practiceMinute: 1,        // 1 XP per minute practiced
  practiceHour: 75,         // Bonus for full hour (60 + 15 bonus)
  
  // Level up bonus
  levelUpBonus: 100,
};

export interface XPEvent {
  type: keyof typeof XP_REWARDS;
  amount: number;
  description: string;
  timestamp: Date;
}

export const calculateExerciseXP = (score: number): { xp: number; events: XPEvent[] } => {
  const events: XPEvent[] = [];
  let totalXP = 0;
  
  // Base XP for completing
  totalXP += XP_REWARDS.exerciseComplete;
  events.push({
    type: 'exerciseComplete',
    amount: XP_REWARDS.exerciseComplete,
    description: 'Exercise completed',
    timestamp: new Date(),
  });
  
  // Bonus based on score
  if (score >= 95) {
    totalXP += XP_REWARDS.exercisePerfectScore;
    events.push({
      type: 'exercisePerfectScore',
      amount: XP_REWARDS.exercisePerfectScore,
      description: 'Perfect score bonus!',
      timestamp: new Date(),
    });
  } else if (score >= 85) {
    totalXP += XP_REWARDS.exerciseGreatScore;
    events.push({
      type: 'exerciseGreatScore',
      amount: XP_REWARDS.exerciseGreatScore,
      description: 'Great score bonus',
      timestamp: new Date(),
    });
  } else if (score >= 70) {
    totalXP += XP_REWARDS.exerciseGoodScore;
    events.push({
      type: 'exerciseGoodScore',
      amount: XP_REWARDS.exerciseGoodScore,
      description: 'Good score bonus',
      timestamp: new Date(),
    });
  }
  
  return { xp: totalXP, events };
};

export const calculateStreakXP = (currentStreak: number, previousStreak: number): { xp: number; events: XPEvent[] } => {
  const events: XPEvent[] = [];
  let totalXP = 0;
  
  // Only award XP if streak increased
  if (currentStreak > previousStreak) {
    // Daily streak bonus
    totalXP += XP_REWARDS.streakDay;
    events.push({
      type: 'streakDay',
      amount: XP_REWARDS.streakDay,
      description: `${currentStreak} day streak!`,
      timestamp: new Date(),
    });
    
    // Week milestone
    if (currentStreak === 7 || (currentStreak > 7 && currentStreak % 7 === 0)) {
      totalXP += XP_REWARDS.streakWeek;
      events.push({
        type: 'streakWeek',
        amount: XP_REWARDS.streakWeek,
        description: 'Week streak bonus!',
        timestamp: new Date(),
      });
    }
    
    // Month milestone
    if (currentStreak === 30 || (currentStreak > 30 && currentStreak % 30 === 0)) {
      totalXP += XP_REWARDS.streakMonth;
      events.push({
        type: 'streakMonth',
        amount: XP_REWARDS.streakMonth,
        description: 'Month streak bonus!',
        timestamp: new Date(),
      });
    }
  }
  
  return { xp: totalXP, events };
};

export const calculatePracticeTimeXP = (minutes: number): { xp: number; events: XPEvent[] } => {
  const events: XPEvent[] = [];
  let totalXP = 0;
  
  // XP per minute
  const minuteXP = minutes * XP_REWARDS.practiceMinute;
  totalXP += minuteXP;
  
  if (minuteXP > 0) {
    events.push({
      type: 'practiceMinute',
      amount: minuteXP,
      description: `${minutes} minutes practiced`,
      timestamp: new Date(),
    });
  }
  
  // Hour bonus
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    const hourBonus = hours * 15; // 15 XP bonus per hour
    totalXP += hourBonus;
    events.push({
      type: 'practiceHour',
      amount: hourBonus,
      description: `${hours} hour${hours > 1 ? 's' : ''} practice bonus`,
      timestamp: new Date(),
    });
  }
  
  return { xp: totalXP, events };
};

export const calculateMilestoneXP = (
  totalExercises: number,
  previousTotal: number
): { xp: number; events: XPEvent[] } => {
  const events: XPEvent[] = [];
  let totalXP = 0;
  
  const milestones = [
    { count: 1, reward: XP_REWARDS.firstExercise, type: 'firstExercise' as const, desc: 'First exercise!' },
    { count: 10, reward: XP_REWARDS.tenExercises, type: 'tenExercises' as const, desc: '10 exercises completed!' },
    { count: 50, reward: XP_REWARDS.fiftyExercises, type: 'fiftyExercises' as const, desc: '50 exercises completed!' },
    { count: 100, reward: XP_REWARDS.hundredExercises, type: 'hundredExercises' as const, desc: '100 exercises completed!' },
  ];
  
  for (const milestone of milestones) {
    if (totalExercises >= milestone.count && previousTotal < milestone.count) {
      totalXP += milestone.reward;
      events.push({
        type: milestone.type,
        amount: milestone.reward,
        description: milestone.desc,
        timestamp: new Date(),
      });
    }
  }
  
  return { xp: totalXP, events };
};

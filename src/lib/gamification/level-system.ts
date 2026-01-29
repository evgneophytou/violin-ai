// Level progression system with exponential curve

// XP required for each level (cumulative)
export const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  1000,   // Level 5
  2000,   // Level 6
  4000,   // Level 7
  8000,   // Level 8
  16000,  // Level 9
  32000,  // Level 10
  50000,  // Level 11
  75000,  // Level 12
  100000, // Level 13
  150000, // Level 14
  200000, // Level 15
  300000, // Level 16
  400000, // Level 17
  500000, // Level 18
  750000, // Level 19
  1000000,// Level 20
];

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Beginner',
  2: 'Novice',
  3: 'Apprentice',
  4: 'Student',
  5: 'Intermediate',
  6: 'Advancing',
  7: 'Skilled',
  8: 'Proficient',
  9: 'Advanced',
  10: 'Expert',
  11: 'Master',
  12: 'Virtuoso',
  13: 'Maestro',
  14: 'Artist',
  15: 'Performer',
  16: 'Soloist',
  17: 'Concertmaster',
  18: 'Principal',
  19: 'Legend',
  20: 'Immortal',
};

export const calculateLevel = (xp: number): number => {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return Math.min(level, LEVEL_THRESHOLDS.length);
};

export const getXPForLevel = (level: number): number => {
  if (level <= 0) return 0;
  if (level > LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return LEVEL_THRESHOLDS[level - 1];
};

export const getXPToNextLevel = (currentXP: number): { xpNeeded: number; xpProgress: number; progressPercent: number } => {
  const currentLevel = calculateLevel(currentXP);
  const currentLevelXP = getXPForLevel(currentLevel);
  const nextLevelXP = getXPForLevel(currentLevel + 1);
  
  if (currentLevel >= LEVEL_THRESHOLDS.length) {
    // Max level reached
    return {
      xpNeeded: 0,
      xpProgress: currentXP - currentLevelXP,
      progressPercent: 100,
    };
  }
  
  const xpInCurrentLevel = currentXP - currentLevelXP;
  const xpRequiredForLevel = nextLevelXP - currentLevelXP;
  const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpRequiredForLevel) * 100));
  
  return {
    xpNeeded: nextLevelXP - currentXP,
    xpProgress: xpInCurrentLevel,
    progressPercent,
  };
};

export const getLevelTitle = (level: number): string => {
  return LEVEL_TITLES[level] || LEVEL_TITLES[20];
};

export const checkLevelUp = (oldXP: number, newXP: number): { leveledUp: boolean; newLevel: number; oldLevel: number } => {
  const oldLevel = calculateLevel(oldXP);
  const newLevel = calculateLevel(newXP);
  
  return {
    leveledUp: newLevel > oldLevel,
    newLevel,
    oldLevel,
  };
};

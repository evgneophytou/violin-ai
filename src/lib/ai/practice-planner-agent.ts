'use client';

/**
 * Practice Planner Agent
 * 
 * Generates personalized daily/weekly practice schedules based on user goals,
 * time constraints, and skill gaps.
 */

// Types
export interface PracticeGoal {
  id: string;
  type: 'technique' | 'repertoire' | 'exam' | 'general';
  description: string;
  targetDate?: string;
  priority: 'high' | 'medium' | 'low';
  progress: number; // 0-100
}

export interface TimeConstraints {
  availableDays: number[]; // 0-6 (Sunday-Saturday)
  minutesPerDay: number;
  preferredTime?: 'morning' | 'afternoon' | 'evening';
}

export interface SkillAssessment {
  level: number; // 1-10
  strengths: string[];
  weaknesses: string[];
  recentFocusAreas: string[];
}

export interface PracticeActivity {
  id: string;
  type: 'warmup' | 'scales' | 'technique' | 'etudes' | 'repertoire' | 'sight_reading' | 'review' | 'cool_down';
  name: string;
  description?: string;
  duration: number; // minutes
  focusArea?: string;
  pieceId?: string;
  exerciseType?: string;
  priority: number; // 1-5
}

export interface DailyPlan {
  date: string;
  dayOfWeek: number;
  totalMinutes: number;
  activities: PracticeActivity[];
  focusTheme?: string;
  notes?: string;
}

export interface WeeklyPlan {
  weekStartDate: string;
  weekEndDate: string;
  totalMinutes: number;
  dailyPlans: DailyPlan[];
  weeklyGoals: string[];
  focusDistribution: Record<string, number>; // area -> minutes
}

export interface PlannerConfig {
  goals: PracticeGoal[];
  constraints: TimeConstraints;
  assessment: SkillAssessment;
  includeWarmup: boolean;
  includeCoolDown: boolean;
  balanceAreas: boolean;
}

// Activity templates
const WARMUP_TEMPLATES: PracticeActivity[] = [
  {
    id: 'warmup_openstrings',
    type: 'warmup',
    name: 'Open String Long Tones',
    description: 'Slow, sustained bow strokes on open strings focusing on tone quality',
    duration: 3,
    priority: 1,
  },
  {
    id: 'warmup_scales_slow',
    type: 'warmup',
    name: 'Slow Scale (One Octave)',
    description: 'Slow scale in comfortable key, focusing on intonation and bow control',
    duration: 5,
    priority: 1,
  },
  {
    id: 'warmup_stretches',
    type: 'warmup',
    name: 'Finger Stretches',
    description: 'Gentle hand and finger stretches to prepare for practice',
    duration: 2,
    priority: 1,
  },
];

const SCALE_TEMPLATES: PracticeActivity[] = [
  {
    id: 'scales_major_3oct',
    type: 'scales',
    name: 'Major Scales (3 Octaves)',
    description: 'Three-octave major scales with various bowings',
    duration: 10,
    focusArea: 'scales',
    priority: 2,
  },
  {
    id: 'scales_minor_3oct',
    type: 'scales',
    name: 'Minor Scales (3 Octaves)',
    description: 'Melodic and harmonic minor scales',
    duration: 10,
    focusArea: 'scales',
    priority: 2,
  },
  {
    id: 'scales_arpeggios',
    type: 'scales',
    name: 'Arpeggios',
    description: 'Major and minor arpeggios in various keys',
    duration: 8,
    focusArea: 'arpeggios',
    priority: 2,
  },
];

const TECHNIQUE_TEMPLATES: PracticeActivity[] = [
  {
    id: 'tech_shifting',
    type: 'technique',
    name: 'Shifting Exercises',
    description: 'Practice smooth position changes',
    duration: 10,
    focusArea: 'shifting',
    priority: 3,
  },
  {
    id: 'tech_vibrato',
    type: 'technique',
    name: 'Vibrato Development',
    description: 'Vibrato exercises with metronome',
    duration: 8,
    focusArea: 'vibrato',
    priority: 3,
  },
  {
    id: 'tech_doublestops',
    type: 'technique',
    name: 'Double Stops',
    description: 'Thirds, sixths, and octaves exercises',
    duration: 10,
    focusArea: 'double_stops',
    priority: 3,
  },
  {
    id: 'tech_bowing',
    type: 'technique',
    name: 'Bow Strokes',
    description: 'Detaché, spiccato, staccato practice',
    duration: 10,
    focusArea: 'bowing',
    priority: 3,
  },
];

const COOL_DOWN_TEMPLATES: PracticeActivity[] = [
  {
    id: 'cooldown_longtones',
    type: 'cool_down',
    name: 'Relaxed Long Tones',
    description: 'Gentle long tones to relax muscles',
    duration: 3,
    priority: 5,
  },
  {
    id: 'cooldown_easy_piece',
    type: 'cool_down',
    name: 'Play Something Easy',
    description: 'End with a piece you enjoy and play well',
    duration: 5,
    priority: 5,
  },
];

// Focus themes for variety
const FOCUS_THEMES = [
  'Tone Production',
  'Intonation',
  'Rhythm & Tempo',
  'Dynamics & Expression',
  'Position Work',
  'Bow Technique',
  'Left Hand Agility',
  'Musical Phrasing',
];

// Practice Planner Class
export class PracticePlanner {
  private config: PlannerConfig;
  
  constructor(config: PlannerConfig) {
    this.config = config;
  }
  
  // Update configuration
  updateConfig(updates: Partial<PlannerConfig>): void {
    this.config = { ...this.config, ...updates };
  }
  
  // Generate a daily practice plan
  generateDailyPlan(date: Date, themeIndex?: number): DailyPlan {
    const dayOfWeek = date.getDay();
    const activities: PracticeActivity[] = [];
    let remainingMinutes = this.config.constraints.minutesPerDay;
    
    // Check if this is a practice day
    if (!this.config.constraints.availableDays.includes(dayOfWeek)) {
      return {
        date: date.toISOString().split('T')[0],
        dayOfWeek,
        totalMinutes: 0,
        activities: [],
        notes: 'Rest day',
      };
    }
    
    // Add warmup
    if (this.config.includeWarmup && remainingMinutes >= 5) {
      const warmup = this.selectActivity(WARMUP_TEMPLATES, remainingMinutes);
      if (warmup) {
        activities.push({ ...warmup, id: `${warmup.id}_${Date.now()}` });
        remainingMinutes -= warmup.duration;
      }
    }
    
    // Calculate time allocation
    const warmupTime = this.config.includeWarmup ? 5 : 0;
    const coolDownTime = this.config.includeCoolDown ? 5 : 0;
    const coreTime = remainingMinutes - coolDownTime;
    
    // Allocate time based on goals and weaknesses
    const allocations = this.calculateTimeAllocation(coreTime);
    
    // Add scales (if allocated)
    if (allocations.scales > 0) {
      const scale = this.selectActivity(SCALE_TEMPLATES, allocations.scales);
      if (scale) {
        activities.push({ ...scale, id: `${scale.id}_${Date.now()}`, duration: allocations.scales });
        remainingMinutes -= allocations.scales;
      }
    }
    
    // Add technique work (if allocated)
    if (allocations.technique > 0) {
      const technique = this.selectTechniqueActivity(allocations.technique);
      if (technique) {
        activities.push({ ...technique, id: `${technique.id}_${Date.now()}`, duration: allocations.technique });
        remainingMinutes -= allocations.technique;
      }
    }
    
    // Add repertoire/piece work
    if (allocations.repertoire > 0) {
      activities.push({
        id: `repertoire_${Date.now()}`,
        type: 'repertoire',
        name: 'Piece Work',
        description: 'Work on current repertoire pieces',
        duration: allocations.repertoire,
        focusArea: 'repertoire',
        priority: 3,
      });
      remainingMinutes -= allocations.repertoire;
    }
    
    // Add sight reading (if allocated)
    if (allocations.sightReading > 0) {
      activities.push({
        id: `sight_reading_${Date.now()}`,
        type: 'sight_reading',
        name: 'Sight Reading Practice',
        description: 'Practice sight reading new material',
        duration: allocations.sightReading,
        focusArea: 'sight_reading',
        priority: 4,
      });
      remainingMinutes -= allocations.sightReading;
    }
    
    // Add review (spaced repetition items)
    if (allocations.review > 0) {
      activities.push({
        id: `review_${Date.now()}`,
        type: 'review',
        name: 'Review Previous Material',
        description: 'Review items from spaced repetition queue',
        duration: allocations.review,
        focusArea: 'review',
        priority: 2,
      });
      remainingMinutes -= allocations.review;
    }
    
    // Add cool down
    if (this.config.includeCoolDown && remainingMinutes >= 3) {
      const coolDown = this.selectActivity(COOL_DOWN_TEMPLATES, remainingMinutes);
      if (coolDown) {
        activities.push({ ...coolDown, id: `${coolDown.id}_${Date.now()}` });
        remainingMinutes -= coolDown.duration;
      }
    }
    
    // Select theme
    const theme = FOCUS_THEMES[themeIndex ?? date.getDate() % FOCUS_THEMES.length];
    
    const totalMinutes = activities.reduce((sum, a) => sum + a.duration, 0);
    
    return {
      date: date.toISOString().split('T')[0],
      dayOfWeek,
      totalMinutes,
      activities,
      focusTheme: theme,
    };
  }
  
  // Generate a weekly practice plan
  generateWeeklyPlan(startDate: Date): WeeklyPlan {
    const dailyPlans: DailyPlan[] = [];
    let totalMinutes = 0;
    const focusDistribution: Record<string, number> = {};
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const dailyPlan = this.generateDailyPlan(date, i);
      dailyPlans.push(dailyPlan);
      totalMinutes += dailyPlan.totalMinutes;
      
      // Track focus distribution
      for (const activity of dailyPlan.activities) {
        const area = activity.focusArea || activity.type;
        focusDistribution[area] = (focusDistribution[area] || 0) + activity.duration;
      }
    }
    
    // Generate weekly goals
    const weeklyGoals = this.generateWeeklyGoals();
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    return {
      weekStartDate: startDate.toISOString().split('T')[0],
      weekEndDate: endDate.toISOString().split('T')[0],
      totalMinutes,
      dailyPlans,
      weeklyGoals,
      focusDistribution,
    };
  }
  
  // Calculate time allocation based on goals and assessment
  private calculateTimeAllocation(totalMinutes: number): {
    scales: number;
    technique: number;
    repertoire: number;
    sightReading: number;
    review: number;
  } {
    const { goals, assessment } = this.config;
    
    // Base allocation percentages
    let scalesPercent = 0.15;
    let techniquePercent = 0.25;
    let repertoirePercent = 0.35;
    let sightReadingPercent = 0.10;
    let reviewPercent = 0.15;
    
    // Adjust based on goals
    const hasExamGoal = goals.some(g => g.type === 'exam' && g.priority === 'high');
    const hasTechniqueGoal = goals.some(g => g.type === 'technique' && g.priority === 'high');
    const hasRepertoireGoal = goals.some(g => g.type === 'repertoire' && g.priority === 'high');
    
    if (hasExamGoal) {
      scalesPercent = 0.20;
      sightReadingPercent = 0.15;
    }
    
    if (hasTechniqueGoal) {
      techniquePercent = 0.35;
      repertoirePercent = 0.25;
    }
    
    if (hasRepertoireGoal) {
      repertoirePercent = 0.45;
      techniquePercent = 0.15;
    }
    
    // Adjust based on weaknesses
    if (assessment.weaknesses.includes('scales')) {
      scalesPercent += 0.05;
    }
    if (assessment.weaknesses.includes('sight_reading')) {
      sightReadingPercent += 0.05;
    }
    if (assessment.weaknesses.some(w => ['shifting', 'vibrato', 'bowing'].includes(w))) {
      techniquePercent += 0.05;
    }
    
    // Normalize percentages
    const total = scalesPercent + techniquePercent + repertoirePercent + sightReadingPercent + reviewPercent;
    scalesPercent /= total;
    techniquePercent /= total;
    repertoirePercent /= total;
    sightReadingPercent /= total;
    reviewPercent /= total;
    
    return {
      scales: Math.round(totalMinutes * scalesPercent),
      technique: Math.round(totalMinutes * techniquePercent),
      repertoire: Math.round(totalMinutes * repertoirePercent),
      sightReading: Math.round(totalMinutes * sightReadingPercent),
      review: Math.round(totalMinutes * reviewPercent),
    };
  }
  
  // Select an appropriate activity based on available time
  private selectActivity(templates: PracticeActivity[], availableMinutes: number): PracticeActivity | null {
    const suitable = templates.filter(t => t.duration <= availableMinutes);
    if (suitable.length === 0) return null;
    
    // Randomly select from suitable activities
    return suitable[Math.floor(Math.random() * suitable.length)];
  }
  
  // Select technique activity based on weaknesses
  private selectTechniqueActivity(availableMinutes: number): PracticeActivity | null {
    const { weaknesses } = this.config.assessment;
    
    // Prioritize activities that address weaknesses
    const prioritized = TECHNIQUE_TEMPLATES.filter(t => 
      t.focusArea && weaknesses.includes(t.focusArea)
    );
    
    if (prioritized.length > 0) {
      const suitable = prioritized.filter(t => t.duration <= availableMinutes);
      if (suitable.length > 0) {
        return suitable[Math.floor(Math.random() * suitable.length)];
      }
    }
    
    return this.selectActivity(TECHNIQUE_TEMPLATES, availableMinutes);
  }
  
  // Generate weekly goals based on configuration
  private generateWeeklyGoals(): string[] {
    const goals: string[] = [];
    const { assessment, goals: userGoals } = this.config;
    
    // Add goals based on weaknesses
    if (assessment.weaknesses.length > 0) {
      goals.push(`Focus on improving ${assessment.weaknesses[0].replace(/_/g, ' ')}`);
    }
    
    // Add goals based on user goals
    for (const goal of userGoals.slice(0, 2)) {
      if (goal.priority === 'high') {
        goals.push(goal.description);
      }
    }
    
    // Add general practice goals
    const generalGoals = [
      'Practice with consistent tempo using metronome',
      'Record yourself and listen back for feedback',
      'Focus on tone quality in slow practice',
      'Review difficult passages hands separately',
    ];
    
    while (goals.length < 4) {
      const randomGoal = generalGoals[Math.floor(Math.random() * generalGoals.length)];
      if (!goals.includes(randomGoal)) {
        goals.push(randomGoal);
      }
    }
    
    return goals.slice(0, 4);
  }
}

// Helper function to create a planner with defaults
export const createPracticePlanner = (
  config: Partial<PlannerConfig> = {}
): PracticePlanner => {
  const defaultConfig: PlannerConfig = {
    goals: [],
    constraints: {
      availableDays: [0, 1, 2, 3, 4, 5, 6], // All days
      minutesPerDay: 60,
    },
    assessment: {
      level: 5,
      strengths: [],
      weaknesses: [],
      recentFocusAreas: [],
    },
    includeWarmup: true,
    includeCoolDown: true,
    balanceAreas: true,
  };
  
  return new PracticePlanner({ ...defaultConfig, ...config });
};

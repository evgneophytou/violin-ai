'use client';

/**
 * Mindset Coach Agent (Performance Anxiety Coach)
 * 
 * Specialized coaching for managing performance anxiety and mental preparation.
 * Includes breathing exercises, visualization, and cognitive reframing.
 */

// Types
export interface BreathingExercise {
  id: string;
  name: string;
  description: string;
  duration: number; // seconds
  phases: BreathingPhase[];
  benefits: string[];
  bestFor: string[];
}

export interface BreathingPhase {
  type: 'inhale' | 'hold' | 'exhale' | 'pause';
  duration: number; // seconds
  instruction: string;
}

export interface VisualizationScript {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  category: 'pre_performance' | 'practice' | 'recovery' | 'confidence';
  script: string[];
  audioUrl?: string;
}

export interface CognitiveReframe {
  trigger: string;
  negativeThought: string;
  reframedThought: string;
  affirmation: string;
}

export interface AnxietyLevel {
  level: 1 | 2 | 3 | 4 | 5;
  description: string;
  symptoms: string[];
  recommendations: string[];
}

export interface PrePerformanceRoutine {
  name: string;
  timeBeforePerformance: number; // minutes
  steps: RoutineStep[];
}

export interface RoutineStep {
  order: number;
  name: string;
  duration: number; // minutes
  type: 'physical' | 'mental' | 'musical' | 'breathing';
  description: string;
  optional: boolean;
}

export interface MindsetSession {
  id: string;
  date: string;
  type: 'breathing' | 'visualization' | 'pre_performance' | 'check_in';
  duration: number;
  anxietyBefore?: number;
  anxietyAfter?: number;
  notes?: string;
}

// Breathing Exercises Library
export const BREATHING_EXERCISES: BreathingExercise[] = [
  {
    id: 'box_breathing',
    name: 'Box Breathing',
    description: 'A calming technique used by Navy SEALs to reduce stress and increase focus.',
    duration: 60,
    phases: [
      { type: 'inhale', duration: 4, instruction: 'Breathe in slowly through your nose' },
      { type: 'hold', duration: 4, instruction: 'Hold your breath gently' },
      { type: 'exhale', duration: 4, instruction: 'Breathe out slowly through your mouth' },
      { type: 'pause', duration: 4, instruction: 'Rest before the next breath' },
    ],
    benefits: ['Reduces stress', 'Increases focus', 'Calms nervous system'],
    bestFor: ['Pre-performance anxiety', 'Practice breaks', 'General stress relief'],
  },
  {
    id: '4_7_8_breathing',
    name: '4-7-8 Relaxation Breath',
    description: 'A natural tranquilizer for the nervous system that promotes deep relaxation.',
    duration: 57,
    phases: [
      { type: 'inhale', duration: 4, instruction: 'Inhale quietly through your nose' },
      { type: 'hold', duration: 7, instruction: 'Hold your breath' },
      { type: 'exhale', duration: 8, instruction: 'Exhale completely through your mouth with a whoosh sound' },
    ],
    benefits: ['Promotes sleep', 'Reduces anxiety', 'Manages cravings'],
    bestFor: ['Before bed practice', 'High anxiety moments', 'Calming down quickly'],
  },
  {
    id: 'diaphragmatic',
    name: 'Diaphragmatic Breathing',
    description: 'Deep belly breathing that activates the parasympathetic nervous system.',
    duration: 60,
    phases: [
      { type: 'inhale', duration: 5, instruction: 'Breathe deeply into your belly, feeling it expand' },
      { type: 'pause', duration: 1, instruction: 'Brief pause at the top' },
      { type: 'exhale', duration: 6, instruction: 'Let the breath flow out naturally, belly falling' },
      { type: 'pause', duration: 1, instruction: 'Rest' },
    ],
    benefits: ['Reduces cortisol', 'Improves oxygen flow', 'Supports good posture'],
    bestFor: ['Musicians', 'Before practice', 'Building breath awareness'],
  },
  {
    id: 'quick_calm',
    name: 'Quick Calm Breath',
    description: 'A fast technique to use right before going on stage.',
    duration: 30,
    phases: [
      { type: 'inhale', duration: 3, instruction: 'Quick breath in through nose' },
      { type: 'exhale', duration: 6, instruction: 'Slow, controlled exhale' },
      { type: 'pause', duration: 1, instruction: 'Brief rest' },
    ],
    benefits: ['Quick anxiety relief', 'Can be done discreetly', 'Activates calm response'],
    bestFor: ['Backstage', 'Between pieces', 'Audition waiting room'],
  },
  {
    id: 'energizing',
    name: 'Energizing Breath',
    description: 'Stimulating breath pattern to increase alertness and energy.',
    duration: 30,
    phases: [
      { type: 'inhale', duration: 1, instruction: 'Sharp breath in through nose' },
      { type: 'exhale', duration: 1, instruction: 'Forceful breath out through nose' },
    ],
    benefits: ['Increases energy', 'Improves alertness', 'Clears mental fog'],
    bestFor: ['Feeling sluggish', 'Waking up for practice', 'Need quick energy boost'],
  },
];

// Visualization Scripts
export const VISUALIZATION_SCRIPTS: VisualizationScript[] = [
  {
    id: 'successful_performance',
    name: 'Successful Performance',
    description: 'Visualize yourself giving a flawless, confident performance.',
    duration: 5,
    category: 'pre_performance',
    script: [
      'Close your eyes and take three deep breaths.',
      'Imagine yourself backstage, feeling calm and prepared.',
      'See yourself walking onto the stage with confidence, your posture relaxed but alert.',
      'Feel the violin in your hands - familiar, comfortable, an extension of yourself.',
      'As you raise your bow, feel a sense of excitement rather than fear.',
      'Begin playing. Notice how naturally your fingers find each note.',
      'Hear the beautiful sound you\'re creating. The tone is rich and expressive.',
      'See the audience engaged, moved by your music.',
      'Feel the joy of sharing your music with others.',
      'As you finish, hear the applause. Feel pride in your accomplishment.',
      'Take a bow, knowing you gave your best performance.',
      'Carry this feeling of confidence with you.',
    ],
  },
  {
    id: 'calm_preparation',
    name: 'Calm Preparation',
    description: 'A calming visualization for before practice or performance.',
    duration: 3,
    category: 'pre_performance',
    script: [
      'Settle into a comfortable position and close your eyes.',
      'Imagine a warm, golden light surrounding you.',
      'With each breath, this light fills you with calm and confidence.',
      'Feel tension melting away from your shoulders, arms, and hands.',
      'Your hands are warm, relaxed, and ready to make music.',
      'Picture yourself in your favorite practice space.',
      'You feel safe, focused, and eager to play.',
      'Know that whatever happens, you are prepared.',
      'Open your eyes when ready, carrying this calm with you.',
    ],
  },
  {
    id: 'technical_mastery',
    name: 'Technical Mastery',
    description: 'Visualize executing a difficult passage perfectly.',
    duration: 5,
    category: 'practice',
    script: [
      'Think of a challenging passage you\'re working on.',
      'Close your eyes and see the music in your mind.',
      'Watch your ideal self playing this passage perfectly.',
      'Notice the precise finger movements, the smooth bow changes.',
      'Hear the passage played exactly as you want it to sound.',
      'Now imagine yourself as this ideal player.',
      'Feel your fingers moving with effortless precision.',
      'Feel the bow flowing smoothly across the strings.',
      'The difficult becomes easy. The complex becomes natural.',
      'Know that your body can learn what your mind can imagine.',
      'Open your eyes, ready to practice with this clarity.',
    ],
  },
  {
    id: 'recovery',
    name: 'Recovery After Difficult Performance',
    description: 'Process and learn from a challenging experience.',
    duration: 7,
    category: 'recovery',
    script: [
      'Find a quiet space and close your eyes.',
      'Take several deep breaths, letting go of tension with each exhale.',
      'Whatever happened during your performance, you are safe now.',
      'Acknowledge any feelings without judgment - disappointment, frustration, or sadness are normal.',
      'Remember: one performance does not define you as a musician.',
      'Think of three things that went well, no matter how small.',
      'Consider what you learned from this experience.',
      'Every great musician has had difficult performances. This is part of growth.',
      'Imagine placing the difficult feelings in a box and setting it aside.',
      'Focus on your next step forward - what will you practice tomorrow?',
      'Feel gratitude for the opportunity to perform and learn.',
      'Open your eyes with renewed commitment to your musical journey.',
    ],
  },
];

// Cognitive Reframes for Common Performance Anxieties
export const COGNITIVE_REFRAMES: CognitiveReframe[] = [
  {
    trigger: 'Before performance',
    negativeThought: 'I\'m going to mess up and everyone will judge me.',
    reframedThought: 'I\'ve prepared well and the audience wants me to succeed. Small imperfections are normal and often go unnoticed.',
    affirmation: 'I am prepared. I am capable. I am ready to share my music.',
  },
  {
    trigger: 'Memory slip fear',
    negativeThought: 'What if I forget my music? It will be a disaster.',
    reframedThought: 'I have practiced this piece many times. My muscle memory is strong. If I have a slip, I know how to recover gracefully.',
    affirmation: 'My preparation has made this music part of me.',
  },
  {
    trigger: 'Comparing to others',
    negativeThought: 'Other violinists are so much better than me.',
    reframedThought: 'Every musician is on their own journey. My unique voice and interpretation have value. I focus on my own growth.',
    affirmation: 'I bring my own unique artistry to every performance.',
  },
  {
    trigger: 'Physical symptoms',
    negativeThought: 'My hands are shaking - I can\'t play like this.',
    reframedThought: 'Physical arousal means I care about this performance. I can use this energy to enhance my playing, not hinder it.',
    affirmation: 'This energy is excitement, not fear. It will help me play with passion.',
  },
  {
    trigger: 'Making mistakes',
    negativeThought: 'I made a mistake. The performance is ruined.',
    reframedThought: 'Mistakes are part of live performance. The audience cares about the overall musical experience, not perfection.',
    affirmation: 'I let go of mistakes and stay present in the music.',
  },
  {
    trigger: 'Not feeling ready',
    negativeThought: 'I should have practiced more. I\'m not ready.',
    reframedThought: 'I have done my best to prepare. Being "ready" is a feeling, not a fact. I can perform well with what I know now.',
    affirmation: 'I trust my preparation and my abilities.',
  },
];

// Pre-Performance Routines
export const PRE_PERFORMANCE_ROUTINES: PrePerformanceRoutine[] = [
  {
    name: '30-Minute Pre-Performance Routine',
    timeBeforePerformance: 30,
    steps: [
      {
        order: 1,
        name: 'Arrival & Setup',
        duration: 5,
        type: 'physical',
        description: 'Arrive, find your space, set up your instrument and music.',
        optional: false,
      },
      {
        order: 2,
        name: 'Gentle Warm-up',
        duration: 5,
        type: 'physical',
        description: 'Gentle stretches for hands, arms, shoulders, and neck.',
        optional: false,
      },
      {
        order: 3,
        name: 'Breathing Exercise',
        duration: 3,
        type: 'breathing',
        description: 'Box breathing or 4-7-8 breathing to calm nerves.',
        optional: false,
      },
      {
        order: 4,
        name: 'Instrument Warm-up',
        duration: 7,
        type: 'musical',
        description: 'Open strings, easy scales, simple passages. No difficult sections.',
        optional: false,
      },
      {
        order: 5,
        name: 'Visualization',
        duration: 5,
        type: 'mental',
        description: 'Visualize successful performance from start to finish.',
        optional: false,
      },
      {
        order: 6,
        name: 'Power Pose & Affirmations',
        duration: 2,
        type: 'mental',
        description: 'Stand tall, say your performance affirmations silently.',
        optional: true,
      },
      {
        order: 7,
        name: 'Final Breath',
        duration: 3,
        type: 'breathing',
        description: 'Quick calm breathing right before going on.',
        optional: false,
      },
    ],
  },
  {
    name: '15-Minute Quick Prep',
    timeBeforePerformance: 15,
    steps: [
      {
        order: 1,
        name: 'Center Yourself',
        duration: 2,
        type: 'breathing',
        description: 'Quick calm breathing to center yourself.',
        optional: false,
      },
      {
        order: 2,
        name: 'Physical Check-in',
        duration: 2,
        type: 'physical',
        description: 'Roll shoulders, shake out hands, check posture.',
        optional: false,
      },
      {
        order: 3,
        name: 'Brief Warm-up',
        duration: 5,
        type: 'musical',
        description: 'Quick scales or easy passage. Don\'t practice hard parts.',
        optional: false,
      },
      {
        order: 4,
        name: 'Mental Preparation',
        duration: 3,
        type: 'mental',
        description: 'Visualize first phrase. Set your intention for the performance.',
        optional: false,
      },
      {
        order: 5,
        name: 'Final Breath',
        duration: 3,
        type: 'breathing',
        description: 'Deep breaths before walking on.',
        optional: false,
      },
    ],
  },
];

// Anxiety Level Assessments
export const ANXIETY_LEVELS: AnxietyLevel[] = [
  {
    level: 1,
    description: 'Calm and Confident',
    symptoms: ['Relaxed body', 'Clear thinking', 'Positive outlook'],
    recommendations: ['Maintain current state', 'Light preparation routine'],
  },
  {
    level: 2,
    description: 'Mild Nervousness',
    symptoms: ['Slight butterflies', 'Heightened awareness', 'Minor tension'],
    recommendations: ['This is normal and helpful', 'Use energy for expression', 'Brief breathing exercise'],
  },
  {
    level: 3,
    description: 'Moderate Anxiety',
    symptoms: ['Faster heartbeat', 'Sweaty palms', 'Racing thoughts', 'Muscle tension'],
    recommendations: ['Box breathing', 'Grounding exercise', 'Positive self-talk', 'Reduce caffeine'],
  },
  {
    level: 4,
    description: 'High Anxiety',
    symptoms: ['Difficulty concentrating', 'Trembling', 'Rapid breathing', 'Negative thoughts'],
    recommendations: ['Extended breathing exercise', 'Cognitive reframing', 'Visualization', 'Physical movement'],
  },
  {
    level: 5,
    description: 'Severe Anxiety',
    symptoms: ['Panic feelings', 'Unable to focus', 'Overwhelming fear', 'Physical distress'],
    recommendations: ['Remove yourself briefly', '4-7-8 breathing repeatedly', 'Grounding (5-4-3-2-1)', 'Consider speaking with a professional'],
  },
];

// Mindset Coach Class
export class MindsetCoach {
  private sessions: MindsetSession[] = [];
  
  constructor() {}
  
  // Get appropriate breathing exercise based on situation
  recommendBreathingExercise(
    situation: 'pre_performance' | 'backstage' | 'practice' | 'anxiety' | 'energy'
  ): BreathingExercise {
    const recommendations: Record<string, string> = {
      pre_performance: 'box_breathing',
      backstage: 'quick_calm',
      practice: 'diaphragmatic',
      anxiety: '4_7_8_breathing',
      energy: 'energizing',
    };
    
    const exerciseId = recommendations[situation];
    return BREATHING_EXERCISES.find(e => e.id === exerciseId) || BREATHING_EXERCISES[0];
  }
  
  // Get visualization based on need
  recommendVisualization(
    category: 'pre_performance' | 'practice' | 'recovery' | 'confidence'
  ): VisualizationScript {
    return VISUALIZATION_SCRIPTS.find(v => v.category === category) || VISUALIZATION_SCRIPTS[0];
  }
  
  // Get cognitive reframe for a trigger
  getReframe(trigger: string): CognitiveReframe | null {
    return COGNITIVE_REFRAMES.find(r => 
      r.trigger.toLowerCase().includes(trigger.toLowerCase())
    ) || null;
  }
  
  // Assess anxiety level and get recommendations
  assessAnxiety(level: 1 | 2 | 3 | 4 | 5): AnxietyLevel {
    return ANXIETY_LEVELS[level - 1];
  }
  
  // Get pre-performance routine
  getRoutine(availableMinutes: number): PrePerformanceRoutine | null {
    const suitable = PRE_PERFORMANCE_ROUTINES.filter(
      r => r.timeBeforePerformance <= availableMinutes
    ).sort((a, b) => b.timeBeforePerformance - a.timeBeforePerformance);
    
    return suitable[0] || null;
  }
  
  // Log a mindset session
  logSession(session: Omit<MindsetSession, 'id' | 'date'>): MindsetSession {
    const newSession: MindsetSession = {
      ...session,
      id: `session_${Date.now()}`,
      date: new Date().toISOString(),
    };
    
    this.sessions.push(newSession);
    return newSession;
  }
  
  // Get session history
  getSessionHistory(): MindsetSession[] {
    return [...this.sessions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }
  
  // Get average anxiety improvement
  getAnxietyImprovementStats(): {
    averageImprovement: number;
    totalSessions: number;
    bestImprovement: number;
  } {
    const sessionsWithAnxiety = this.sessions.filter(
      s => s.anxietyBefore !== undefined && s.anxietyAfter !== undefined
    );
    
    if (sessionsWithAnxiety.length === 0) {
      return { averageImprovement: 0, totalSessions: 0, bestImprovement: 0 };
    }
    
    const improvements = sessionsWithAnxiety.map(
      s => (s.anxietyBefore || 0) - (s.anxietyAfter || 0)
    );
    
    const averageImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
    const bestImprovement = Math.max(...improvements);
    
    return {
      averageImprovement,
      totalSessions: sessionsWithAnxiety.length,
      bestImprovement,
    };
  }
  
  // Generate personalized affirmations
  generateAffirmations(focus: 'confidence' | 'calm' | 'preparation' | 'recovery'): string[] {
    const affirmations: Record<string, string[]> = {
      confidence: [
        'I am a capable and expressive musician.',
        'My unique voice deserves to be heard.',
        'I have prepared well and I am ready.',
        'I perform with confidence and joy.',
      ],
      calm: [
        'I am calm and centered.',
        'My breath keeps me grounded.',
        'I release tension with each exhale.',
        'I am at peace with this moment.',
      ],
      preparation: [
        'My practice has prepared me for this.',
        'I trust my muscle memory.',
        'Every hour of practice supports me now.',
        'I am ready to share my music.',
      ],
      recovery: [
        'One performance does not define me.',
        'I learn and grow from every experience.',
        'I am kind to myself today.',
        'Tomorrow brings new opportunities.',
      ],
    };
    
    return affirmations[focus] || affirmations.confidence;
  }
}

// Singleton instance
let mindsetCoachInstance: MindsetCoach | null = null;

export const getMindsetCoach = (): MindsetCoach => {
  if (!mindsetCoachInstance) {
    mindsetCoachInstance = new MindsetCoach();
  }
  return mindsetCoachInstance;
};

'use client';

/**
 * Repertoire Recommendation Agent
 * 
 * AI-driven piece selection based on user skill level, goals, and learning history.
 * Provides personalized repertoire recommendations and learning paths.
 */

// Types for repertoire system
export interface PieceMetadata {
  id: string;
  title: string;
  composer: string;
  era: 'baroque' | 'classical' | 'romantic' | 'modern' | 'contemporary';
  difficulty: number; // 1-10
  abrsm?: number; // ABRSM grade 1-8
  rcm?: number; // RCM grade 1-10
  duration?: number; // minutes
  key?: string;
  techniques: string[];
  style?: string;
  movements: number;
  hasAccompaniment: boolean;
  description?: string;
  publicDomain: boolean;
  imslpUrl?: string;
  youtubeUrl?: string;
}

export interface UserSkillProfile {
  level: number; // 1-10
  masteredTechniques: string[];
  learningTechniques: string[];
  preferredEras: string[];
  preferredStyles: string[];
  recentPieces: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface RepertoireRecommendation {
  piece: PieceMetadata;
  matchScore: number; // 0-100
  reasons: string[];
  difficulty: 'too_easy' | 'appropriate' | 'challenging' | 'stretch';
  focusTechniques: string[];
  estimatedLearningWeeks: number;
}

export interface LearningPath {
  name: string;
  description: string;
  pieces: PieceMetadata[];
  totalDuration: number; // estimated weeks
  focusAreas: string[];
  progressMilestones: string[];
}

// Technique categories for violin
export const TECHNIQUE_CATEGORIES = {
  bowStrokes: [
    'detache',
    'legato',
    'staccato',
    'spiccato',
    'sautille',
    'martele',
    'col_legno',
    'tremolo',
    'ricochet',
    'flying_staccato',
  ],
  leftHand: [
    'vibrato',
    'shifting',
    'double_stops',
    'thirds',
    'sixths',
    'octaves',
    'tenths',
    'harmonics',
    'pizzicato_left',
    'trills',
  ],
  positions: [
    'first_position',
    'third_position',
    'fifth_position',
    'seventh_position',
    'high_positions',
  ],
  musical: [
    'dynamics',
    'phrasing',
    'rubato',
    'tone_color',
    'articulation',
  ],
};

// Built-in piece database with common violin repertoire
export const PIECE_DATABASE: PieceMetadata[] = [
  // Beginner pieces (Grade 1-2)
  {
    id: 'suzuki_twinkle',
    title: 'Twinkle Twinkle Little Star Variations',
    composer: 'Traditional/Suzuki',
    era: 'classical',
    difficulty: 1,
    abrsm: 1,
    rcm: 1,
    duration: 3,
    key: 'A major',
    techniques: ['first_position', 'detache', 'dynamics'],
    style: 'study',
    movements: 1,
    hasAccompaniment: true,
    publicDomain: true,
    description: 'Classic beginner piece with variations',
  },
  {
    id: 'kuchler_concertino_op11',
    title: 'Concertino in G major, Op. 11',
    composer: 'Ferdinand Küchler',
    era: 'romantic',
    difficulty: 2,
    abrsm: 2,
    rcm: 2,
    duration: 6,
    key: 'G major',
    techniques: ['first_position', 'detache', 'legato', 'dynamics'],
    style: 'concertino',
    movements: 3,
    hasAccompaniment: true,
    publicDomain: true,
    imslpUrl: 'https://imslp.org/wiki/Concertino_in_G_major,_Op.11_(K%C3%BCchler,_Ferdinand)',
    description: 'Popular student concertino, entirely in first position',
  },
  {
    id: 'rieding_concerto_b_minor',
    title: 'Concerto in B minor, Op. 35',
    composer: 'Oskar Rieding',
    era: 'romantic',
    difficulty: 3,
    abrsm: 3,
    rcm: 3,
    duration: 8,
    key: 'B minor',
    techniques: ['first_position', 'third_position', 'shifting', 'legato', 'staccato'],
    style: 'concerto',
    movements: 3,
    hasAccompaniment: true,
    publicDomain: true,
    imslpUrl: 'https://imslp.org/wiki/Violin_Concerto,_Op.35_(Rieding,_Oskar)',
    description: 'Introduces third position and expressive playing',
  },
  // Intermediate pieces (Grade 3-5)
  {
    id: 'vivaldi_a_minor',
    title: 'Concerto in A minor, RV 356',
    composer: 'Antonio Vivaldi',
    era: 'baroque',
    difficulty: 4,
    abrsm: 4,
    rcm: 5,
    duration: 10,
    key: 'A minor',
    techniques: ['first_position', 'third_position', 'shifting', 'detache', 'legato', 'dynamics'],
    style: 'concerto',
    movements: 3,
    hasAccompaniment: true,
    publicDomain: true,
    imslpUrl: 'https://imslp.org/wiki/Violin_Concerto_in_A_minor,_RV_356_(Vivaldi,_Antonio)',
    description: 'Baroque masterpiece, excellent for developing musicality',
  },
  {
    id: 'bach_a_minor',
    title: 'Violin Concerto No. 1 in A minor, BWV 1041',
    composer: 'Johann Sebastian Bach',
    era: 'baroque',
    difficulty: 5,
    abrsm: 5,
    rcm: 6,
    duration: 15,
    key: 'A minor',
    techniques: ['first_position', 'third_position', 'fifth_position', 'shifting', 'detache', 'legato', 'staccato', 'phrasing'],
    style: 'concerto',
    movements: 3,
    hasAccompaniment: true,
    publicDomain: true,
    imslpUrl: 'https://imslp.org/wiki/Violin_Concerto_in_A_minor,_BWV_1041_(Bach,_Johann_Sebastian)',
    description: 'Essential Bach concerto, develops polyphonic thinking',
  },
  {
    id: 'accolay_concerto',
    title: 'Violin Concerto No. 1 in A minor',
    composer: 'Jean-Baptiste Accolay',
    era: 'romantic',
    difficulty: 5,
    abrsm: 5,
    rcm: 6,
    duration: 9,
    key: 'A minor',
    techniques: ['first_position', 'third_position', 'fifth_position', 'shifting', 'vibrato', 'legato', 'dynamics'],
    style: 'concerto',
    movements: 1,
    hasAccompaniment: true,
    publicDomain: true,
    imslpUrl: 'https://imslp.org/wiki/Violin_Concerto_No.1_(Accolay,_Jean-Baptiste)',
    description: 'Romantic showpiece with beautiful melodies',
  },
  // Upper Intermediate (Grade 5-6)
  {
    id: 'mozart_3',
    title: 'Violin Concerto No. 3 in G major, K. 216',
    composer: 'Wolfgang Amadeus Mozart',
    era: 'classical',
    difficulty: 6,
    abrsm: 6,
    rcm: 7,
    duration: 25,
    key: 'G major',
    techniques: ['first_position', 'third_position', 'fifth_position', 'seventh_position', 'shifting', 'vibrato', 'trills', 'dynamics', 'phrasing'],
    style: 'concerto',
    movements: 3,
    hasAccompaniment: true,
    publicDomain: true,
    imslpUrl: 'https://imslp.org/wiki/Violin_Concerto_No.3_in_G_major,_K.216_(Mozart,_Wolfgang_Amadeus)',
    description: 'Elegant Mozart concerto, demands Classical style mastery',
  },
  {
    id: 'mozart_5',
    title: 'Violin Concerto No. 5 in A major, K. 219 "Turkish"',
    composer: 'Wolfgang Amadeus Mozart',
    era: 'classical',
    difficulty: 7,
    abrsm: 7,
    rcm: 8,
    duration: 30,
    key: 'A major',
    techniques: ['all_positions', 'shifting', 'vibrato', 'spiccato', 'trills', 'double_stops', 'dynamics', 'phrasing', 'rubato'],
    style: 'concerto',
    movements: 3,
    hasAccompaniment: true,
    publicDomain: true,
    imslpUrl: 'https://imslp.org/wiki/Violin_Concerto_No.5_in_A_major,_K.219_(Mozart,_Wolfgang_Amadeus)',
    description: 'Most popular Mozart concerto with Turkish-influenced finale',
  },
  // Advanced (Grade 7-8)
  {
    id: 'bruch_g_minor',
    title: 'Violin Concerto No. 1 in G minor, Op. 26',
    composer: 'Max Bruch',
    era: 'romantic',
    difficulty: 8,
    abrsm: 8,
    rcm: 9,
    duration: 25,
    key: 'G minor',
    techniques: ['all_positions', 'high_positions', 'shifting', 'vibrato', 'double_stops', 'octaves', 'spiccato', 'legato', 'dynamics', 'tone_color'],
    style: 'concerto',
    movements: 3,
    hasAccompaniment: true,
    publicDomain: true,
    imslpUrl: 'https://imslp.org/wiki/Violin_Concerto_No.1,_Op.26_(Bruch,_Max)',
    youtubeUrl: 'https://youtube.com/watch?v=KDJ6Wbpau0g',
    description: 'Romantic masterpiece with soaring melodies',
  },
  {
    id: 'mendelssohn_e_minor',
    title: 'Violin Concerto in E minor, Op. 64',
    composer: 'Felix Mendelssohn',
    era: 'romantic',
    difficulty: 8,
    abrsm: 8,
    rcm: 9,
    duration: 27,
    key: 'E minor',
    techniques: ['all_positions', 'high_positions', 'shifting', 'vibrato', 'double_stops', 'octaves', 'spiccato', 'sautille', 'legato', 'dynamics', 'phrasing'],
    style: 'concerto',
    movements: 3,
    hasAccompaniment: true,
    publicDomain: true,
    imslpUrl: 'https://imslp.org/wiki/Violin_Concerto,_Op.64_(Mendelssohn,_Felix)',
    description: 'Beloved Romantic concerto with virtuosic passages',
  },
  // Studies and Etudes
  {
    id: 'wohlfahrt_op45',
    title: '60 Studies, Op. 45',
    composer: 'Franz Wohlfahrt',
    era: 'romantic',
    difficulty: 2,
    abrsm: 2,
    rcm: 2,
    techniques: ['first_position', 'detache', 'legato', 'staccato'],
    style: 'etude',
    movements: 60,
    hasAccompaniment: false,
    publicDomain: true,
    imslpUrl: 'https://imslp.org/wiki/60_Studies,_Op.45_(Wohlfahrt,_Franz)',
    description: 'Essential studies for developing bow control',
  },
  {
    id: 'kayser_op20',
    title: '36 Elementary and Progressive Studies, Op. 20',
    composer: 'Heinrich Ernst Kayser',
    era: 'romantic',
    difficulty: 3,
    abrsm: 3,
    rcm: 4,
    techniques: ['first_position', 'third_position', 'shifting', 'detache', 'legato', 'staccato', 'dynamics'],
    style: 'etude',
    movements: 36,
    hasAccompaniment: false,
    publicDomain: true,
    imslpUrl: 'https://imslp.org/wiki/36_Studies,_Op.20_(Kayser,_Heinrich_Ernst)',
    description: 'Melodic studies that develop technique musically',
  },
  {
    id: 'kreutzer_42_studies',
    title: '42 Studies or Caprices',
    composer: 'Rodolphe Kreutzer',
    era: 'classical',
    difficulty: 6,
    abrsm: 6,
    rcm: 7,
    techniques: ['all_positions', 'shifting', 'double_stops', 'trills', 'spiccato', 'martele', 'vibrato'],
    style: 'etude',
    movements: 42,
    hasAccompaniment: false,
    publicDomain: true,
    imslpUrl: 'https://imslp.org/wiki/42_Studies_or_Caprices_(Kreutzer,_Rodolphe)',
    description: 'Standard advanced studies for all violinists',
  },
  // Solo Bach
  {
    id: 'bach_partita_3',
    title: 'Partita No. 3 in E major, BWV 1006',
    composer: 'Johann Sebastian Bach',
    era: 'baroque',
    difficulty: 8,
    abrsm: 8,
    rcm: 10,
    duration: 18,
    key: 'E major',
    techniques: ['all_positions', 'shifting', 'double_stops', 'phrasing', 'tone_color', 'dynamics'],
    style: 'partita',
    movements: 7,
    hasAccompaniment: false,
    publicDomain: true,
    imslpUrl: 'https://imslp.org/wiki/Violin_Partita_No.3_in_E_major,_BWV_1006_(Bach,_Johann_Sebastian)',
    description: 'Joyful solo Bach with famous Preludio',
  },
];

// Calculate match score between user profile and piece
const calculateMatchScore = (
  piece: PieceMetadata,
  profile: UserSkillProfile
): number => {
  let score = 0;
  const maxScore = 100;

  // Difficulty match (40 points max)
  const difficultyDiff = Math.abs(piece.difficulty - profile.level);
  if (difficultyDiff === 0) score += 40;
  else if (difficultyDiff === 1) score += 35;
  else if (difficultyDiff === 2) score += 25;
  else score += Math.max(0, 20 - difficultyDiff * 5);

  // Technique match (30 points max)
  const techniquesNeeded = piece.techniques;
  const masteredCount = techniquesNeeded.filter(t => 
    profile.masteredTechniques.includes(t)
  ).length;
  const learningCount = techniquesNeeded.filter(t => 
    profile.learningTechniques.includes(t)
  ).length;
  const techniqueScore = (masteredCount * 2 + learningCount) / techniquesNeeded.length * 30;
  score += Math.min(30, techniqueScore);

  // Era preference (15 points max)
  if (profile.preferredEras.includes(piece.era)) {
    score += 15;
  } else if (profile.preferredEras.length === 0) {
    score += 10; // No preference, give partial credit
  }

  // Style preference (15 points max)
  if (piece.style && profile.preferredStyles.includes(piece.style)) {
    score += 15;
  } else if (profile.preferredStyles.length === 0) {
    score += 10;
  }

  // Bonus for pieces not recently played
  if (!profile.recentPieces.includes(piece.id)) {
    score += 5;
  }

  return Math.min(maxScore, Math.round(score));
};

// Determine difficulty classification
const classifyDifficulty = (
  pieceDifficulty: number,
  userLevel: number
): 'too_easy' | 'appropriate' | 'challenging' | 'stretch' => {
  const diff = pieceDifficulty - userLevel;
  if (diff <= -2) return 'too_easy';
  if (diff <= 0) return 'appropriate';
  if (diff <= 1) return 'challenging';
  return 'stretch';
};

// Estimate learning time based on difficulty difference
const estimateLearningWeeks = (
  pieceDifficulty: number,
  userLevel: number,
  pieceDuration?: number
): number => {
  const baseDiff = Math.max(0, pieceDifficulty - userLevel);
  const baseWeeks = 2 + baseDiff * 2;
  const durationFactor = pieceDuration ? Math.sqrt(pieceDuration / 10) : 1;
  return Math.round(baseWeeks * durationFactor);
};

// Generate recommendations for user
export const generateRecommendations = (
  profile: UserSkillProfile,
  options: {
    count?: number;
    includeStretches?: boolean;
    focusTechniques?: string[];
    excludePieces?: string[];
  } = {}
): RepertoireRecommendation[] => {
  const {
    count = 5,
    includeStretches = true,
    focusTechniques = [],
    excludePieces = [],
  } = options;

  // Filter pieces
  let candidates = PIECE_DATABASE.filter(piece => {
    // Exclude already filtered pieces
    if (excludePieces.includes(piece.id)) return false;
    
    // Filter by stretch preference
    const diffClass = classifyDifficulty(piece.difficulty, profile.level);
    if (!includeStretches && diffClass === 'stretch') return false;
    
    // Exclude pieces that are way too easy
    if (piece.difficulty < profile.level - 2) return false;
    
    return true;
  });

  // If focus techniques specified, boost pieces with those techniques
  if (focusTechniques.length > 0) {
    candidates = candidates.map(piece => ({
      ...piece,
      _focusBonus: piece.techniques.filter(t => focusTechniques.includes(t)).length * 10,
    }));
  }

  // Score and sort candidates
  const recommendations: RepertoireRecommendation[] = candidates
    .map(piece => {
      const matchScore = calculateMatchScore(piece, profile) + ((piece as any)._focusBonus || 0);
      const difficultyClass = classifyDifficulty(piece.difficulty, profile.level);
      
      // Generate reasons
      const reasons: string[] = [];
      
      if (difficultyClass === 'appropriate') {
        reasons.push('Matches your current skill level');
      } else if (difficultyClass === 'challenging') {
        reasons.push('Will help you grow while being achievable');
      } else if (difficultyClass === 'stretch') {
        reasons.push('A stretch goal to aspire to');
      }
      
      if (profile.preferredEras.includes(piece.era)) {
        reasons.push(`Fits your preference for ${piece.era} music`);
      }
      
      const newTechniques = piece.techniques.filter(
        t => !profile.masteredTechniques.includes(t) && !profile.learningTechniques.includes(t)
      );
      if (newTechniques.length > 0) {
        reasons.push(`Introduces: ${newTechniques.slice(0, 3).join(', ')}`);
      }
      
      const focusMatches = piece.techniques.filter(t => focusTechniques.includes(t));
      if (focusMatches.length > 0) {
        reasons.push(`Develops your focus areas: ${focusMatches.join(', ')}`);
      }

      return {
        piece,
        matchScore,
        reasons,
        difficulty: difficultyClass,
        focusTechniques: piece.techniques.filter(t => 
          !profile.masteredTechniques.includes(t)
        ),
        estimatedLearningWeeks: estimateLearningWeeks(
          piece.difficulty,
          profile.level,
          piece.duration
        ),
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, count);

  return recommendations;
};

// Generate a learning path for a specific goal
export const generateLearningPath = (
  profile: UserSkillProfile,
  goal: {
    targetPiece?: string;
    targetTechnique?: string;
    targetLevel?: number;
    timeframeWeeks?: number;
  }
): LearningPath => {
  const pieces: PieceMetadata[] = [];
  const focusAreas: string[] = [];
  const milestones: string[] = [];
  
  // If target piece specified, work backwards
  if (goal.targetPiece) {
    const targetPiece = PIECE_DATABASE.find(p => p.id === goal.targetPiece);
    if (targetPiece) {
      // Find stepping stone pieces
      const levelGap = targetPiece.difficulty - profile.level;
      
      if (levelGap > 0) {
        // Add intermediate pieces
        for (let level = profile.level; level < targetPiece.difficulty; level++) {
          const steppingStone = PIECE_DATABASE.find(p => 
            p.difficulty === level &&
            p.techniques.some(t => targetPiece.techniques.includes(t))
          );
          if (steppingStone) {
            pieces.push(steppingStone);
            milestones.push(`Complete ${steppingStone.title} to build foundation`);
          }
        }
      }
      
      pieces.push(targetPiece);
      milestones.push(`Master ${targetPiece.title}`);
      focusAreas.push(...targetPiece.techniques.slice(0, 5));
    }
  }
  
  // If target technique specified
  if (goal.targetTechnique) {
    focusAreas.push(goal.targetTechnique);
    
    // Find pieces that develop this technique progressively
    const techniqueProgress = PIECE_DATABASE
      .filter(p => p.techniques.includes(goal.targetTechnique!))
      .sort((a, b) => a.difficulty - b.difficulty)
      .filter(p => p.difficulty >= profile.level - 1 && p.difficulty <= (goal.targetLevel || profile.level + 3));
    
    pieces.push(...techniqueProgress.slice(0, 5));
    milestones.push(`Develop ${goal.targetTechnique} through progressive pieces`);
  }
  
  // If target level specified
  if (goal.targetLevel && goal.targetLevel > profile.level) {
    const levelPath = PIECE_DATABASE
      .filter(p => p.difficulty >= profile.level && p.difficulty <= goal.targetLevel!)
      .sort((a, b) => a.difficulty - b.difficulty)
      .slice(0, goal.targetLevel - profile.level + 2);
    
    // Merge with existing pieces, avoiding duplicates
    levelPath.forEach(p => {
      if (!pieces.find(existing => existing.id === p.id)) {
        pieces.push(p);
      }
    });
    
    milestones.push(`Reach level ${goal.targetLevel} proficiency`);
  }
  
  // Calculate total duration
  const totalDuration = pieces.reduce((sum, piece) => 
    sum + estimateLearningWeeks(piece.difficulty, profile.level, piece.duration), 0
  );
  
  return {
    name: goal.targetPiece 
      ? `Path to ${PIECE_DATABASE.find(p => p.id === goal.targetPiece)?.title}`
      : goal.targetTechnique
        ? `${goal.targetTechnique} Development Path`
        : `Level ${goal.targetLevel} Achievement Path`,
    description: `A curated sequence of ${pieces.length} pieces to help you reach your goal`,
    pieces,
    totalDuration,
    focusAreas: [...new Set(focusAreas)],
    progressMilestones: milestones,
  };
};

// Get pieces by criteria
export const searchPieces = (criteria: {
  difficulty?: { min?: number; max?: number };
  era?: string[];
  style?: string[];
  techniques?: string[];
  composer?: string;
  hasAccompaniment?: boolean;
}): PieceMetadata[] => {
  return PIECE_DATABASE.filter(piece => {
    if (criteria.difficulty) {
      if (criteria.difficulty.min && piece.difficulty < criteria.difficulty.min) return false;
      if (criteria.difficulty.max && piece.difficulty > criteria.difficulty.max) return false;
    }
    
    if (criteria.era && criteria.era.length > 0) {
      if (!criteria.era.includes(piece.era)) return false;
    }
    
    if (criteria.style && criteria.style.length > 0) {
      if (!piece.style || !criteria.style.includes(piece.style)) return false;
    }
    
    if (criteria.techniques && criteria.techniques.length > 0) {
      if (!criteria.techniques.some(t => piece.techniques.includes(t))) return false;
    }
    
    if (criteria.composer) {
      if (!piece.composer.toLowerCase().includes(criteria.composer.toLowerCase())) return false;
    }
    
    if (criteria.hasAccompaniment !== undefined) {
      if (piece.hasAccompaniment !== criteria.hasAccompaniment) return false;
    }
    
    return true;
  });
};

// Get all unique techniques from database
export const getAllTechniques = (): string[] => {
  const techniques = new Set<string>();
  PIECE_DATABASE.forEach(piece => {
    piece.techniques.forEach(t => techniques.add(t));
  });
  return [...techniques].sort();
};

// Get all unique composers
export const getAllComposers = (): string[] => {
  return [...new Set(PIECE_DATABASE.map(p => p.composer))].sort();
};

// Get all unique eras
export const getAllEras = (): string[] => {
  return [...new Set(PIECE_DATABASE.map(p => p.era))];
};

// Get all unique styles
export const getAllStyles = (): string[] => {
  return [...new Set(PIECE_DATABASE.map(p => p.style).filter(Boolean))] as string[];
};

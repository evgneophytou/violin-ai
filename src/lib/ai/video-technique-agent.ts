'use client';

import type { PoseResult } from '@/lib/video/pose-types';
import {
  analyzeShoulders,
  analyzeHeadPosition,
  analyzeSpine,
  analyzeRightElbow,
  analyzeRightWrist,
  analyzeBowStraightness,
  determineBowPosition,
  analyzeLeftHand,
  analyzeViolinPosition,
  type BowPosition,
} from '@/lib/video/landmark-analyzer';
import type {
  TechniqueAnalysis,
  PostureAnalysis,
  BowArmAnalysis,
  LeftHandAnalysis,
  ViolinPositionAnalysis,
} from '@/stores/video-store';

// Scoring weights
const WEIGHTS = {
  posture: 0.25,
  bowArm: 0.35,
  leftHand: 0.20,
  violinPosition: 0.20,
};

// Suggestion templates
const SUGGESTIONS = {
  posture: {
    shoulderTense: 'Try to relax your shoulders. Tension can affect your bowing and cause fatigue.',
    shouldersUneven: 'Keep your shoulders level. Uneven shoulders can affect your posture and playing.',
    headTilted: 'Keep your head in a neutral position. Excessive tilting can cause neck strain.',
    headForward: 'Avoid leaning your head too far forward. This can cause neck and back strain.',
    spineNotUpright: 'Maintain an upright spine. Good posture is the foundation of good technique.',
  },
  bowArm: {
    elbowTooHigh: 'Lower your right elbow slightly. It should be relaxed, not lifted.',
    elbowTooLow: 'Raise your right elbow a bit. Keeping it too low restricts bow movement.',
    wristStiff: 'Allow more flexibility in your right wrist. A flexible wrist enables smooth bow changes.',
    bowNotStraight: 'Focus on keeping your bow straight and parallel to the bridge.',
    bowDistributionTip: 'You\'re playing mostly at the tip. Try using more of the bow.',
    bowDistributionFrog: 'You\'re playing mostly at the frog. Practice using the full bow length.',
  },
  leftHand: {
    thumbTooHigh: 'Lower your left thumb slightly. It should be relaxed and opposite your first or second finger.',
    thumbTooLow: 'Raise your left thumb a bit. It shouldn\'t collapse below the neck.',
    wristBent: 'Keep your left wrist relatively straight. Excessive bending limits finger movement.',
  },
  violinPosition: {
    scrollTooHigh: 'Lower the violin scroll slightly. The violin should be roughly horizontal.',
    scrollTooLow: 'Raise the violin scroll. A drooping scroll makes playing in higher positions difficult.',
    noChinContact: 'Make sure your chin is resting on the chin rest for stability.',
    angleWrong: 'Adjust your violin angle. It should be about 45 degrees from your body.',
  },
};

// Analyze posture from pose data
export const analyzePosture = (pose: PoseResult): PostureAnalysis => {
  const shoulders = analyzeShoulders(pose);
  const head = analyzeHeadPosition(pose);
  const spine = analyzeSpine(pose);

  // Default values
  let shoulderTension: PostureAnalysis['shoulderTension'] = 'relaxed';
  let shoulderLevel = 0;
  let spineAlignment = 75;
  let headPosition: PostureAnalysis['headPosition'] = 'correct';
  let score = 70;

  if (shoulders) {
    shoulderTension = shoulders.tension;
    shoulderLevel = shoulders.levelDifference;
  }

  if (head) {
    headPosition = head.position;
  }

  if (spine) {
    spineAlignment = spine.alignment;
  }

  // Calculate score
  let postureScore = 100;

  // Shoulder tension penalty
  if (shoulderTension === 'tense') postureScore -= 25;
  else if (shoulderTension === 'moderate') postureScore -= 10;

  // Shoulder level penalty
  if (Math.abs(shoulderLevel) > 0.2) postureScore -= 15;
  else if (Math.abs(shoulderLevel) > 0.1) postureScore -= 5;

  // Head position penalty
  if (headPosition !== 'correct') postureScore -= 15;

  // Spine alignment
  if (spineAlignment < 60) postureScore -= 20;
  else if (spineAlignment < 80) postureScore -= 10;

  score = Math.max(0, Math.min(100, postureScore));

  return {
    shoulderTension,
    shoulderLevel,
    spineAlignment,
    headPosition,
    score,
  };
};

// Track bow stroke direction from wrist movement
let previousWristY: number | null = null;
let strokeDirectionBuffer: ('up' | 'down')[] = [];

const detectStrokeDirection = (
  wristY: number
): 'up' | 'down' | 'stationary' => {
  if (previousWristY === null) {
    previousWristY = wristY;
    return 'stationary';
  }

  const diff = wristY - previousWristY;
  previousWristY = wristY;

  if (Math.abs(diff) < 2) return 'stationary';
  
  const direction = diff > 0 ? 'down' : 'up';
  strokeDirectionBuffer.push(direction);
  
  // Keep only recent samples
  if (strokeDirectionBuffer.length > 5) {
    strokeDirectionBuffer = strokeDirectionBuffer.slice(-5);
  }

  // Return majority direction
  const upCount = strokeDirectionBuffer.filter(d => d === 'up').length;
  const downCount = strokeDirectionBuffer.filter(d => d === 'down').length;

  if (upCount > downCount) return 'up';
  if (downCount > upCount) return 'down';
  return 'stationary';
};

// Analyze bow arm from pose data
export const analyzeBowArm = (
  pose: PoseResult,
  wristHistory: Array<{ x: number; y: number; timestamp: number }>
): BowArmAnalysis => {
  const elbow = analyzeRightElbow(pose);
  const wrist = analyzeRightWrist(pose);
  const straightness = analyzeBowStraightness(wristHistory);
  const bowPosition = determineBowPosition(pose);

  // Get current wrist Y for stroke direction
  const rightWrist = pose.keypoints[16]; // RIGHT_WRIST
  const strokeDirection = rightWrist?.score && rightWrist.score > 0.5
    ? detectStrokeDirection(rightWrist.y)
    : 'stationary';

  // Default values
  let elbowHeight: BowArmAnalysis['elbowHeight'] = 'correct';
  let wristAngle = 160;
  let bowStraightness = 70;
  let bowDistribution: BowPosition = 'middle';
  let score = 70;

  if (elbow) {
    elbowHeight = elbow.height;
    // Convert elbow angle to a more meaningful metric if needed
  }

  if (wrist) {
    wristAngle = wrist.angle;
  }

  if (straightness) {
    bowStraightness = straightness.straightness;
  }

  if (bowPosition) {
    bowDistribution = bowPosition;
  }

  // Calculate score
  let bowScore = 100;

  // Elbow height penalty
  if (elbowHeight !== 'correct') bowScore -= 15;

  // Wrist flexibility penalty
  if (wristAngle < 130 || wristAngle > 180) bowScore -= 15;

  // Bow straightness is a major factor
  bowScore -= Math.max(0, (80 - bowStraightness) * 0.5);

  score = Math.max(0, Math.min(100, bowScore));

  return {
    elbowHeight,
    wristAngle,
    bowStraightness,
    bowDistribution,
    strokeDirection,
    score,
  };
};

// Analyze left hand from pose data
export const analyzeLeftHandTechnique = (pose: PoseResult): LeftHandAnalysis => {
  const leftHandData = analyzeLeftHand(pose);

  // Default values
  let position = 1;
  let fingerCurvature: LeftHandAnalysis['fingerCurvature'] = 'good';
  let wristAngle = 160;
  let thumbPosition: LeftHandAnalysis['thumbPosition'] = 'correct';
  let score = 70;

  if (leftHandData) {
    position = leftHandData.position;
    wristAngle = leftHandData.wristAngle;
    thumbPosition = leftHandData.thumbPosition;
  }

  // Estimate finger curvature (simplified - would need hand landmarks for accuracy)
  // For now, assume good if wrist angle is in acceptable range
  if (wristAngle < 140) {
    fingerCurvature = 'collapsed';
  } else if (wristAngle > 180) {
    fingerCurvature = 'flat';
  }

  // Calculate score
  let leftHandScore = 100;

  // Thumb position penalty
  if (thumbPosition !== 'correct') leftHandScore -= 15;

  // Finger curvature penalty
  if (fingerCurvature !== 'good') leftHandScore -= 20;

  // Wrist angle penalty
  if (wristAngle < 140 || wristAngle > 185) leftHandScore -= 10;

  score = Math.max(0, Math.min(100, leftHandScore));

  return {
    position,
    fingerCurvature,
    wristAngle,
    thumbPosition,
    score,
  };
};

// Analyze violin position from pose data
export const analyzeViolinPositionTechnique = (pose: PoseResult): ViolinPositionAnalysis => {
  const violinData = analyzeViolinPosition(pose);

  // Default values
  let chinContact = true;
  let scrollHeight: ViolinPositionAnalysis['scrollHeight'] = 'correct';
  let violinAngle = 45;
  let stability = 70;
  let score = 70;

  if (violinData) {
    chinContact = violinData.chinContact;
    scrollHeight = violinData.scrollHeight;
    violinAngle = Math.abs(violinData.angle);
    
    // Ideal violin angle is around 30-45 degrees from horizontal
    const angleDiff = Math.abs(violinAngle - 40);
    stability = Math.max(0, 100 - angleDiff * 2);
  }

  // Calculate score
  let violinScore = 100;

  // Chin contact is important
  if (!chinContact) violinScore -= 20;

  // Scroll height penalty
  if (scrollHeight !== 'correct') violinScore -= 15;

  // Stability score
  violinScore -= Math.max(0, (70 - stability) * 0.3);

  score = Math.max(0, Math.min(100, violinScore));

  return {
    chinContact,
    scrollHeight,
    violinAngle,
    stability,
    score,
  };
};

// Generate suggestions based on analysis
export const generateSuggestions = (analysis: TechniqueAnalysis): string[] => {
  const suggestions: string[] = [];

  // Posture suggestions
  if (analysis.posture.shoulderTension === 'tense') {
    suggestions.push(SUGGESTIONS.posture.shoulderTense);
  }
  if (Math.abs(analysis.posture.shoulderLevel) > 0.15) {
    suggestions.push(SUGGESTIONS.posture.shouldersUneven);
  }
  if (analysis.posture.headPosition === 'tilted_left' || analysis.posture.headPosition === 'tilted_right') {
    suggestions.push(SUGGESTIONS.posture.headTilted);
  }
  if (analysis.posture.headPosition === 'forward') {
    suggestions.push(SUGGESTIONS.posture.headForward);
  }
  if (analysis.posture.spineAlignment < 70) {
    suggestions.push(SUGGESTIONS.posture.spineNotUpright);
  }

  // Bow arm suggestions
  if (analysis.bowArm.elbowHeight === 'too_high') {
    suggestions.push(SUGGESTIONS.bowArm.elbowTooHigh);
  }
  if (analysis.bowArm.elbowHeight === 'too_low') {
    suggestions.push(SUGGESTIONS.bowArm.elbowTooLow);
  }
  if (analysis.bowArm.wristAngle < 140) {
    suggestions.push(SUGGESTIONS.bowArm.wristStiff);
  }
  if (analysis.bowArm.bowStraightness < 60) {
    suggestions.push(SUGGESTIONS.bowArm.bowNotStraight);
  }

  // Left hand suggestions
  if (analysis.leftHand.thumbPosition === 'too_high') {
    suggestions.push(SUGGESTIONS.leftHand.thumbTooHigh);
  }
  if (analysis.leftHand.thumbPosition === 'too_low') {
    suggestions.push(SUGGESTIONS.leftHand.thumbTooLow);
  }
  if (analysis.leftHand.wristAngle < 140 || analysis.leftHand.wristAngle > 185) {
    suggestions.push(SUGGESTIONS.leftHand.wristBent);
  }

  // Violin position suggestions
  if (!analysis.violinPosition.chinContact) {
    suggestions.push(SUGGESTIONS.violinPosition.noChinContact);
  }
  if (analysis.violinPosition.scrollHeight === 'too_high') {
    suggestions.push(SUGGESTIONS.violinPosition.scrollTooHigh);
  }
  if (analysis.violinPosition.scrollHeight === 'too_low') {
    suggestions.push(SUGGESTIONS.violinPosition.scrollTooLow);
  }

  // Limit to top 3 most important suggestions
  return suggestions.slice(0, 3);
};

// Main analysis function
export const performTechniqueAnalysis = (
  pose: PoseResult,
  wristHistory: Array<{ x: number; y: number; timestamp: number }>
): TechniqueAnalysis => {
  const posture = analyzePosture(pose);
  const bowArm = analyzeBowArm(pose, wristHistory);
  const leftHand = analyzeLeftHandTechnique(pose);
  const violinPosition = analyzeViolinPositionTechnique(pose);

  // Calculate weighted overall score
  const overallScore = Math.round(
    posture.score * WEIGHTS.posture +
    bowArm.score * WEIGHTS.bowArm +
    leftHand.score * WEIGHTS.leftHand +
    violinPosition.score * WEIGHTS.violinPosition
  );

  const analysis: TechniqueAnalysis = {
    posture,
    bowArm,
    leftHand,
    violinPosition,
    overallScore,
    suggestions: [],
    timestamp: Date.now(),
  };

  // Generate suggestions based on analysis
  analysis.suggestions = generateSuggestions(analysis);

  return analysis;
};

// Generate a session report from analysis history
export interface TechniqueSessionReport {
  duration: number; // seconds
  averageScores: {
    posture: number;
    bowArm: number;
    leftHand: number;
    violinPosition: number;
    overall: number;
  };
  improvements: string[];
  focusAreas: string[];
  topSuggestions: string[];
}

export const generateSessionReport = (
  analysisHistory: TechniqueAnalysis[]
): TechniqueSessionReport | null => {
  if (analysisHistory.length < 5) return null;

  // Calculate duration
  const firstTimestamp = analysisHistory[0].timestamp;
  const lastTimestamp = analysisHistory[analysisHistory.length - 1].timestamp;
  const duration = Math.round((lastTimestamp - firstTimestamp) / 1000);

  // Calculate averages
  const sum = analysisHistory.reduce(
    (acc, analysis) => ({
      posture: acc.posture + analysis.posture.score,
      bowArm: acc.bowArm + analysis.bowArm.score,
      leftHand: acc.leftHand + analysis.leftHand.score,
      violinPosition: acc.violinPosition + analysis.violinPosition.score,
      overall: acc.overall + analysis.overallScore,
    }),
    { posture: 0, bowArm: 0, leftHand: 0, violinPosition: 0, overall: 0 }
  );

  const count = analysisHistory.length;
  const averageScores = {
    posture: Math.round(sum.posture / count),
    bowArm: Math.round(sum.bowArm / count),
    leftHand: Math.round(sum.leftHand / count),
    violinPosition: Math.round(sum.violinPosition / count),
    overall: Math.round(sum.overall / count),
  };

  // Analyze trends (compare first half to second half)
  const midpoint = Math.floor(count / 2);
  const firstHalf = analysisHistory.slice(0, midpoint);
  const secondHalf = analysisHistory.slice(midpoint);

  const firstHalfAvg = {
    posture: firstHalf.reduce((s, a) => s + a.posture.score, 0) / firstHalf.length,
    bowArm: firstHalf.reduce((s, a) => s + a.bowArm.score, 0) / firstHalf.length,
    leftHand: firstHalf.reduce((s, a) => s + a.leftHand.score, 0) / firstHalf.length,
    violinPosition: firstHalf.reduce((s, a) => s + a.violinPosition.score, 0) / firstHalf.length,
  };

  const secondHalfAvg = {
    posture: secondHalf.reduce((s, a) => s + a.posture.score, 0) / secondHalf.length,
    bowArm: secondHalf.reduce((s, a) => s + a.bowArm.score, 0) / secondHalf.length,
    leftHand: secondHalf.reduce((s, a) => s + a.leftHand.score, 0) / secondHalf.length,
    violinPosition: secondHalf.reduce((s, a) => s + a.violinPosition.score, 0) / secondHalf.length,
  };

  // Identify improvements and focus areas
  const improvements: string[] = [];
  const focusAreas: string[] = [];

  const threshold = 5; // 5 point improvement/decline threshold

  if (secondHalfAvg.posture - firstHalfAvg.posture > threshold) {
    improvements.push('Posture improved during the session');
  } else if (firstHalfAvg.posture - secondHalfAvg.posture > threshold) {
    focusAreas.push('Posture declined - watch for fatigue');
  }

  if (secondHalfAvg.bowArm - firstHalfAvg.bowArm > threshold) {
    improvements.push('Bow arm technique improved');
  } else if (firstHalfAvg.bowArm - secondHalfAvg.bowArm > threshold) {
    focusAreas.push('Bow technique needs attention');
  }

  if (secondHalfAvg.leftHand - firstHalfAvg.leftHand > threshold) {
    improvements.push('Left hand position improved');
  } else if (firstHalfAvg.leftHand - secondHalfAvg.leftHand > threshold) {
    focusAreas.push('Left hand technique needs work');
  }

  if (secondHalfAvg.violinPosition - firstHalfAvg.violinPosition > threshold) {
    improvements.push('Violin position became more stable');
  } else if (firstHalfAvg.violinPosition - secondHalfAvg.violinPosition > threshold) {
    focusAreas.push('Violin position stability declined');
  }

  // Identify lowest scoring areas
  const scores = [
    { name: 'Posture', score: averageScores.posture },
    { name: 'Bow arm', score: averageScores.bowArm },
    { name: 'Left hand', score: averageScores.leftHand },
    { name: 'Violin position', score: averageScores.violinPosition },
  ].sort((a, b) => a.score - b.score);

  if (scores[0].score < 70) {
    focusAreas.push(`${scores[0].name} needs the most improvement`);
  }

  // Collect most common suggestions
  const suggestionCounts = new Map<string, number>();
  for (const analysis of analysisHistory) {
    for (const suggestion of analysis.suggestions) {
      suggestionCounts.set(suggestion, (suggestionCounts.get(suggestion) || 0) + 1);
    }
  }

  const topSuggestions = Array.from(suggestionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([suggestion]) => suggestion);

  return {
    duration,
    averageScores,
    improvements,
    focusAreas,
    topSuggestions,
  };
};

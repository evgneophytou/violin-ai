'use client';

import { POSE_LANDMARKS, type Keypoint, type PoseResult } from './pose-types';

// Utility functions for angle and distance calculations

/**
 * Calculate angle between three points (in degrees)
 * Point B is the vertex of the angle
 */
export const calculateAngle = (
  pointA: Keypoint,
  pointB: Keypoint,
  pointC: Keypoint
): number => {
  const vectorBA = { x: pointA.x - pointB.x, y: pointA.y - pointB.y };
  const vectorBC = { x: pointC.x - pointB.x, y: pointC.y - pointB.y };

  const dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y;
  const magnitudeBA = Math.sqrt(vectorBA.x ** 2 + vectorBA.y ** 2);
  const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2);

  if (magnitudeBA === 0 || magnitudeBC === 0) return 0;

  const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  return Math.acos(clampedCos) * (180 / Math.PI);
};

/**
 * Calculate the angle of a line segment from horizontal (in degrees)
 */
export const calculateAngleFromHorizontal = (
  pointA: Keypoint,
  pointB: Keypoint
): number => {
  const dx = pointB.x - pointA.x;
  const dy = pointB.y - pointA.y;
  return Math.atan2(dy, dx) * (180 / Math.PI);
};

/**
 * Calculate distance between two points
 */
export const calculateDistance = (
  pointA: Keypoint,
  pointB: Keypoint
): number => {
  return Math.sqrt((pointB.x - pointA.x) ** 2 + (pointB.y - pointA.y) ** 2);
};

/**
 * Calculate midpoint between two points
 */
export const getMidpoint = (pointA: Keypoint, pointB: Keypoint): Keypoint => {
  return {
    x: (pointA.x + pointB.x) / 2,
    y: (pointA.y + pointB.y) / 2,
    score: Math.min(pointA.score ?? 1, pointB.score ?? 1),
  };
};

/**
 * Check if keypoint has sufficient confidence
 */
const isVisible = (kp: Keypoint | undefined, minScore = 0.5): kp is Keypoint => {
  return kp !== undefined && (kp.score ?? 0) >= minScore;
};

// Posture Analysis Functions

export interface ShoulderAnalysis {
  tension: 'relaxed' | 'moderate' | 'tense';
  levelDifference: number; // positive = right higher
  isLevel: boolean;
}

export const analyzeShoulders = (pose: PoseResult): ShoulderAnalysis | null => {
  const leftShoulder = pose.keypoints[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = pose.keypoints[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftEar = pose.keypoints[POSE_LANDMARKS.LEFT_EAR];
  const rightEar = pose.keypoints[POSE_LANDMARKS.RIGHT_EAR];

  if (!isVisible(leftShoulder) || !isVisible(rightShoulder)) {
    return null;
  }

  // Calculate shoulder level difference (normalized by shoulder width)
  const shoulderWidth = calculateDistance(leftShoulder, rightShoulder);
  const levelDifference = (rightShoulder.y - leftShoulder.y) / shoulderWidth;

  // Calculate shoulder-to-ear distance for tension detection
  let tension: 'relaxed' | 'moderate' | 'tense' = 'relaxed';
  
  if (isVisible(leftEar) && isVisible(rightEar)) {
    const leftShoulderToEar = calculateDistance(leftShoulder, leftEar);
    const rightShoulderToEar = calculateDistance(rightShoulder, rightEar);
    const avgShoulderToEar = (leftShoulderToEar + rightShoulderToEar) / 2;
    
    // Normalize by shoulder width
    const tensionRatio = avgShoulderToEar / shoulderWidth;
    
    // Thresholds based on typical proportions
    if (tensionRatio < 0.8) {
      tension = 'tense'; // Shoulders raised close to ears
    } else if (tensionRatio < 1.0) {
      tension = 'moderate';
    } else {
      tension = 'relaxed';
    }
  }

  return {
    tension,
    levelDifference,
    isLevel: Math.abs(levelDifference) < 0.1,
  };
};

export interface HeadPositionAnalysis {
  position: 'correct' | 'tilted_left' | 'tilted_right' | 'forward';
  tiltAngle: number;
  forwardAngle: number;
}

export const analyzeHeadPosition = (pose: PoseResult): HeadPositionAnalysis | null => {
  const nose = pose.keypoints[POSE_LANDMARKS.NOSE];
  const leftEar = pose.keypoints[POSE_LANDMARKS.LEFT_EAR];
  const rightEar = pose.keypoints[POSE_LANDMARKS.RIGHT_EAR];
  const leftShoulder = pose.keypoints[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = pose.keypoints[POSE_LANDMARKS.RIGHT_SHOULDER];

  if (!isVisible(nose) || !isVisible(leftShoulder) || !isVisible(rightShoulder)) {
    return null;
  }

  // Calculate head tilt from ear positions
  let tiltAngle = 0;
  if (isVisible(leftEar) && isVisible(rightEar)) {
    tiltAngle = calculateAngleFromHorizontal(leftEar, rightEar);
  }

  // Calculate forward lean
  const shoulderMidpoint = getMidpoint(leftShoulder, rightShoulder);
  const forwardAngle = calculateAngleFromHorizontal(shoulderMidpoint, nose);

  // Determine position
  let position: HeadPositionAnalysis['position'] = 'correct';
  
  if (Math.abs(tiltAngle) > 15) {
    position = tiltAngle > 0 ? 'tilted_right' : 'tilted_left';
  } else if (forwardAngle < -60) {
    position = 'forward';
  }

  return {
    position,
    tiltAngle,
    forwardAngle,
  };
};

export interface SpineAnalysis {
  alignment: number; // 0-100, 100 = perfect
  isUpright: boolean;
}

export const analyzeSpine = (pose: PoseResult): SpineAnalysis | null => {
  const nose = pose.keypoints[POSE_LANDMARKS.NOSE];
  const leftShoulder = pose.keypoints[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = pose.keypoints[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftHip = pose.keypoints[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = pose.keypoints[POSE_LANDMARKS.RIGHT_HIP];

  if (!isVisible(leftShoulder) || !isVisible(rightShoulder) ||
      !isVisible(leftHip) || !isVisible(rightHip)) {
    return null;
  }

  const shoulderMidpoint = getMidpoint(leftShoulder, rightShoulder);
  const hipMidpoint = getMidpoint(leftHip, rightHip);

  // Calculate angle from vertical
  const spineAngle = Math.abs(calculateAngleFromHorizontal(hipMidpoint, shoulderMidpoint) + 90);
  
  // Convert to alignment score (0 degrees = perfect = 100)
  const alignment = Math.max(0, 100 - spineAngle * 3);
  
  return {
    alignment,
    isUpright: alignment >= 80,
  };
};

// Bow Arm Analysis Functions

export interface ElbowAnalysis {
  angle: number;
  height: 'correct' | 'too_high' | 'too_low';
}

export const analyzeRightElbow = (pose: PoseResult): ElbowAnalysis | null => {
  const rightShoulder = pose.keypoints[POSE_LANDMARKS.RIGHT_SHOULDER];
  const rightElbow = pose.keypoints[POSE_LANDMARKS.RIGHT_ELBOW];
  const rightWrist = pose.keypoints[POSE_LANDMARKS.RIGHT_WRIST];

  if (!isVisible(rightShoulder) || !isVisible(rightElbow) || !isVisible(rightWrist)) {
    return null;
  }

  const angle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  
  // Elbow should be roughly at shoulder height when bowing
  const elbowHeightDiff = rightElbow.y - rightShoulder.y;
  const shoulderToWrist = calculateDistance(rightShoulder, rightWrist);
  const normalizedHeight = elbowHeightDiff / shoulderToWrist;

  let height: ElbowAnalysis['height'] = 'correct';
  if (normalizedHeight < -0.15) {
    height = 'too_high';
  } else if (normalizedHeight > 0.25) {
    height = 'too_low';
  }

  return {
    angle,
    height,
  };
};

export interface WristAnalysis {
  angle: number;
  isFlexible: boolean;
}

export const analyzeRightWrist = (pose: PoseResult): WristAnalysis | null => {
  const rightElbow = pose.keypoints[POSE_LANDMARKS.RIGHT_ELBOW];
  const rightWrist = pose.keypoints[POSE_LANDMARKS.RIGHT_WRIST];
  const rightIndex = pose.keypoints[POSE_LANDMARKS.RIGHT_INDEX];

  if (!isVisible(rightElbow) || !isVisible(rightWrist) || !isVisible(rightIndex)) {
    return null;
  }

  const angle = calculateAngle(rightElbow, rightWrist, rightIndex);
  
  // Wrist should have some flexibility (not completely straight or bent)
  const isFlexible = angle >= 140 && angle <= 180;

  return {
    angle,
    isFlexible,
  };
};

export interface BowStraightnessAnalysis {
  straightness: number; // 0-100
  deviation: number; // average deviation from straight line
}

export const analyzeBowStraightness = (
  wristHistory: Array<{ x: number; y: number; timestamp: number }>
): BowStraightnessAnalysis | null => {
  if (wristHistory.length < 10) return null;

  // Get recent positions (last 500ms)
  const now = Date.now();
  const recentPositions = wristHistory.filter(p => now - p.timestamp < 500);
  
  if (recentPositions.length < 5) return null;

  // Fit a line to the positions and calculate deviation
  const n = recentPositions.length;
  const sumX = recentPositions.reduce((s, p) => s + p.x, 0);
  const sumY = recentPositions.reduce((s, p) => s + p.y, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  // Calculate angle of best-fit line
  let sumXY = 0;
  let sumXX = 0;
  for (const p of recentPositions) {
    sumXY += (p.x - meanX) * (p.y - meanY);
    sumXX += (p.x - meanX) ** 2;
  }

  const slope = sumXX !== 0 ? sumXY / sumXX : 0;
  const intercept = meanY - slope * meanX;

  // Calculate average deviation from the line
  let totalDeviation = 0;
  for (const p of recentPositions) {
    const expectedY = slope * p.x + intercept;
    totalDeviation += Math.abs(p.y - expectedY);
  }
  const avgDeviation = totalDeviation / n;

  // Normalize deviation to a 0-100 straightness score
  // Lower deviation = higher straightness
  const maxExpectedDeviation = 50; // pixels
  const straightness = Math.max(0, 100 - (avgDeviation / maxExpectedDeviation) * 100);

  return {
    straightness,
    deviation: avgDeviation,
  };
};

export type BowPosition = 'tip' | 'upper' | 'middle' | 'lower' | 'frog';

export const determineBowPosition = (pose: PoseResult): BowPosition | null => {
  const rightWrist = pose.keypoints[POSE_LANDMARKS.RIGHT_WRIST];
  const rightShoulder = pose.keypoints[POSE_LANDMARKS.RIGHT_SHOULDER];
  const rightElbow = pose.keypoints[POSE_LANDMARKS.RIGHT_ELBOW];

  if (!isVisible(rightWrist) || !isVisible(rightShoulder) || !isVisible(rightElbow)) {
    return null;
  }

  // Calculate arm extension
  const shoulderToElbow = calculateDistance(rightShoulder, rightElbow);
  const elbowToWrist = calculateDistance(rightElbow, rightWrist);
  const totalArmLength = shoulderToElbow + elbowToWrist;
  
  const shoulderToWrist = calculateDistance(rightShoulder, rightWrist);
  const extension = shoulderToWrist / totalArmLength;

  // Map extension to bow position
  if (extension > 0.9) return 'tip';
  if (extension > 0.75) return 'upper';
  if (extension > 0.55) return 'middle';
  if (extension > 0.35) return 'lower';
  return 'frog';
};

// Left Hand Analysis Functions

export interface LeftHandPositionAnalysis {
  position: number; // 1-7
  wristAngle: number;
  thumbPosition: 'correct' | 'too_high' | 'too_low';
}

export const analyzeLeftHand = (pose: PoseResult): LeftHandPositionAnalysis | null => {
  const leftShoulder = pose.keypoints[POSE_LANDMARKS.LEFT_SHOULDER];
  const leftElbow = pose.keypoints[POSE_LANDMARKS.LEFT_ELBOW];
  const leftWrist = pose.keypoints[POSE_LANDMARKS.LEFT_WRIST];
  const leftThumb = pose.keypoints[POSE_LANDMARKS.LEFT_THUMB];
  const leftIndex = pose.keypoints[POSE_LANDMARKS.LEFT_INDEX];

  if (!isVisible(leftShoulder) || !isVisible(leftElbow) || 
      !isVisible(leftWrist) || !isVisible(leftIndex)) {
    return null;
  }

  // Estimate position based on arm angle and hand position
  const elbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  
  // Map elbow angle to position (rough estimate)
  let position = 1;
  if (elbowAngle < 60) position = 7;
  else if (elbowAngle < 75) position = 5;
  else if (elbowAngle < 90) position = 4;
  else if (elbowAngle < 105) position = 3;
  else if (elbowAngle < 120) position = 2;
  else position = 1;

  // Calculate wrist angle
  const wristAngle = calculateAngle(leftElbow, leftWrist, leftIndex);

  // Analyze thumb position relative to wrist
  let thumbPosition: 'correct' | 'too_high' | 'too_low' = 'correct';
  if (isVisible(leftThumb)) {
    const thumbWristDiff = leftThumb.y - leftWrist.y;
    const wristToIndex = calculateDistance(leftWrist, leftIndex);
    const normalizedThumbPos = thumbWristDiff / wristToIndex;
    
    if (normalizedThumbPos < -0.3) thumbPosition = 'too_high';
    else if (normalizedThumbPos > 0.3) thumbPosition = 'too_low';
  }

  return {
    position,
    wristAngle,
    thumbPosition,
  };
};

// Violin Position Analysis Functions

export interface ViolinPositionAnalysisResult {
  scrollHeight: 'correct' | 'too_high' | 'too_low';
  angle: number;
  chinContact: boolean;
}

export const analyzeViolinPosition = (pose: PoseResult): ViolinPositionAnalysisResult | null => {
  const nose = pose.keypoints[POSE_LANDMARKS.NOSE];
  const leftShoulder = pose.keypoints[POSE_LANDMARKS.LEFT_SHOULDER];
  const leftWrist = pose.keypoints[POSE_LANDMARKS.LEFT_WRIST];
  const leftIndex = pose.keypoints[POSE_LANDMARKS.LEFT_INDEX];

  if (!isVisible(leftShoulder) || !isVisible(leftWrist)) {
    return null;
  }

  // Estimate scroll position from left hand
  const handPos = isVisible(leftIndex) ? leftIndex : leftWrist;
  
  // Scroll height relative to shoulder
  const scrollHeightDiff = handPos.y - leftShoulder.y;
  const shoulderToWrist = calculateDistance(leftShoulder, leftWrist);
  const normalizedHeight = scrollHeightDiff / shoulderToWrist;

  let scrollHeight: 'correct' | 'too_high' | 'too_low' = 'correct';
  if (normalizedHeight < -0.3) scrollHeight = 'too_high';
  else if (normalizedHeight > 0.2) scrollHeight = 'too_low';

  // Estimate violin angle from hand position
  const angle = calculateAngleFromHorizontal(leftShoulder, handPos);

  // Check chin contact (rough estimate based on head proximity to shoulder)
  let chinContact = false;
  if (isVisible(nose)) {
    const noseToShoulder = calculateDistance(nose, leftShoulder);
    const headToShoulderRatio = noseToShoulder / shoulderToWrist;
    chinContact = headToShoulderRatio < 1.5;
  }

  return {
    scrollHeight,
    angle,
    chinContact,
  };
};

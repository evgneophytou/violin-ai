'use client';

/**
 * Bow Tracker Module
 * 
 * Enhanced bow tracking with direction detection and trajectory analysis.
 * Uses pose keypoints to track bow movements and analyze technique.
 */

import { POSE_LANDMARKS, Keypoint, PoseResult } from './pose-types';

// Types
export interface BowPosition {
  x: number;
  y: number;
  z?: number;
  timestamp: number;
}

export interface BowStroke {
  direction: 'up' | 'down';
  startTime: number;
  endTime: number;
  startPosition: BowPosition;
  endPosition: BowPosition;
  speed: number; // pixels per second
  straightness: number; // 0-100
  smoothness: number; // 0-100
}

export interface BowAnalysis {
  currentDirection: 'up' | 'down' | 'stationary';
  bowPosition: 'frog' | 'lower' | 'middle' | 'upper' | 'tip';
  bowSpeed: number;
  bowStraightness: number;
  bowChangeSmooth: boolean;
  recentStrokes: BowStroke[];
  averageSpeed: number;
  averageStraightness: number;
  suggestions: string[];
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  timestamp: number;
  velocity: number;
  acceleration: number;
}

// Constants
const POSITION_HISTORY_SIZE = 60; // ~1 second at 60fps
const MIN_MOVEMENT_THRESHOLD = 5; // pixels
const DIRECTION_CHANGE_THRESHOLD = 10; // pixels
const BOW_LENGTH_ESTIMATE = 200; // pixels (approximate)

// Kalman filter for smooth trajectory estimation
class KalmanFilter {
  private x: number = 0; // state estimate
  private p: number = 1; // estimate uncertainty
  private q: number = 0.1; // process noise
  private r: number = 0.5; // measurement noise

  filter(measurement: number): number {
    // Prediction
    const xPred = this.x;
    const pPred = this.p + this.q;

    // Update
    const k = pPred / (pPred + this.r);
    this.x = xPred + k * (measurement - xPred);
    this.p = (1 - k) * pPred;

    return this.x;
  }

  reset(): void {
    this.x = 0;
    this.p = 1;
  }
}

// Bow Tracker Class
export class BowTracker {
  private positionHistory: BowPosition[] = [];
  private trajectoryHistory: TrajectoryPoint[] = [];
  private strokeHistory: BowStroke[] = [];
  private currentStroke: Partial<BowStroke> | null = null;
  
  private kalmanX = new KalmanFilter();
  private kalmanY = new KalmanFilter();
  
  private lastDirection: 'up' | 'down' | 'stationary' = 'stationary';
  private directionChangeTime = 0;
  
  // Reference points for bow position calculation
  private bowFrogReference: BowPosition | null = null;
  private bowTipReference: BowPosition | null = null;

  constructor() {}

  // Update with new pose data
  update(pose: PoseResult): BowAnalysis | null {
    const rightWrist = pose.keypoints[POSE_LANDMARKS.RIGHT_WRIST];
    const rightElbow = pose.keypoints[POSE_LANDMARKS.RIGHT_ELBOW];
    const rightShoulder = pose.keypoints[POSE_LANDMARKS.RIGHT_SHOULDER];
    
    if (!rightWrist || !rightElbow || (rightWrist.score || 0) < 0.5) {
      return null;
    }

    const timestamp = performance.now();
    
    // Apply Kalman filter for smoothing
    const smoothedX = this.kalmanX.filter(rightWrist.x);
    const smoothedY = this.kalmanY.filter(rightWrist.y);
    
    const currentPosition: BowPosition = {
      x: smoothedX,
      y: smoothedY,
      z: rightWrist.z,
      timestamp,
    };

    // Add to history
    this.positionHistory.push(currentPosition);
    if (this.positionHistory.length > POSITION_HISTORY_SIZE) {
      this.positionHistory.shift();
    }

    // Calculate velocity and acceleration
    const velocity = this.calculateVelocity();
    const acceleration = this.calculateAcceleration();
    
    const trajectoryPoint: TrajectoryPoint = {
      x: smoothedX,
      y: smoothedY,
      timestamp,
      velocity,
      acceleration,
    };
    
    this.trajectoryHistory.push(trajectoryPoint);
    if (this.trajectoryHistory.length > POSITION_HISTORY_SIZE) {
      this.trajectoryHistory.shift();
    }

    // Detect bow direction
    const direction = this.detectDirection();
    
    // Handle direction changes (bow changes)
    if (direction !== this.lastDirection && direction !== 'stationary') {
      this.handleDirectionChange(direction, currentPosition, timestamp);
    }
    this.lastDirection = direction;

    // Calculate bow position (frog to tip)
    const bowPosition = this.calculateBowPosition(currentPosition, rightElbow);
    
    // Calculate straightness
    const straightness = this.calculateStraightness();
    
    // Generate analysis
    return this.generateAnalysis(direction, bowPosition, velocity, straightness);
  }

  // Detect bow direction based on horizontal movement
  private detectDirection(): 'up' | 'down' | 'stationary' {
    if (this.positionHistory.length < 5) return 'stationary';
    
    const recentPositions = this.positionHistory.slice(-10);
    const firstPos = recentPositions[0];
    const lastPos = recentPositions[recentPositions.length - 1];
    
    const deltaX = lastPos.x - firstPos.x;
    
    if (Math.abs(deltaX) < MIN_MOVEMENT_THRESHOLD) {
      return 'stationary';
    }
    
    // For right-handed playing:
    // Moving right (positive X) = down bow
    // Moving left (negative X) = up bow
    return deltaX > 0 ? 'down' : 'up';
  }

  // Handle direction change (bow change)
  private handleDirectionChange(
    newDirection: 'up' | 'down',
    currentPosition: BowPosition,
    timestamp: number
  ): void {
    // Complete current stroke
    if (this.currentStroke && this.currentStroke.startPosition) {
      const stroke: BowStroke = {
        direction: this.currentStroke.direction!,
        startTime: this.currentStroke.startTime!,
        endTime: timestamp,
        startPosition: this.currentStroke.startPosition,
        endPosition: currentPosition,
        speed: this.calculateStrokeSpeed(this.currentStroke.startPosition, currentPosition, 
          timestamp - this.currentStroke.startTime!),
        straightness: this.calculateStrokeStraightness(),
        smoothness: this.calculateStrokeSmoothness(),
      };
      
      this.strokeHistory.push(stroke);
      if (this.strokeHistory.length > 20) {
        this.strokeHistory.shift();
      }
    }

    // Start new stroke
    this.currentStroke = {
      direction: newDirection,
      startTime: timestamp,
      startPosition: currentPosition,
    };
    
    this.directionChangeTime = timestamp;
  }

  // Calculate velocity (pixels per second)
  private calculateVelocity(): number {
    if (this.positionHistory.length < 2) return 0;
    
    const recent = this.positionHistory.slice(-5);
    const first = recent[0];
    const last = recent[recent.length - 1];
    
    const distance = Math.sqrt(
      Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2)
    );
    const timeDelta = (last.timestamp - first.timestamp) / 1000; // convert to seconds
    
    return timeDelta > 0 ? distance / timeDelta : 0;
  }

  // Calculate acceleration
  private calculateAcceleration(): number {
    if (this.trajectoryHistory.length < 3) return 0;
    
    const recent = this.trajectoryHistory.slice(-5);
    const velocities = recent.map(p => p.velocity);
    
    const firstVel = velocities[0];
    const lastVel = velocities[velocities.length - 1];
    const timeDelta = (recent[recent.length - 1].timestamp - recent[0].timestamp) / 1000;
    
    return timeDelta > 0 ? (lastVel - firstVel) / timeDelta : 0;
  }

  // Calculate bow position along the stick
  private calculateBowPosition(
    wristPos: BowPosition,
    elbow: Keypoint
  ): 'frog' | 'lower' | 'middle' | 'upper' | 'tip' {
    // Use arm extension as a proxy for bow position
    // More extended = closer to tip
    const armLength = Math.sqrt(
      Math.pow(wristPos.x - elbow.x, 2) + Math.pow(wristPos.y - elbow.y, 2)
    );
    
    // Normalize based on estimated full arm extension
    // This is approximate and should be calibrated per user
    const maxArmLength = 300; // estimated pixels
    const normalizedPosition = Math.min(1, armLength / maxArmLength);
    
    if (normalizedPosition < 0.2) return 'frog';
    if (normalizedPosition < 0.4) return 'lower';
    if (normalizedPosition < 0.6) return 'middle';
    if (normalizedPosition < 0.8) return 'upper';
    return 'tip';
  }

  // Calculate straightness of bow path
  private calculateStraightness(): number {
    if (this.positionHistory.length < 10) return 100;
    
    const recent = this.positionHistory.slice(-20);
    
    // Fit a line to the points and measure deviation
    const n = recent.length;
    const sumX = recent.reduce((sum, p) => sum + p.x, 0);
    const sumY = recent.reduce((sum, p) => sum + p.y, 0);
    const sumXY = recent.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = recent.reduce((sum, p) => sum + p.x * p.x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate average deviation from the line
    const avgDeviation = recent.reduce((sum, p) => {
      const expectedY = slope * p.x + intercept;
      return sum + Math.abs(p.y - expectedY);
    }, 0) / n;
    
    // Convert to 0-100 score (lower deviation = higher score)
    const maxDeviation = 50; // pixels
    const straightness = Math.max(0, 100 - (avgDeviation / maxDeviation) * 100);
    
    return Math.round(straightness);
  }

  // Calculate stroke speed
  private calculateStrokeSpeed(
    start: BowPosition,
    end: BowPosition,
    durationMs: number
  ): number {
    const distance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    const durationSec = durationMs / 1000;
    return durationSec > 0 ? distance / durationSec : 0;
  }

  // Calculate stroke straightness
  private calculateStrokeStraightness(): number {
    return this.calculateStraightness();
  }

  // Calculate stroke smoothness (based on acceleration consistency)
  private calculateStrokeSmoothness(): number {
    if (this.trajectoryHistory.length < 5) return 100;
    
    const recent = this.trajectoryHistory.slice(-20);
    const accelerations = recent.map(p => p.acceleration);
    
    // Calculate variance of acceleration
    const avgAcc = accelerations.reduce((a, b) => a + b, 0) / accelerations.length;
    const variance = accelerations.reduce((sum, acc) => 
      sum + Math.pow(acc - avgAcc, 2), 0) / accelerations.length;
    
    // Lower variance = smoother motion
    const maxVariance = 10000;
    const smoothness = Math.max(0, 100 - (variance / maxVariance) * 100);
    
    return Math.round(smoothness);
  }

  // Generate full analysis
  private generateAnalysis(
    direction: 'up' | 'down' | 'stationary',
    bowPosition: 'frog' | 'lower' | 'middle' | 'upper' | 'tip',
    speed: number,
    straightness: number
  ): BowAnalysis {
    const recentStrokes = this.strokeHistory.slice(-5);
    
    const avgSpeed = recentStrokes.length > 0
      ? recentStrokes.reduce((sum, s) => sum + s.speed, 0) / recentStrokes.length
      : 0;
    
    const avgStraightness = recentStrokes.length > 0
      ? recentStrokes.reduce((sum, s) => sum + s.straightness, 0) / recentStrokes.length
      : straightness;

    // Check bow change smoothness
    const bowChangeSmooth = recentStrokes.length >= 2 
      ? recentStrokes.slice(-2).every(s => s.smoothness > 70)
      : true;

    // Generate suggestions
    const suggestions = this.generateSuggestions(
      direction,
      bowPosition,
      speed,
      straightness,
      bowChangeSmooth
    );

    return {
      currentDirection: direction,
      bowPosition,
      bowSpeed: speed,
      bowStraightness: straightness,
      bowChangeSmooth,
      recentStrokes,
      averageSpeed: avgSpeed,
      averageStraightness: avgStraightness,
      suggestions,
    };
  }

  // Generate technique suggestions
  private generateSuggestions(
    direction: 'up' | 'down' | 'stationary',
    bowPosition: 'frog' | 'lower' | 'middle' | 'upper' | 'tip',
    speed: number,
    straightness: number,
    bowChangeSmooth: boolean
  ): string[] {
    const suggestions: string[] = [];

    if (straightness < 70) {
      suggestions.push('Focus on keeping the bow parallel to the bridge for a straighter stroke');
    }

    if (!bowChangeSmooth) {
      suggestions.push('Work on smoother bow changes - think of a figure-8 motion at the frog and tip');
    }

    if (speed > 500) {
      suggestions.push('Your bow speed is quite fast - consider using more bow with controlled speed');
    }

    if (speed < 50 && direction !== 'stationary') {
      suggestions.push('Your bow speed is slow - try using more arm weight and bow speed for better tone');
    }

    // Position-specific suggestions
    if (bowPosition === 'frog' || bowPosition === 'lower') {
      suggestions.push('You\'re playing near the frog - use arm weight rather than pressure');
    } else if (bowPosition === 'tip' || bowPosition === 'upper') {
      suggestions.push('You\'re playing near the tip - use slightly more bow speed to compensate');
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  // Calibrate bow length references
  calibrateBowLength(frogPosition: BowPosition, tipPosition: BowPosition): void {
    this.bowFrogReference = frogPosition;
    this.bowTipReference = tipPosition;
  }

  // Get trajectory for visualization
  getTrajectory(): TrajectoryPoint[] {
    return [...this.trajectoryHistory];
  }

  // Get position history for visualization
  getPositionHistory(): BowPosition[] {
    return [...this.positionHistory];
  }

  // Reset tracker
  reset(): void {
    this.positionHistory = [];
    this.trajectoryHistory = [];
    this.strokeHistory = [];
    this.currentStroke = null;
    this.kalmanX.reset();
    this.kalmanY.reset();
    this.lastDirection = 'stationary';
  }
}

// Singleton instance
let bowTrackerInstance: BowTracker | null = null;

export const getBowTracker = (): BowTracker => {
  if (!bowTrackerInstance) {
    bowTrackerInstance = new BowTracker();
  }
  return bowTrackerInstance;
};

export const disposeBowTracker = (): void => {
  if (bowTrackerInstance) {
    bowTrackerInstance.reset();
    bowTrackerInstance = null;
  }
};

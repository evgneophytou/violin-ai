'use client';

import type { PoseResult, PoseDetectorConfig, Keypoint } from './pose-types';

// TensorFlow modules - will be loaded dynamically at runtime only when needed
// This file intentionally has no TensorFlow imports to avoid bundler issues

const DEFAULT_CONFIG: PoseDetectorConfig = {
  modelType: 'full',
  enableSmoothing: true,
  minPoseScore: 0.3,
};

class PoseDetectorService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private detector: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private poseModule: any = null;
  private isInitializing = false;
  private config: PoseDetectorConfig;

  constructor(config: PoseDetectorConfig = DEFAULT_CONFIG) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (this.detector || this.isInitializing) return;

    if (typeof window === 'undefined') {
      throw new Error('Pose detection is only available in the browser');
    }

    this.isInitializing = true;

    try {
      // Load TensorFlow modules using eval to avoid static analysis
      // This is a workaround for bundler issues with TensorFlow ESM
      const loadTF = new Function('return import("@tensorflow/tfjs-backend-webgl")');
      const loadPose = new Function('return import("@tensorflow-models/pose-detection")');
      
      await loadTF();
      this.poseModule = await loadPose();

      // Use BlazePose model from TensorFlow.js
      const model = this.poseModule.SupportedModels.BlazePose;
      const detectorConfig = {
        runtime: 'tfjs' as const,
        modelType: this.config.modelType || 'full',
        enableSmoothing: this.config.enableSmoothing,
      };

      this.detector = await this.poseModule.createDetector(model, detectorConfig);
      console.log('Pose detector initialized successfully');
    } catch (error) {
      console.error('Failed to initialize pose detector:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async detectPose(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<PoseResult | null> {
    if (!this.detector) {
      console.warn('Pose detector not initialized');
      return null;
    }

    try {
      const poses = await this.detector.estimatePoses(input, {
        flipHorizontal: false,
      });

      if (poses.length === 0) return null;

      const pose = poses[0];

      // Filter out low-confidence keypoints
      const filteredKeypoints = pose.keypoints.map((kp: Keypoint) => ({
        x: kp.x,
        y: kp.y,
        z: kp.z,
        score: kp.score,
        name: kp.name,
      }));

      return {
        keypoints: filteredKeypoints,
        keypoints3D: pose.keypoints3D?.map((kp: Keypoint) => ({
          x: kp.x,
          y: kp.y,
          z: kp.z,
          score: kp.score,
          name: kp.name,
        })),
        score: pose.score,
      };
    } catch (error) {
      console.error('Error detecting pose:', error);
      return null;
    }
  }

  getKeypoint(pose: PoseResult, landmarkIndex: number): Keypoint | null {
    if (landmarkIndex < 0 || landmarkIndex >= pose.keypoints.length) {
      return null;
    }
    return pose.keypoints[landmarkIndex];
  }

  getKeypoint3D(pose: PoseResult, landmarkIndex: number): Keypoint | null {
    if (!pose.keypoints3D || landmarkIndex < 0 || landmarkIndex >= pose.keypoints3D.length) {
      return null;
    }
    return pose.keypoints3D[landmarkIndex];
  }

  isKeypointVisible(keypoint: Keypoint | null, minScore = 0.5): boolean {
    if (!keypoint) return false;
    return (keypoint.score ?? 0) >= minScore;
  }

  dispose(): void {
    if (this.detector) {
      this.detector.dispose();
      this.detector = null;
    }
  }

  get isReady(): boolean {
    return this.detector !== null;
  }
}

// Singleton instance
let poseDetectorInstance: PoseDetectorService | null = null;

export const getPoseDetector = (config?: PoseDetectorConfig): PoseDetectorService => {
  if (!poseDetectorInstance) {
    poseDetectorInstance = new PoseDetectorService(config);
  }
  return poseDetectorInstance;
};

export const disposePoseDetector = (): void => {
  if (poseDetectorInstance) {
    poseDetectorInstance.dispose();
    poseDetectorInstance = null;
  }
};

export { PoseDetectorService };

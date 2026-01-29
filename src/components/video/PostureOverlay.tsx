'use client';

import { useEffect, useRef } from 'react';
import { POSE_LANDMARKS, type PoseResult, type Keypoint } from '@/lib/video/pose-types';
import type { TechniqueAnalysis } from '@/stores/video-store';

interface PostureOverlayProps {
  pose: PoseResult | null;
  analysis: TechniqueAnalysis | null;
  width: number;
  height: number;
  showSkeleton?: boolean;
  showFeedback?: boolean;
}

// Connection pairs for drawing skeleton
const SKELETON_CONNECTIONS = [
  // Face
  [POSE_LANDMARKS.LEFT_EAR, POSE_LANDMARKS.LEFT_EYE],
  [POSE_LANDMARKS.LEFT_EYE, POSE_LANDMARKS.NOSE],
  [POSE_LANDMARKS.NOSE, POSE_LANDMARKS.RIGHT_EYE],
  [POSE_LANDMARKS.RIGHT_EYE, POSE_LANDMARKS.RIGHT_EAR],
  // Upper body
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
  // Hands
  [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.LEFT_THUMB],
  [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.LEFT_INDEX],
  [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.LEFT_PINKY],
  [POSE_LANDMARKS.RIGHT_WRIST, POSE_LANDMARKS.RIGHT_THUMB],
  [POSE_LANDMARKS.RIGHT_WRIST, POSE_LANDMARKS.RIGHT_INDEX],
  [POSE_LANDMARKS.RIGHT_WRIST, POSE_LANDMARKS.RIGHT_PINKY],
  // Torso
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
];

// Important landmarks to highlight
const KEY_LANDMARKS = [
  POSE_LANDMARKS.LEFT_SHOULDER,
  POSE_LANDMARKS.RIGHT_SHOULDER,
  POSE_LANDMARKS.LEFT_ELBOW,
  POSE_LANDMARKS.RIGHT_ELBOW,
  POSE_LANDMARKS.LEFT_WRIST,
  POSE_LANDMARKS.RIGHT_WRIST,
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.RIGHT_HIP,
];

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#22c55e'; // green
  if (score >= 60) return '#eab308'; // yellow
  return '#ef4444'; // red
};

const isVisible = (kp: Keypoint | undefined, minScore = 0.5): boolean => {
  return kp !== undefined && (kp.score ?? 0) >= minScore;
};

export const PostureOverlay = ({
  pose,
  analysis,
  width,
  height,
  showSkeleton = true,
  showFeedback = true,
}: PostureOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!pose) return;

    const keypoints = pose.keypoints;

    // Draw skeleton connections
    if (showSkeleton) {
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
        const start = keypoints[startIdx];
        const end = keypoints[endIdx];

        if (!isVisible(start) || !isVisible(end)) continue;

        // Color based on confidence
        const avgScore = ((start.score ?? 0) + (end.score ?? 0)) / 2;
        ctx.strokeStyle = avgScore > 0.7 ? '#3b82f6' : '#94a3b8';
        ctx.globalAlpha = Math.max(0.3, avgScore);

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }

    // Draw key landmarks
    if (showSkeleton) {
      for (const idx of KEY_LANDMARKS) {
        const kp = keypoints[idx];
        if (!isVisible(kp)) continue;

        // Draw outer circle
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();

        // Draw inner circle
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }

    // Draw feedback indicators
    if (showFeedback && analysis) {
      // Draw score indicators near relevant body parts
      const rightShoulder = keypoints[POSE_LANDMARKS.RIGHT_SHOULDER];
      const leftShoulder = keypoints[POSE_LANDMARKS.LEFT_SHOULDER];
      const rightWrist = keypoints[POSE_LANDMARKS.RIGHT_WRIST];
      const leftWrist = keypoints[POSE_LANDMARKS.LEFT_WRIST];

      // Posture indicator (near head)
      if (isVisible(leftShoulder) && isVisible(rightShoulder)) {
        const midX = (leftShoulder.x + rightShoulder.x) / 2;
        const midY = Math.min(leftShoulder.y, rightShoulder.y) - 60;
        
        drawScoreIndicator(ctx, midX, midY, 'Posture', analysis.posture.score);
      }

      // Bow arm indicator (near right wrist)
      if (isVisible(rightWrist)) {
        drawScoreIndicator(
          ctx,
          rightWrist.x + 40,
          rightWrist.y - 20,
          'Bow',
          analysis.bowArm.score
        );
      }

      // Left hand indicator (near left wrist)
      if (isVisible(leftWrist)) {
        drawScoreIndicator(
          ctx,
          leftWrist.x - 80,
          leftWrist.y - 20,
          'L.Hand',
          analysis.leftHand.score
        );
      }

      // Draw bow straightness indicator
      if (isVisible(rightWrist) && analysis.bowArm.bowStraightness < 70) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        // Draw a horizontal guide line
        const guideY = rightWrist.y;
        ctx.beginPath();
        ctx.moveTo(rightWrist.x - 100, guideY);
        ctx.lineTo(rightWrist.x + 100, guideY);
        ctx.stroke();
        
        ctx.setLineDash([]);
      }

      // Shoulder tension indicator
      if (analysis.posture.shoulderTension === 'tense') {
        if (isVisible(leftShoulder)) {
          drawWarningIcon(ctx, leftShoulder.x, leftShoulder.y - 30);
        }
        if (isVisible(rightShoulder)) {
          drawWarningIcon(ctx, rightShoulder.x, rightShoulder.y - 30);
        }
      }
    }
  }, [pose, analysis, width, height, showSkeleton, showFeedback]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 pointer-events-none"
      style={{ width, height }}
    />
  );
};

// Helper function to draw score indicator
const drawScoreIndicator = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  score: number
) => {
  const color = getScoreColor(score);
  const radius = 20;

  // Draw background circle
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fill();

  // Draw score arc
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (2 * Math.PI * score) / 100;
  
  ctx.beginPath();
  ctx.arc(x, y, radius - 3, startAngle, endAngle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Draw label
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + 3);
};

// Helper function to draw warning icon
const drawWarningIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
) => {
  const size = 16;
  
  // Draw triangle
  ctx.beginPath();
  ctx.moveTo(x, y - size / 2);
  ctx.lineTo(x - size / 2, y + size / 2);
  ctx.lineTo(x + size / 2, y + size / 2);
  ctx.closePath();
  ctx.fillStyle = '#eab308';
  ctx.fill();

  // Draw exclamation mark
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('!', x, y + 4);
};

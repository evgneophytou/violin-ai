'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Camera,
  CameraOff,
  Eye,
  EyeOff,
  Activity,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { POSE_LANDMARKS } from '@/lib/video/pose-types';
import { useVideoStore, getAverageScores, type TechniqueAnalysis } from '@/stores/video-store';
import { PostureOverlay } from './PostureOverlay';

// Define module types for lazy loading
type PoseDetectorModule = typeof import('@/lib/video/pose-detector');
type TechniqueAgentModule = typeof import('@/lib/ai/video-technique-agent');

interface VideoAnalyzerProps {
  onAnalysisComplete?: (analysis: { averageScores?: { overall: number } } | null) => void;
}

const VIDEO_CONSTRAINTS = {
  width: 640,
  height: 480,
  facingMode: 'user',
};

export const VideoAnalyzer = ({ onAnalysisComplete }: VideoAnalyzerProps) => {
  const webcamRef = useRef<Webcam>(null);
  const animationRef = useRef<number | null>(null);
  const lastAnalysisTime = useRef<number>(0);
  
  // Module refs for lazy-loaded modules
  const poseDetectorRef = useRef<PoseDetectorModule | null>(null);
  const techniqueAgentRef = useRef<TechniqueAgentModule | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isModulesLoaded, setIsModulesLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });

  const {
    isDetectorReady,
    isAnalyzing,
    isCameraActive,
    currentPose,
    currentAnalysis,
    analysisHistory,
    wristPositionHistory,
    showOverlay,
    showSkeleton,
    analysisInterval,
    setDetectorReady,
    setIsAnalyzing,
    setCameraActive,
    setCurrentPose,
    setCurrentAnalysis,
    addAnalysisToHistory,
    addWristPosition,
    clearWristHistory,
    setShowOverlay,
    setShowSkeleton,
    reset,
  } = useVideoStore();

  // Load TensorFlow modules on mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadModules = async () => {
      try {
        const [poseModule, techniqueModule] = await Promise.all([
          import('@/lib/video/pose-detector'),
          import('@/lib/ai/video-technique-agent'),
        ]);
        poseDetectorRef.current = poseModule;
        techniqueAgentRef.current = techniqueModule;
        setIsModulesLoaded(true);
      } catch (err) {
        console.error('Failed to load video analysis modules:', err);
        setError('Failed to load video analysis. This feature requires TensorFlow.js.');
      }
    };

    loadModules();
  }, []);

  // Initialize pose detector
  const initializeDetector = useCallback(async () => {
    if (!poseDetectorRef.current) {
      setError('Modules not loaded yet');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const detector = poseDetectorRef.current.getPoseDetector();
      await detector.initialize();
      setDetectorReady(true);
    } catch (err) {
      console.error('Failed to initialize pose detector:', err);
      setError('Failed to load pose detection model. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [setDetectorReady]);

  // Start camera and analysis
  const startAnalysis = useCallback(async () => {
    if (!isDetectorReady) {
      await initializeDetector();
    }
    setCameraActive(true);
    setIsAnalyzing(true);
    clearWristHistory();
  }, [isDetectorReady, initializeDetector, setCameraActive, setIsAnalyzing, clearWristHistory]);

  // Stop analysis
  const stopAnalysis = useCallback(() => {
    setIsAnalyzing(false);
    setCameraActive(false);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // Generate session report
    if (analysisHistory.length >= 5 && onAnalysisComplete && techniqueAgentRef.current) {
      const report = techniqueAgentRef.current.generateSessionReport(analysisHistory);
      onAnalysisComplete(report);
    }
  }, [setIsAnalyzing, setCameraActive, analysisHistory, onAnalysisComplete]);

  // Analysis loop
  const runAnalysis = useCallback(async () => {
    if (!isAnalyzing || !webcamRef.current?.video || !poseDetectorRef.current || !techniqueAgentRef.current) {
      return;
    }

    const video = webcamRef.current.video;
    if (video.readyState !== 4) {
      animationRef.current = requestAnimationFrame(runAnalysis);
      return;
    }

    const now = Date.now();
    if (now - lastAnalysisTime.current < analysisInterval) {
      animationRef.current = requestAnimationFrame(runAnalysis);
      return;
    }
    lastAnalysisTime.current = now;

    try {
      const detector = poseDetectorRef.current.getPoseDetector();
      const pose = await detector.detectPose(video);

      if (pose) {
        setCurrentPose(pose);

        // Track wrist position for bow straightness analysis
        const rightWrist = pose.keypoints[POSE_LANDMARKS.RIGHT_WRIST];
        if (rightWrist && (rightWrist.score ?? 0) > 0.5) {
          addWristPosition(rightWrist.x, rightWrist.y);
        }

        // Perform technique analysis
        const analysis = techniqueAgentRef.current.performTechniqueAnalysis(pose, wristPositionHistory);
        setCurrentAnalysis(analysis);
        addAnalysisToHistory(analysis);
      }
    } catch (err) {
      console.error('Analysis error:', err);
    }

    animationRef.current = requestAnimationFrame(runAnalysis);
  }, [
    isAnalyzing,
    analysisInterval,
    wristPositionHistory,
    setCurrentPose,
    setCurrentAnalysis,
    addAnalysisToHistory,
    addWristPosition,
  ]);

  // Start analysis loop when analyzing
  useEffect(() => {
    if (isAnalyzing && isCameraActive && isModulesLoaded) {
      animationRef.current = requestAnimationFrame(runAnalysis);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnalyzing, isCameraActive, isModulesLoaded, runAnalysis]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (poseDetectorRef.current) {
        poseDetectorRef.current.disposePoseDetector();
      }
      reset();
    };
  }, [reset]);

  // Handle webcam ready
  const handleWebcamReady = useCallback(() => {
    const video = webcamRef.current?.video;
    if (video) {
      setDimensions({
        width: video.videoWidth || 640,
        height: video.videoHeight || 480,
      });
    }
  }, []);

  const averageScores = getAverageScores(analysisHistory);

  // Show loading state while modules are loading
  if (!isModulesLoaded && !error) {
    return (
      <Card className="w-full">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading video analysis...</p>
            <p className="text-xs text-muted-foreground">This may take a moment</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <span>Technique Analysis</span>
            {isAnalyzing && (
              <Badge variant="default" className="gap-1">
                <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                Live
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSkeleton(!showSkeleton)}
              className="gap-1"
              aria-label={showSkeleton ? 'Hide skeleton' : 'Show skeleton'}
            >
              {showSkeleton ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOverlay(!showOverlay)}
              className="gap-1"
              aria-label={showOverlay ? 'Hide feedback' : 'Show feedback'}
            >
              {showOverlay ? 'Feedback On' : 'Feedback Off'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Video Container */}
        <div
          className="relative bg-muted rounded-lg overflow-hidden"
          style={{ aspectRatio: '4/3' }}
        >
          {isCameraActive ? (
            <>
              <Webcam
                ref={webcamRef}
                audio={false}
                videoConstraints={VIDEO_CONSTRAINTS}
                onUserMedia={handleWebcamReady}
                className="w-full h-full object-cover"
                mirrored
              />
              <PostureOverlay
                pose={currentPose}
                analysis={currentAnalysis}
                width={dimensions.width}
                height={dimensions.height}
                showSkeleton={showSkeleton}
                showFeedback={showOverlay}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Camera className="h-16 w-16 mb-4" />
              <p className="text-sm">Camera is off</p>
              <p className="text-xs mt-1">Click Start to begin technique analysis</p>
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Loading pose detection model...</p>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={initializeDetector}
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {!isAnalyzing ? (
            <Button
              onClick={startAnalysis}
              disabled={isLoading || !isModulesLoaded}
              className="flex-1 gap-2"
            >
              <Camera className="h-4 w-4" />
              Start Analysis
            </Button>
          ) : (
            <Button
              onClick={stopAnalysis}
              variant="destructive"
              className="flex-1 gap-2"
            >
              <CameraOff className="h-4 w-4" />
              Stop Analysis
            </Button>
          )}
        </div>

        {/* Current Scores */}
        {currentAnalysis && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Score</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{currentAnalysis.overallScore}</span>
                  <span className="text-muted-foreground">/100</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ScoreCard
                  label="Posture"
                  score={currentAnalysis.posture.score}
                  detail={currentAnalysis.posture.shoulderTension}
                />
                <ScoreCard
                  label="Bow Arm"
                  score={currentAnalysis.bowArm.score}
                  detail={`${currentAnalysis.bowArm.bowStraightness}% straight`}
                />
                <ScoreCard
                  label="Left Hand"
                  score={currentAnalysis.leftHand.score}
                  detail={`Position ${currentAnalysis.leftHand.position}`}
                />
                <ScoreCard
                  label="Violin Position"
                  score={currentAnalysis.violinPosition.score}
                  detail={currentAnalysis.violinPosition.chinContact ? 'Good contact' : 'Check chin'}
                />
              </div>
            </div>
          </>
        )}

        {/* Suggestions */}
        {currentAnalysis && currentAnalysis.suggestions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Suggestions</p>
              {currentAnalysis.suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Session Average */}
        {averageScores && analysisHistory.length >= 10 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Session Average ({analysisHistory.length} samples)</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Posture</span>
                  <span>{averageScores.posture}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bow Arm</span>
                  <span>{averageScores.bowArm}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Left Hand</span>
                  <span>{averageScores.leftHand}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Violin Pos.</span>
                  <span>{averageScores.violinPosition}%</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Score card component
const ScoreCard = ({
  label,
  score,
  detail,
}: {
  label: string;
  score: number;
  detail: string;
}) => {
  const getScoreVariant = (s: number): 'default' | 'secondary' | 'destructive' => {
    if (s >= 80) return 'default';
    if (s >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Badge variant={getScoreVariant(score)} className="text-xs">
          {score}
        </Badge>
      </div>
      <Progress value={score} className="h-1.5" />
      <p className="text-xs text-muted-foreground mt-1 capitalize">{detail}</p>
    </div>
  );
};

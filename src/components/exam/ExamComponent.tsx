'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChevronRight,
  ChevronLeft,
  Music,
  BookOpen,
  Headphones,
  Video,
  Mic,
  MicOff,
  Play,
  Square,
  Check,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import {
  EXAM_STRUCTURE,
  GRADE_NAMES,
  gradeComponent,
  calculateExamResult,
  type ExamAttempt,
  type ExamComponentType,
  type ExamComponentResult,
} from '@/lib/ai/exam-grader-agent';
import {
  generateAuralTestSet,
  scoreAuralTests,
  type AuralTest,
} from '@/lib/ai/aural-test-agent';
import { useExamStore } from '@/stores/exam-store';
// TechniqueAnalysis type (matches video-store types)
interface PostureAnalysis {
  shoulderTension: 'relaxed' | 'moderate' | 'tense';
  shoulderLevel: number;
  spineAlignment: number;
  headPosition: 'correct' | 'tilted_left' | 'tilted_right' | 'forward';
  score: number;
}

interface BowArmAnalysis {
  elbowHeight: 'correct' | 'too_high' | 'too_low';
  wristAngle: number;
  bowStraightness: number;
  bowDistribution: 'tip' | 'upper' | 'middle' | 'lower' | 'frog';
  strokeDirection: 'up' | 'down' | 'stationary';
  score: number;
}

interface LeftHandAnalysis {
  position: number;
  fingerCurvature: 'good' | 'flat' | 'collapsed';
  wristAngle: number;
  thumbPosition: 'correct' | 'too_high' | 'too_low';
  score: number;
}

interface ViolinPositionAnalysis {
  chinContact: boolean;
  scrollHeight: 'correct' | 'too_high' | 'too_low';
  violinAngle: number;
  stability: number;
  score: number;
}

interface TechniqueAnalysis {
  posture: PostureAnalysis;
  bowArm: BowArmAnalysis;
  leftHand: LeftHandAnalysis;
  violinPosition: ViolinPositionAnalysis;
  overallScore: number;
  suggestions: string[];
  timestamp: number;
}

// Placeholder for VideoAnalyzer - loads dynamically on client side only
const VideoAnalyzerPlaceholder = ({ onAnalysisComplete }: { onAnalysisComplete?: (report: { averageScores?: { overall: number } } | null) => void }) => {
  const [Component, setComponent] = useState<React.ComponentType<{ onAnalysisComplete?: (report: { averageScores?: { overall: number } } | null) => void }> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    import('@/components/video/VideoAnalyzer')
      .then((mod) => {
        setComponent(() => mod.VideoAnalyzer);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load VideoAnalyzer:', err);
        setIsLoading(false);
      });
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading video analyzer...</span>
      </div>
    );
  }
  
  if (Component) {
    return <Component onAnalysisComplete={onAnalysisComplete} />;
  }
  
  return (
    <div className="flex items-center justify-center p-8 text-muted-foreground">
      Video analyzer unavailable
    </div>
  );
};

interface ExamComponentProps {
  exam: ExamAttempt;
  onComplete: () => void;
}

const PHASE_ORDER: ExamComponentType[] = ['scales', 'piece', 'sight_reading', 'aural', 'technique'];

const COMPONENT_ICONS = {
  scales: Music,
  piece: BookOpen,
  sight_reading: BookOpen,
  aural: Headphones,
  technique: Video,
};

export const ExamComponent = ({ exam, onComplete }: ExamComponentProps) => {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [hasRecorded, setHasRecorded] = useState(false);
  
  // Ref to store the media stream for cleanup
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Aural test state
  const [auralTests, setAuralTests] = useState<AuralTest[]>([]);
  const [auralAnswers, setAuralAnswers] = useState<number[]>([]);
  const [currentAuralIndex, setCurrentAuralIndex] = useState(0);

  // Technique analysis state
  const [techniqueAnalysis, setTechniqueAnalysis] = useState<TechniqueAnalysis | null>(null);

  const {
    setComponentResult,
    setRecording,
    completeExam,
    componentResults,
  } = useExamStore();

  const currentPhase = PHASE_ORDER[currentPhaseIndex];
  const currentConfig = EXAM_STRUCTURE[exam.grade].find((c) => c.type === currentPhase);
  const Icon = COMPONENT_ICONS[currentPhase];

  // Cleanup on unmount - release all media resources
  useEffect(() => {
    return () => {
      // Stop the media recorder if recording
      if (mediaRecorder?.state === 'recording') {
        mediaRecorder.stop();
      }
      // Stop all media stream tracks to release the microphone
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [mediaRecorder]);

  // Initialize aural tests
  useEffect(() => {
    if (currentPhase === 'aural' && auralTests.length === 0) {
      const testSet = generateAuralTestSet(exam.grade);
      setAuralTests(testSet.tests);
    }
  }, [currentPhase, exam.grade, auralTests.length]);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Start recording
  const handleStartRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Store stream reference for cleanup
      mediaStreamRef.current = stream;
      
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioChunks([blob]);
        
        if (currentPhase === 'scales' || currentPhase === 'piece' || currentPhase === 'sight_reading') {
          setRecording(currentPhase, blob);
        }
        
        // Stop all tracks and clear reference
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        setHasRecorded(true);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      // Clean up stream if error occurs after getting it
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to start recording:', error);
      }
    }
  }, [currentPhase, setRecording]);

  // Stop recording
  const handleStopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  }, [mediaRecorder]);

  // Submit aural answer
  const handleAuralAnswer = useCallback((answerIndex: number) => {
    setAuralAnswers((prev) => [...prev, answerIndex]);
    
    if (currentAuralIndex < auralTests.length - 1) {
      setCurrentAuralIndex((prev) => prev + 1);
    }
  }, [currentAuralIndex, auralTests.length]);

  // Grade current component and move to next
  const handleNext = useCallback(() => {
    if (!currentConfig) return;

    // Generate mock scores for demo (in real app, analyze recordings)
    let result: ExamComponentResult;

    switch (currentPhase) {
      case 'scales':
      case 'piece':
      case 'sight_reading': {
        // Mock performance data (would come from audio analysis in production)
        const pitchAcc = 70 + Math.random() * 25;
        const rhythmAcc = 70 + Math.random() * 25;
        const dynamics = 65 + Math.random() * 30;
        const phrasing = 65 + Math.random() * 30;

        result = gradeComponent(currentPhase, exam.grade, {
          pitchAccuracy: pitchAcc,
          rhythmAccuracy: rhythmAcc,
          dynamicsScore: dynamics,
          phrasingScore: phrasing,
        });
        break;
      }

      case 'aural': {
        const auralScore = scoreAuralTests(auralTests, auralAnswers);
        result = gradeComponent(currentPhase, exam.grade, {
          auralAnswers: {
            correct: auralScore.correct,
            total: auralScore.total,
          },
        });
        break;
      }

      case 'technique': {
        result = gradeComponent(currentPhase, exam.grade, {
          techniqueAnalysis: techniqueAnalysis || undefined,
        });
        break;
      }

      default:
        return;
    }

    setComponentResult(currentPhase, result);

    // Move to next phase or complete
    if (currentPhaseIndex < PHASE_ORDER.length - 1) {
      setCurrentPhaseIndex((prev) => prev + 1);
      setHasRecorded(false);
      setRecordingTime(0);
    } else {
      // Calculate final result
      const allResults = Array.from(componentResults.values());
      allResults.push(result);
      
      const { totalScore, result: examResult, overallFeedback } = calculateExamResult(allResults);
      completeExam(examResult, totalScore, overallFeedback);
      onComplete();
    }
  }, [
    currentConfig,
    currentPhase,
    currentPhaseIndex,
    exam.grade,
    auralTests,
    auralAnswers,
    techniqueAnalysis,
    componentResults,
    setComponentResult,
    completeExam,
    onComplete,
  ]);

  // Handle technique analysis complete
  const handleTechniqueComplete = useCallback((report: { averageScores?: { overall: number } } | null) => {
    if (report?.averageScores) {
      // Create a mock TechniqueAnalysis from the session report
      setTechniqueAnalysis({
        posture: { shoulderTension: 'relaxed', shoulderLevel: 0, spineAlignment: 85, headPosition: 'correct', score: 80 },
        bowArm: { elbowHeight: 'correct', wristAngle: 160, bowStraightness: 75, bowDistribution: 'middle', strokeDirection: 'stationary', score: 75 },
        leftHand: { position: 1, fingerCurvature: 'good', wristAngle: 160, thumbPosition: 'correct', score: 80 },
        violinPosition: { chinContact: true, scrollHeight: 'correct', violinAngle: 45, stability: 80, score: 85 },
        overallScore: report.averageScores.overall,
        suggestions: [],
        timestamp: Date.now(),
      });
    }
  }, []);

  if (!currentConfig) return null;

  const progress = ((currentPhaseIndex + 1) / PHASE_ORDER.length) * 100;

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">{GRADE_NAMES[exam.grade]} Exam</h2>
              <p className="text-sm text-muted-foreground">
                Component {currentPhaseIndex + 1} of {PHASE_ORDER.length}
              </p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              In Progress
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            {PHASE_ORDER.map((phase, idx) => (
              <span
                key={phase}
                className={idx <= currentPhaseIndex ? 'text-primary font-medium' : ''}
              >
                {phase.replace('_', ' ')}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Component */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {currentConfig.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{currentConfig.description}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recording components */}
          {(currentPhase === 'scales' || currentPhase === 'piece' || currentPhase === 'sight_reading') && (
            <div className="space-y-4">
              <div className="p-6 bg-muted/50 rounded-lg text-center">
                {isRecording ? (
                  <div className="space-y-4">
                    <div className="relative inline-flex">
                      <div className="h-20 w-20 rounded-full bg-red-500/20 flex items-center justify-center">
                        <Mic className="h-10 w-10 text-red-500 animate-pulse" />
                      </div>
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full animate-ping" />
                    </div>
                    <div className="text-2xl font-mono font-bold">
                      {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:
                      {(recordingTime % 60).toString().padStart(2, '0')}
                    </div>
                    <Button onClick={handleStopRecording} variant="destructive" className="gap-2">
                      <Square className="h-4 w-4" />
                      Stop Recording
                    </Button>
                  </div>
                ) : hasRecorded ? (
                  <div className="space-y-4">
                    <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                      <Check className="h-10 w-10 text-green-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">Recording complete</p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={handleStartRecording} variant="outline" className="gap-2">
                        <Mic className="h-4 w-4" />
                        Re-record
                      </Button>
                      <Button onClick={handleNext} className="gap-2">
                        Continue
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto">
                      <MicOff className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentPhase === 'scales' && 'Play your scales when ready'}
                      {currentPhase === 'piece' && 'Perform your prepared piece'}
                      {currentPhase === 'sight_reading' && 'Sight-read the displayed passage'}
                    </p>
                    <Button onClick={handleStartRecording} className="gap-2">
                      <Mic className="h-4 w-4" />
                      Start Recording
                    </Button>
                  </div>
                )}
              </div>

              {currentPhase === 'sight_reading' && (
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    Sight-reading passage (demo):
                  </p>
                  <div className="font-mono text-lg tracking-wider">
                    G A B C | D E F# G | A B A G | F# E D -
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aural tests */}
          {currentPhase === 'aural' && auralTests.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Question {currentAuralIndex + 1} of {auralTests.length}
                </span>
                <Progress
                  value={((currentAuralIndex + 1) / auralTests.length) * 100}
                  className="w-32 h-2"
                />
              </div>

              {currentAuralIndex < auralTests.length ? (
                <AuralTestQuestion
                  test={auralTests[currentAuralIndex]}
                  onAnswer={handleAuralAnswer}
                  answered={auralAnswers.length > currentAuralIndex}
                />
              ) : (
                <div className="text-center py-8">
                  <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">Aural tests complete!</p>
                  <Button onClick={handleNext} className="mt-4 gap-2">
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Technique (video analysis) */}
          {currentPhase === 'technique' && (
            <div className="space-y-4">
              <VideoAnalyzerPlaceholder onAnalysisComplete={handleTechniqueComplete} />
              
              {techniqueAnalysis && (
                <div className="flex justify-end">
                  <Button onClick={handleNext} className="gap-2">
                    Complete Exam
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Points info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Maximum points:</span>
            <span className="font-medium">{currentConfig.maxScore}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Aural test question component
const AuralTestQuestion = ({
  test,
  onAnswer,
  answered,
}: {
  test: AuralTest;
  onAnswer: (index: number) => void;
  answered: boolean;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    // In production, this would play the audio sequence using Tone.js
    // For demo, we simulate playback
    setTimeout(() => setIsPlaying(false), 2000);
  }, []);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-4">
        <Badge variant="secondary" className="capitalize">
          {test.type.replace('_', ' ')}
        </Badge>
        <p className="text-lg font-medium">{test.question}</p>
        
        <Button
          onClick={handlePlay}
          disabled={isPlaying}
          variant="outline"
          className="gap-2"
        >
          <Play className={`h-4 w-4 ${isPlaying ? 'animate-pulse' : ''}`} />
          {isPlaying ? 'Playing...' : 'Play Audio'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {test.options.map((option, idx) => (
          <button
            key={option.id}
            onClick={() => !answered && onAnswer(idx)}
            disabled={answered}
            className={`
              p-4 rounded-lg border-2 text-center transition-all
              ${answered
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:border-primary hover:bg-primary/5 cursor-pointer'
              }
            `}
            aria-label={`Select ${option.label}`}
            tabIndex={0}
          >
            <span className="font-medium">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

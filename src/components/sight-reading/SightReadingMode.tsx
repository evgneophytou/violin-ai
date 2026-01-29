'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { SheetMusicDisplay } from '@/components/sheet-music/SheetMusicDisplay';
import {
  Eye,
  Play,
  Clock,
  RefreshCw,
  TrendingUp,
  Target,
  Award,
  Timer,
} from 'lucide-react';
import {
  generateSightReadingExercise,
  calculateSightReadingScore,
  suggestNextDifficulty,
  type SightReadingExercise,
  type SightReadingStats,
} from '@/lib/ai/sight-reading-agent';

interface SightReadingModeProps {
  className?: string;
}

type Phase = 'setup' | 'study' | 'perform' | 'result';

export const SightReadingMode = ({ className }: SightReadingModeProps) => {
  const [phase, setPhase] = useState<Phase>('setup');
  const [difficulty, setDifficulty] = useState(2);
  const [exercise, setExercise] = useState<SightReadingExercise | null>(null);
  const [studyTimeRemaining, setStudyTimeRemaining] = useState(0);
  const [performanceTime, setPerformanceTime] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [stats, setStats] = useState<SightReadingStats>({
    totalAttempts: 0,
    averageAccuracy: 0,
    currentLevel: 2,
    streak: 0,
  });
  const [recentScores, setRecentScores] = useState<number[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleGenerateExercise = useCallback(() => {
    const newExercise = generateSightReadingExercise(difficulty);
    setExercise(newExercise);
    setPhase('setup');
    setScore(null);
  }, [difficulty]);

  const handleStartStudy = useCallback(() => {
    if (!exercise) return;
    
    setPhase('study');
    setStudyTimeRemaining(exercise.studyTime);
    
    timerRef.current = setInterval(() => {
      setStudyTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          setPhase('perform');
          startTimeRef.current = Date.now();
          // Start performance timer
          timerRef.current = setInterval(() => {
            setPerformanceTime((Date.now() - startTimeRef.current) / 1000);
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [exercise]);

  const handleFinishPerformance = useCallback((accuracy: number = 75, hesitations: number = 2) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (!exercise) return;
    
    const finalScore = calculateSightReadingScore(
      exercise.notes,
      accuracy,
      hesitations,
      performanceTime,
      exercise.studyTime
    );
    
    setScore(finalScore);
    setPhase('result');
    
    // Update stats
    const newRecentScores = [...recentScores, finalScore].slice(-10);
    setRecentScores(newRecentScores);
    
    const newStats: SightReadingStats = {
      totalAttempts: stats.totalAttempts + 1,
      averageAccuracy: Math.round(
        newRecentScores.reduce((a, b) => a + b, 0) / newRecentScores.length
      ),
      currentLevel: suggestNextDifficulty(difficulty, newRecentScores),
      streak: finalScore >= 70 ? stats.streak + 1 : 0,
    };
    setStats(newStats);
    
    // Auto-adjust difficulty
    if (newStats.currentLevel !== difficulty) {
      setDifficulty(newStats.currentLevel);
    }
  }, [exercise, performanceTime, recentScores, stats, difficulty]);

  const handleTryAgain = useCallback(() => {
    setPhase('setup');
    setScore(null);
    setPerformanceTime(0);
  }, []);

  const handleNewExercise = useCallback(() => {
    handleGenerateExercise();
  }, [handleGenerateExercise]);

  // Generate initial exercise
  useEffect(() => {
    if (!exercise) {
      handleGenerateExercise();
    }
  }, [exercise, handleGenerateExercise]);

  return (
    <Card className={className}>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            <span>Sight-Reading Practice</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Level {difficulty}</Badge>
            {stats.streak > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Award className="h-3 w-3" />
                {stats.streak} streak
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phase: Setup */}
        {phase === 'setup' && (
          <>
            {/* Difficulty Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Difficulty Level</label>
                <span className="text-sm text-muted-foreground">{difficulty}/5</span>
              </div>
              <Slider
                value={[difficulty]}
                onValueChange={(v) => setDifficulty(v[0])}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Beginner</span>
                <span>Advanced</span>
              </div>
            </div>

            <Separator />

            {/* Exercise Preview */}
            {exercise && (
              <>
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Study time: {exercise.studyTime} seconds
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {exercise.notes.length} notes • {exercise.features.accidentals} accidentals
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleGenerateExercise}
                    className="flex-1 gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    New Exercise
                  </Button>
                  <Button onClick={handleStartStudy} className="flex-1 gap-2">
                    <Play className="h-4 w-4" />
                    Start
                  </Button>
                </div>
              </>
            )}
          </>
        )}

        {/* Phase: Study */}
        {phase === 'study' && exercise && (
          <>
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Timer className="h-5 w-5 text-primary animate-pulse" />
                <span className="text-2xl font-bold">{studyTimeRemaining}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Study the music - no playing yet!
              </p>
              <Progress value={(studyTimeRemaining / exercise.studyTime) * 100} />
            </div>

            <SheetMusicDisplay
              musicXML={exercise.musicXML}
              currentNoteIndex={-1}
              className="min-h-[200px] border-2 border-primary/50 rounded-lg"
            />

            <p className="text-xs text-center text-muted-foreground">
              Memorize the notes, rhythms, and key signature
            </p>
          </>
        )}

        {/* Phase: Perform */}
        {phase === 'perform' && exercise && (
          <>
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-5 w-5" />
                <span className="text-2xl font-bold">
                  {performanceTime.toFixed(1)}s
                </span>
              </div>
              <p className="text-sm font-medium text-primary">Play now!</p>
            </div>

            <SheetMusicDisplay
              musicXML={exercise.musicXML}
              currentNoteIndex={-1}
              className="min-h-[200px]"
            />

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={() => handleFinishPerformance(90, 0)}
                className="text-xs"
              >
                Perfect
              </Button>
              <Button
                variant="outline"
                onClick={() => handleFinishPerformance(75, 2)}
                className="text-xs"
              >
                Good
              </Button>
              <Button
                variant="outline"
                onClick={() => handleFinishPerformance(50, 5)}
                className="text-xs"
              >
                Struggled
              </Button>
            </div>
          </>
        )}

        {/* Phase: Result */}
        {phase === 'result' && exercise && score !== null && (
          <>
            <div className="text-center space-y-4">
              <div
                className={`text-4xl ${
                  score >= 80
                    ? 'text-green-500'
                    : score >= 60
                    ? 'text-yellow-500'
                    : 'text-red-500'
                }`}
              >
                {score >= 80 ? '🎉' : score >= 60 ? '👍' : '📚'}
              </div>
              <div>
                <p className="text-3xl font-bold">{Math.round(score)}%</p>
                <p className="text-sm text-muted-foreground">
                  Time: {performanceTime.toFixed(1)}s
                </p>
              </div>
              <p className="text-sm">
                {score >= 80
                  ? 'Excellent sight-reading!'
                  : score >= 60
                  ? 'Good attempt, keep practicing!'
                  : 'Review the passage and try again.'}
              </p>
            </div>

            <Separator />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <Target className="h-5 w-5 mx-auto mb-1" />
                <p className="text-lg font-bold">{stats.averageAccuracy}%</p>
                <p className="text-xs text-muted-foreground">Avg Accuracy</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <TrendingUp className="h-5 w-5 mx-auto mb-1" />
                <p className="text-lg font-bold">{stats.totalAttempts}</p>
                <p className="text-xs text-muted-foreground">Total Attempts</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleTryAgain}
                className="flex-1"
              >
                Try Again
              </Button>
              <Button onClick={handleNewExercise} className="flex-1">
                New Exercise
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Heart,
  Wind,
  Eye,
  Brain,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Clock,
  Sparkles,
  CheckCircle2,
  Target,
} from 'lucide-react';
import {
  getMindsetCoach,
  BREATHING_EXERCISES,
  VISUALIZATION_SCRIPTS,
  COGNITIVE_REFRAMES,
  PRE_PERFORMANCE_ROUTINES,
  ANXIETY_LEVELS,
  type BreathingExercise,
  type VisualizationScript,
  type BreathingPhase,
} from '@/lib/ai/mindset-coach-agent';

// Breathing Timer Component
const BreathingTimer = ({
  exercise,
  onComplete,
}: {
  exercise: BreathingExercise;
  onComplete: () => void;
}) => {
  const [isActive, setIsActive] = useState(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseTimeRemaining, setPhaseTimeRemaining] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [totalCycles, setTotalCycles] = useState(4);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentPhase = exercise.phases[currentPhaseIndex];
  const progress = ((currentPhase.duration - phaseTimeRemaining) / currentPhase.duration) * 100;

  const handleStart = () => {
    setIsActive(true);
    setCurrentPhaseIndex(0);
    setPhaseTimeRemaining(exercise.phases[0].duration);
    setCycleCount(0);
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setCurrentPhaseIndex(0);
    setPhaseTimeRemaining(0);
    setCycleCount(0);
  };

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setPhaseTimeRemaining((prev) => {
          if (prev <= 1) {
            // Move to next phase
            const nextIndex = (currentPhaseIndex + 1) % exercise.phases.length;
            setCurrentPhaseIndex(nextIndex);
            
            // Check if we completed a cycle
            if (nextIndex === 0) {
              setCycleCount((c) => {
                const newCount = c + 1;
                if (newCount >= totalCycles) {
                  setIsActive(false);
                  onComplete();
                  return 0;
                }
                return newCount;
              });
            }
            
            return exercise.phases[nextIndex].duration;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, currentPhaseIndex, exercise.phases, totalCycles, onComplete]);

  const getPhaseColor = (type: BreathingPhase['type']) => {
    switch (type) {
      case 'inhale':
        return 'bg-blue-500';
      case 'hold':
        return 'bg-amber-500';
      case 'exhale':
        return 'bg-green-500';
      case 'pause':
        return 'bg-slate-400';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{exercise.name}</CardTitle>
        <CardDescription>{exercise.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Circle */}
        <div className="flex justify-center">
          <div
            className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-1000 ${
              isActive ? getPhaseColor(currentPhase.type) : 'bg-muted'
            }`}
            style={{
              transform: isActive && currentPhase.type === 'inhale' ? 'scale(1.2)' : 
                        isActive && currentPhase.type === 'exhale' ? 'scale(0.9)' : 'scale(1)',
            }}
          >
            <div className="text-center text-white">
              <p className="text-3xl font-bold">{phaseTimeRemaining || '--'}</p>
              <p className="text-sm capitalize">{isActive ? currentPhase.type : 'Ready'}</p>
            </div>
          </div>
        </div>

        {/* Phase indicator */}
        <div className="flex justify-center gap-2">
          {exercise.phases.map((phase, idx) => (
            <div
              key={idx}
              className={`w-3 h-3 rounded-full transition-colors ${
                idx === currentPhaseIndex && isActive
                  ? getPhaseColor(phase.type)
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Instruction */}
        {isActive && (
          <p className="text-center text-muted-foreground">
            {currentPhase.instruction}
          </p>
        )}

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Cycle {cycleCount + 1} of {totalCycles}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={isActive ? progress : 0} />
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-2">
          {!isActive ? (
            <Button onClick={handleStart} className="gap-2">
              <Play className="h-4 w-4" />
              Start
            </Button>
          ) : (
            <Button onClick={handlePause} variant="outline" className="gap-2">
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          )}
          <Button onClick={handleReset} variant="ghost" size="icon">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Benefits */}
        <div className="flex flex-wrap gap-1">
          {exercise.benefits.map((benefit) => (
            <Badge key={benefit} variant="secondary" className="text-xs">
              {benefit}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Visualization Script Component
const VisualizationPlayer = ({
  script,
  onComplete,
}: {
  script: VisualizationScript;
  onComplete: () => void;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleStart = () => {
    setIsPlaying(true);
    setCurrentStep(0);
  };

  const handleNext = () => {
    if (currentStep < script.script.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsPlaying(false);
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  useEffect(() => {
    if (isPlaying && autoAdvance) {
      intervalRef.current = setInterval(() => {
        handleNext();
      }, 10000); // 10 seconds per step
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, autoAdvance, currentStep]);

  const progress = ((currentStep + 1) / script.script.length) * 100;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{script.name}</CardTitle>
            <CardDescription>{script.description}</CardDescription>
          </div>
          <Badge variant="outline" className="capitalize">
            {script.category.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isPlaying ? (
          <div className="text-center py-8">
            <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Find a quiet space, close your eyes, and follow along.
            </p>
            <Button onClick={handleStart} className="gap-2">
              <Play className="h-4 w-4" />
              Begin Visualization
            </Button>
          </div>
        ) : (
          <>
            <Progress value={progress} className="h-1" />
            
            <div className="min-h-[120px] p-4 bg-muted rounded-lg">
              <p className="text-lg leading-relaxed">
                {script.script[currentStep]}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {script.script.length}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                >
                  Previous
                </Button>
                <Button size="sm" onClick={handleNext}>
                  {currentStep === script.script.length - 1 ? 'Finish' : 'Next'}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Anxiety Check-in Component
const AnxietyCheckIn = () => {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const coach = getMindsetCoach();

  const handleSelect = (level: number) => {
    setSelectedLevel(level);
  };

  const anxietyInfo = selectedLevel ? ANXIETY_LEVELS[selectedLevel - 1] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5" />
          Anxiety Check-In
        </CardTitle>
        <CardDescription>
          How are you feeling right now? Select your current anxiety level.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between gap-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <Button
              key={level}
              variant={selectedLevel === level ? 'default' : 'outline'}
              className="flex-1 h-16 flex-col gap-1"
              onClick={() => handleSelect(level)}
            >
              <span className="text-lg font-bold">{level}</span>
              <span className="text-xs">
                {level === 1 ? 'Calm' : level === 5 ? 'High' : ''}
              </span>
            </Button>
          ))}
        </div>

        {anxietyInfo && (
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={selectedLevel! <= 2 ? 'default' : selectedLevel! <= 3 ? 'secondary' : 'destructive'}>
                Level {selectedLevel}
              </Badge>
              <span className="font-medium">{anxietyInfo.description}</span>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Common symptoms:</p>
              <div className="flex flex-wrap gap-1">
                {anxietyInfo.symptoms.map((symptom) => (
                  <Badge key={symptom} variant="outline" className="text-xs">
                    {symptom}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Recommendations:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {anxietyInfo.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Pre-Performance Routine Component
const PrePerformanceRoutine = () => {
  const [selectedRoutine, setSelectedRoutine] = useState(PRE_PERFORMANCE_ROUTINES[0]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const toggleStep = (order: number) => {
    setCompletedSteps((prev) =>
      prev.includes(order)
        ? prev.filter((o) => o !== order)
        : [...prev, order]
    );
  };

  const progress = (completedSteps.length / selectedRoutine.steps.length) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pre-Performance Routine
        </CardTitle>
        <CardDescription>
          Follow this routine before your performance to prepare mentally and physically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {PRE_PERFORMANCE_ROUTINES.map((routine) => (
            <Button
              key={routine.name}
              variant={selectedRoutine.name === routine.name ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedRoutine(routine);
                setCompletedSteps([]);
              }}
            >
              {routine.timeBeforePerformance}min
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{completedSteps.length} of {selectedRoutine.steps.length} steps</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        <div className="space-y-2">
          {selectedRoutine.steps.map((step) => (
            <div
              key={step.order}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                completedSteps.includes(step.order)
                  ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                  : 'hover:bg-muted'
              }`}
              onClick={() => toggleStep(step.order)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  completedSteps.includes(step.order)
                    ? 'bg-green-500 text-white'
                    : 'bg-muted'
                }`}>
                  {completedSteps.includes(step.order) ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <span className="text-xs">{step.order}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{step.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {step.duration}min
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Affirmations Component
const Affirmations = () => {
  const [focus, setFocus] = useState<'confidence' | 'calm' | 'preparation' | 'recovery'>('confidence');
  const coach = getMindsetCoach();
  const affirmations = coach.generateAffirmations(focus);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Affirmations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(['confidence', 'calm', 'preparation', 'recovery'] as const).map((f) => (
            <Button
              key={f}
              variant={focus === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFocus(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          {affirmations.map((affirmation, idx) => (
            <div
              key={idx}
              className="p-3 bg-muted rounded-lg text-center italic"
            >
              "{affirmation}"
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Main Wellness Tab Component
export const WellnessTab = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [activeSection, setActiveSection] = useState('breathing');
  const [selectedExercise, setSelectedExercise] = useState(BREATHING_EXERCISES[0]);
  const [selectedVisualization, setSelectedVisualization] = useState(VISUALIZATION_SCRIPTS[0]);
  const [completedSessions, setCompletedSessions] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleBreathingComplete = () => {
    setCompletedSessions((prev) => prev + 1);
  };

  const handleVisualizationComplete = () => {
    setCompletedSessions((prev) => prev + 1);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Wind className="h-6 w-6 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{BREATHING_EXERCISES.length}</p>
            <p className="text-xs text-muted-foreground">Breathing Exercises</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Eye className="h-6 w-6 mx-auto mb-1 text-purple-500" />
            <p className="text-2xl font-bold">{VISUALIZATION_SCRIPTS.length}</p>
            <p className="text-xs text-muted-foreground">Visualizations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Heart className="h-6 w-6 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold">{completedSessions}</p>
            <p className="text-xs text-muted-foreground">Sessions Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="breathing">
            <Wind className="h-4 w-4 mr-2" />
            Breathing
          </TabsTrigger>
          <TabsTrigger value="visualization">
            <Eye className="h-4 w-4 mr-2" />
            Visualize
          </TabsTrigger>
          <TabsTrigger value="checkin">
            <Target className="h-4 w-4 mr-2" />
            Check-In
          </TabsTrigger>
          <TabsTrigger value="routine">
            <Clock className="h-4 w-4 mr-2" />
            Routine
          </TabsTrigger>
        </TabsList>

        {/* Breathing Tab */}
        <TabsContent value="breathing" className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {BREATHING_EXERCISES.map((exercise) => (
              <Button
                key={exercise.id}
                variant={selectedExercise.id === exercise.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedExercise(exercise)}
              >
                {exercise.name}
              </Button>
            ))}
          </div>

          <BreathingTimer
            exercise={selectedExercise}
            onComplete={handleBreathingComplete}
          />
        </TabsContent>

        {/* Visualization Tab */}
        <TabsContent value="visualization" className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {VISUALIZATION_SCRIPTS.map((script) => (
              <Button
                key={script.id}
                variant={selectedVisualization.id === script.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedVisualization(script)}
              >
                {script.name}
              </Button>
            ))}
          </div>

          <VisualizationPlayer
            script={selectedVisualization}
            onComplete={handleVisualizationComplete}
          />

          <Affirmations />
        </TabsContent>

        {/* Check-In Tab */}
        <TabsContent value="checkin">
          <AnxietyCheckIn />
        </TabsContent>

        {/* Routine Tab */}
        <TabsContent value="routine">
          <PrePerformanceRoutine />
        </TabsContent>
      </Tabs>

      {/* Cognitive Reframes Quick Reference */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Quick Reframes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {COGNITIVE_REFRAMES.slice(0, 4).map((reframe, idx) => (
              <div key={idx} className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium text-destructive line-through mb-1">
                  "{reframe.negativeThought}"
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  "{reframe.reframedThought}"
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WellnessTab;

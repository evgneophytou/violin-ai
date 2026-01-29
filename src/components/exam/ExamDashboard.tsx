'use client';

import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  GraduationCap,
  Music,
  BookOpen,
  Headphones,
  Video,
  Trophy,
  Star,
  ChevronRight,
  Play,
  Clock,
  Target,
  Award,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  generateExam,
  GRADE_NAMES,
  GRADE_LEVELS,
  EXAM_STRUCTURE,
  PASS_THRESHOLDS,
  type ExamGrade,
  type ExamAttempt,
} from '@/lib/ai/exam-grader-agent';
import { useExamStore, getExamStats } from '@/stores/exam-store';
import { ExamComponent } from './ExamComponent';
import { ExamResults } from './ExamResults';
import { FEATURES, EVENTS, trackEvent } from '@/lib/analytics/tracking';

const GRADE_OPTIONS: ExamGrade[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const COMPONENT_ICONS = {
  scales: Music,
  piece: BookOpen,
  sight_reading: BookOpen,
  aural: Headphones,
  technique: Video,
};

interface ExamDashboardProps {
  userId?: string;
  userLevel?: number;
}

export const ExamDashboard = ({ userId = 'demo-user', userLevel = 1 }: ExamDashboardProps) => {
  const [selectedGrade, setSelectedGrade] = useState<ExamGrade | null>(null);
  
  const {
    currentExam,
    currentPhase,
    examHistory,
    startExam,
    setPhase,
    reset,
  } = useExamStore();

  const stats = getExamStats(examHistory);

  const handleStartExam = useCallback(() => {
    if (selectedGrade === null) return;
    
    // Track exam start
    trackEvent(EVENTS.EXAM_STARTED, FEATURES.EXAMS, {
      grade: selectedGrade,
    });
    
    const exam = generateExam(selectedGrade, userId);
    startExam(exam);
  }, [selectedGrade, userId, startExam]);

  const handleExamComplete = useCallback(() => {
    // Track exam completion
    if (currentExam) {
      trackEvent(EVENTS.EXAM_COMPLETED, FEATURES.EXAMS, {
        grade: currentExam.grade,
        score: currentExam.totalScore,
      });
    }
    
    reset();
    setSelectedGrade(null);
  }, [reset, currentExam]);
  
  const handleGradeSelect = useCallback((grade: ExamGrade) => {
    // Track grade selection
    trackEvent(EVENTS.EXAM_GRADE_SELECTED, FEATURES.EXAMS, {
      grade,
    });
    setSelectedGrade(grade);
  }, []);

  // Show exam in progress
  if (currentExam && currentPhase !== 'select_grade' && currentPhase !== 'completed') {
    return (
      <ExamComponent
        exam={currentExam}
        onComplete={() => setPhase('completed')}
      />
    );
  }

  // Show results
  if (currentExam && currentPhase === 'completed') {
    return (
      <ExamResults
        exam={currentExam}
        onClose={handleExamComplete}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Exam Center
          </h2>
          <p className="text-muted-foreground">
            Take graded exams to test your skills and earn certificates
          </p>
        </div>
        {stats && (
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalExams}</div>
              <div className="text-muted-foreground">Exams Taken</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.passRate}%</div>
              <div className="text-muted-foreground">Pass Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.distinctions}</div>
              <div className="text-muted-foreground">Distinctions</div>
            </div>
          </div>
        )}
      </div>

      {/* Grade Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Your Grade</CardTitle>
          <CardDescription>
            Choose the exam level you want to attempt. Each grade tests progressively harder skills.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
            {GRADE_OPTIONS.map((grade) => {
              const isSelected = selectedGrade === grade;
              const hasPassed = examHistory.some(
                (e) => e.grade === grade && e.result !== 'fail'
              );
              
              return (
                <button
                  key={grade}
                  onClick={() => handleGradeSelect(grade)}
                  className={`
                    relative p-3 rounded-lg border-2 transition-all text-center min-w-0 overflow-hidden
                    ${isSelected 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                    }
                    ${hasPassed ? 'ring-2 ring-green-500 ring-offset-1' : ''}
                  `}
                  aria-label={`Select ${GRADE_NAMES[grade]}`}
                  tabIndex={0}
                >
                  {hasPassed && (
                    <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-green-500 bg-background rounded-full" />
                  )}
                  <div className="text-lg font-bold">
                    {grade === 0 ? 'Init' : grade}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate leading-tight">
                    {GRADE_LEVELS[grade]}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Grade Details */}
      {selectedGrade !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{GRADE_NAMES[selectedGrade]} Exam</span>
              <Badge variant="secondary">{GRADE_LEVELS[selectedGrade]}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Exam Components */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Exam Components
              </h3>
              <div className="space-y-2">
                {EXAM_STRUCTURE[selectedGrade].map((component) => {
                  const Icon = COMPONENT_ICONS[component.type];
                  return (
                    <div
                      key={component.type}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{component.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {component.description}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{component.maxScore} pts</div>
                        <div className="text-xs text-muted-foreground">
                          {Math.round(component.weight * 100)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Pass Requirements */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Award className="h-4 w-4" />
                Pass Requirements
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {PASS_THRESHOLDS.pass}%
                  </div>
                  <div className="text-xs text-muted-foreground">Pass</div>
                </div>
                <div className="text-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {PASS_THRESHOLDS.merit}%
                  </div>
                  <div className="text-xs text-muted-foreground">Merit</div>
                </div>
                <div className="text-center p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="text-lg font-bold text-yellow-600">
                    {PASS_THRESHOLDS.distinction}%
                  </div>
                  <div className="text-xs text-muted-foreground">Distinction</div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Estimated Time */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Estimated duration: 15-25 minutes</span>
              </div>
              <Button onClick={handleStartExam} className="gap-2">
                <Play className="h-4 w-4" />
                Start Exam
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exam History */}
      {examHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Exam History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {examHistory.slice(-5).reverse().map((exam) => (
                <ExamHistoryItem key={exam.id} exam={exam} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Exam history item component
const ExamHistoryItem = ({ exam }: { exam: ExamAttempt }) => {
  const resultColors = {
    fail: 'bg-red-500/10 text-red-600 border-red-500/20',
    pass: 'bg-green-500/10 text-green-600 border-green-500/20',
    merit: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    distinction: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  };

  const resultIcons = {
    fail: XCircle,
    pass: CheckCircle,
    merit: Star,
    distinction: Trophy,
  };

  const ResultIcon = resultIcons[exam.result];

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded border ${resultColors[exam.result]}`}>
          <ResultIcon className="h-4 w-4" />
        </div>
        <div>
          <div className="font-medium">{GRADE_NAMES[exam.grade]}</div>
          <div className="text-xs text-muted-foreground">
            {formatDate(exam.completedAt || exam.startedAt)}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-bold">{exam.percentage}%</div>
        <Badge variant="secondary" className="capitalize">
          {exam.result}
        </Badge>
      </div>
    </div>
  );
};

// Format date helper
const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

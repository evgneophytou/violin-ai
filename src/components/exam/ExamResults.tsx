'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Trophy,
  Star,
  Award,
  CheckCircle,
  XCircle,
  Download,
  Share2,
  RotateCcw,
  ArrowRight,
  Music,
  BookOpen,
  Headphones,
  Video,
} from 'lucide-react';
import { GRADE_NAMES, PASS_THRESHOLDS, type ExamAttempt, type ExamResult } from '@/lib/ai/exam-grader-agent';

interface ExamResultsProps {
  exam: ExamAttempt;
  onClose: () => void;
}

const RESULT_CONFIG: Record<ExamResult, {
  icon: typeof Trophy;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  distinction: {
    icon: Trophy,
    title: 'Distinction!',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  merit: {
    icon: Star,
    title: 'Merit!',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  pass: {
    icon: CheckCircle,
    title: 'Pass!',
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  fail: {
    icon: XCircle,
    title: 'Not Passed',
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
};

const COMPONENT_ICONS = {
  scales: Music,
  piece: BookOpen,
  sight_reading: BookOpen,
  aural: Headphones,
  technique: Video,
};

export const ExamResults = ({ exam, onClose }: ExamResultsProps) => {
  const config = RESULT_CONFIG[exam.result];
  const ResultIcon = config.icon;

  const getScoreColor = (percentage: number) => {
    if (percentage >= PASS_THRESHOLDS.distinction) return 'text-yellow-600';
    if (percentage >= PASS_THRESHOLDS.merit) return 'text-blue-600';
    if (percentage >= PASS_THRESHOLDS.pass) return 'text-green-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Result Header */}
      <Card className={`${config.bgColor} border-2 ${config.borderColor}`}>
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-4">
            <div className={`inline-flex p-4 rounded-full ${config.bgColor}`}>
              <ResultIcon className={`h-16 w-16 ${config.color}`} />
            </div>
            
            <div>
              <h1 className={`text-3xl font-bold ${config.color}`}>
                {config.title}
              </h1>
              <p className="text-lg text-muted-foreground mt-1">
                {GRADE_NAMES[exam.grade]} Exam
              </p>
            </div>

            <div className="flex items-center justify-center gap-2">
              <span className={`text-5xl font-bold ${getScoreColor(exam.percentage)}`}>
                {exam.percentage}%
              </span>
              <span className="text-2xl text-muted-foreground">
                ({exam.totalScore}/{exam.maxScore})
              </span>
            </div>

            {exam.result !== 'fail' && (
              <Badge className="text-lg py-1 px-4" variant="secondary">
                <Award className="h-4 w-4 mr-2" />
                Certificate Earned
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {exam.components.map((component) => {
            const Icon = COMPONENT_ICONS[component.type as keyof typeof COMPONENT_ICONS];
            const percentage = Math.round((component.score / component.maxScore) * 100);
            
            return (
              <div key={component.type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-medium">{component.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${getScoreColor(percentage)}`}>
                      {component.score}/{component.maxScore}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({percentage}%)
                    </span>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
                {component.feedback && (
                  <p className="text-sm text-muted-foreground">
                    {component.feedback}
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Grade Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Grade Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative pt-2">
            {/* Progress bar background */}
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  exam.percentage >= PASS_THRESHOLDS.distinction
                    ? 'bg-yellow-500'
                    : exam.percentage >= PASS_THRESHOLDS.merit
                    ? 'bg-blue-500'
                    : exam.percentage >= PASS_THRESHOLDS.pass
                    ? 'bg-green-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${exam.percentage}%` }}
              />
            </div>
            
            {/* Threshold markers */}
            <div className="absolute top-0 left-0 right-0 h-4">
              <div
                className="absolute top-0 h-full border-r-2 border-dashed border-muted-foreground/50"
                style={{ left: `${PASS_THRESHOLDS.pass}%` }}
              />
              <div
                className="absolute top-0 h-full border-r-2 border-dashed border-muted-foreground/50"
                style={{ left: `${PASS_THRESHOLDS.merit}%` }}
              />
              <div
                className="absolute top-0 h-full border-r-2 border-dashed border-muted-foreground/50"
                style={{ left: `${PASS_THRESHOLDS.distinction}%` }}
              />
            </div>

            {/* Labels */}
            <div className="flex justify-between mt-2 text-xs">
              <span className="text-red-600">Fail</span>
              <span className="text-green-600" style={{ marginLeft: '30%' }}>
                Pass ({PASS_THRESHOLDS.pass}%)
              </span>
              <span className="text-blue-600">
                Merit ({PASS_THRESHOLDS.merit}%)
              </span>
              <span className="text-yellow-600">
                Distinction ({PASS_THRESHOLDS.distinction}%)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Examiner Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {exam.result === 'distinction' && (
              'Congratulations! An outstanding performance demonstrating excellent musicianship. Your technical accuracy and musical expression were both exceptional.'
            )}
            {exam.result === 'merit' && (
              'Well done! A strong performance showing good musical understanding. Continue to focus on consistency and expression to achieve distinction.'
            )}
            {exam.result === 'pass' && (
              'Congratulations on passing! Continue working on the areas highlighted for improvement. With more practice, you\'ll be ready for the next grade.'
            )}
            {exam.result === 'fail' && (
              'Unfortunately, the required standard was not met this time. Focus on the feedback provided for each component and practice regularly. You can retake the exam when ready.'
            )}
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {exam.result !== 'fail' && (
          <>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download Certificate
            </Button>
            <Button variant="outline" className="gap-2">
              <Share2 className="h-4 w-4" />
              Share Result
            </Button>
          </>
        )}
        
        <Button variant="outline" className="gap-2" onClick={onClose}>
          <RotateCcw className="h-4 w-4" />
          {exam.result === 'fail' ? 'Try Again' : 'Take Another Exam'}
        </Button>

        {exam.result !== 'fail' && exam.grade < 8 && (
          <Button className="gap-2 ml-auto" onClick={onClose}>
            Prepare for {GRADE_NAMES[(exam.grade + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8]}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

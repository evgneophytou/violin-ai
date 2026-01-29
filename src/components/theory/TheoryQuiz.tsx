'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import type { TheoryQuiz as TheoryQuizType } from '@/types';

interface TheoryQuizProps {
  questions: TheoryQuizType[];
  onComplete: (correct: number, total: number) => void;
  onBack: () => void;
}

export const TheoryQuiz = ({ questions, onComplete, onBack }: TheoryQuizProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(questions.length).fill(null)
  );
  const [isComplete, setIsComplete] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleSelectAnswer = useCallback((answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
  }, [showResult]);

  const handleSubmit = useCallback(() => {
    if (selectedAnswer === null) return;
    
    const newAnswers = [...answers];
    newAnswers[currentIndex] = selectedAnswer;
    setAnswers(newAnswers);
    setShowResult(true);
  }, [selectedAnswer, answers, currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(answers[currentIndex + 1]);
      setShowResult(answers[currentIndex + 1] !== null);
    } else {
      // Quiz complete
      const correctCount = answers.filter(
        (answer, i) => answer === questions[i].correctAnswer
      ).length;
      setIsComplete(true);
      onComplete(correctCount, questions.length);
    }
  }, [currentIndex, questions, answers, onComplete]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedAnswer(answers[currentIndex - 1]);
      setShowResult(answers[currentIndex - 1] !== null);
    }
  }, [currentIndex, answers]);

  const isCorrect = selectedAnswer === currentQuestion?.correctAnswer;

  if (isComplete) {
    const correctCount = answers.filter(
      (answer, i) => answer === questions[i].correctAnswer
    ).length;
    
    return (
      <div className="text-center space-y-4 py-8">
        <div className="text-4xl">
          {correctCount === questions.length ? '🎉' : correctCount >= questions.length / 2 ? '👍' : '📚'}
        </div>
        <h3 className="text-xl font-bold">Quiz Complete!</h3>
        <p className="text-2xl font-bold text-primary">
          {correctCount} / {questions.length}
        </p>
        <p className="text-muted-foreground">
          {correctCount === questions.length
            ? 'Perfect score! You\'ve mastered this topic!'
            : correctCount >= questions.length / 2
            ? 'Good job! Keep practicing to improve.'
            : 'Review the lesson and try again.'}
        </p>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No questions available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Badge variant="outline">
          Question {currentIndex + 1} of {questions.length}
        </Badge>
      </div>

      {/* Progress */}
      <Progress value={progress} className="h-2" />

      {/* Question */}
      <div className="space-y-4 py-4">
        <div className="flex items-start gap-2">
          <HelpCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <h4 className="text-lg font-medium">{currentQuestion.question}</h4>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectAnswer = index === currentQuestion.correctAnswer;
            
            let variant: 'outline' | 'default' | 'secondary' | 'destructive' = 'outline';
            let extraClasses = '';
            
            if (showResult) {
              if (isCorrectAnswer) {
                variant = 'default';
                extraClasses = 'bg-green-500 hover:bg-green-500 border-green-500';
              } else if (isSelected && !isCorrectAnswer) {
                variant = 'destructive';
              }
            } else if (isSelected) {
              variant = 'secondary';
            }

            return (
              <Button
                key={index}
                variant={variant}
                onClick={() => handleSelectAnswer(index)}
                disabled={showResult}
                className={`w-full justify-start text-left h-auto py-3 px-4 ${extraClasses}`}
              >
                <span className="flex items-center gap-3 w-full">
                  <span className="w-6 h-6 rounded-full border flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1">{option}</span>
                  {showResult && isCorrectAnswer && (
                    <CheckCircle className="h-5 w-5 text-white flex-shrink-0" />
                  )}
                  {showResult && isSelected && !isCorrectAnswer && (
                    <XCircle className="h-5 w-5 text-white flex-shrink-0" />
                  )}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Explanation */}
        {showResult && (
          <div
            className={`p-4 rounded-lg ${
              isCorrect ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-500">Correct!</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-red-500">Incorrect</span>
                </>
              )}
            </div>
            <p className="text-sm">{currentQuestion.explanation}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        {showResult ? (
          <Button onClick={handleNext} className="gap-1">
            {currentIndex < questions.length - 1 ? (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            ) : (
              'Finish Quiz'
            )}
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={selectedAnswer === null}
          >
            Check Answer
          </Button>
        )}
      </div>
    </div>
  );
};

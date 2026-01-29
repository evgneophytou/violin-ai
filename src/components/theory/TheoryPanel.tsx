'use client';

import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TheoryQuiz } from './TheoryQuiz';
import {
  BookOpen,
  Lightbulb,
  Music2,
  GraduationCap,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import {
  THEORY_LESSONS,
  getAvailableTopics,
  generateQuizQuestions,
  generateContextualLesson,
} from '@/lib/ai/music-theory-agent';
import { FEATURES, EVENTS, trackEvent } from '@/lib/analytics/tracking';
import type { TheoryTopic, TheoryLesson, Exercise } from '@/types';

interface TheoryPanelProps {
  currentExercise?: Exercise | null;
  className?: string;
}

const TOPIC_LABELS: Record<TheoryTopic, string> = {
  scales: 'Scales',
  intervals: 'Intervals',
  keys: 'Keys',
  rhythm: 'Rhythm',
  dynamics: 'Dynamics',
  articulation: 'Articulation',
  chords: 'Chords',
};

const TOPIC_ICONS: Record<TheoryTopic, string> = {
  scales: '🎵',
  intervals: '↔️',
  keys: '🔑',
  rhythm: '🥁',
  dynamics: '📢',
  articulation: '✏️',
  chords: '🎹',
};

export const TheoryPanel = ({ currentExercise, className }: TheoryPanelProps) => {
  const [selectedTopic, setSelectedTopic] = useState<TheoryTopic>('scales');
  const [showQuiz, setShowQuiz] = useState(false);
  const [completedTopics, setCompletedTopics] = useState<Set<TheoryTopic>>(new Set());
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number } | null>(null);

  const topics = getAvailableTopics();
  
  // Get contextual or regular lesson
  const currentLesson: TheoryLesson = currentExercise
    ? generateContextualLesson(currentExercise.metadata)
    : THEORY_LESSONS[selectedTopic];

  const handleTopicSelect = useCallback((topic: TheoryTopic) => {
    // Track topic selection
    trackEvent(EVENTS.THEORY_TOPIC_SELECTED, FEATURES.THEORY, {
      topic,
    });
    
    setSelectedTopic(topic);
    setShowQuiz(false);
    setQuizScore(null);
  }, []);

  const handleStartQuiz = useCallback(() => {
    setShowQuiz(true);
    setQuizScore(null);
  }, []);

  const handleQuizComplete = useCallback((correct: number, total: number) => {
    // Track quiz completion
    trackEvent(EVENTS.THEORY_QUIZ_COMPLETED, FEATURES.THEORY, {
      topic: selectedTopic,
      score: correct,
      count: total,
    });
    
    setQuizScore({ correct, total });
    if (correct === total) {
      setCompletedTopics((prev) => new Set([...prev, selectedTopic]));
    }
  }, [selectedTopic]);

  const quizQuestions = generateQuizQuestions(selectedTopic, 10);

  return (
    <Card className={className}>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            <span>Music Theory</span>
          </div>
          {currentExercise && (
            <Badge variant="secondary" className="gap-1">
              <Music2 className="h-3 w-3" />
              Contextual
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={selectedTopic} onValueChange={(v) => handleTopicSelect(v as TheoryTopic)}>
          {/* Topic Tabs */}
          <div className="px-4 pb-2">
            <ScrollArea className="w-full">
              <TabsList className="inline-flex h-9 w-max">
                {topics.map((topic) => (
                  <TabsTrigger
                    key={topic}
                    value={topic}
                    className="gap-1 text-xs"
                  >
                    <span>{TOPIC_ICONS[topic]}</span>
                    <span className="hidden sm:inline">{TOPIC_LABELS[topic]}</span>
                    {completedTopics.has(topic) && (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
          </div>

          <Separator />

          {/* Content Area */}
          {topics.map((topic) => (
            <TabsContent key={topic} value={topic} className="mt-0 p-0">
              {showQuiz ? (
                <div className="p-4">
                  <TheoryQuiz
                    questions={quizQuestions}
                    onComplete={handleQuizComplete}
                    onBack={() => setShowQuiz(false)}
                  />
                  {quizScore && (
                    <div className="mt-4 p-4 rounded-lg bg-muted text-center">
                      <p className="text-lg font-bold">
                        Score: {quizScore.correct}/{quizScore.total}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {quizScore.correct === quizScore.total
                          ? '🎉 Perfect! Topic mastered!'
                          : 'Keep practicing to improve!'}
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setShowQuiz(false)}
                        className="mt-2"
                      >
                        Back to Lesson
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="p-4 space-y-4">
                    {/* Lesson Title */}
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        {currentLesson.title}
                      </h3>
                    </div>

                    {/* Lesson Content */}
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {currentLesson.content.split('\n').map((paragraph, i) => {
                        if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                          return (
                            <h4 key={i} className="font-semibold mt-4">
                              {paragraph.slice(2, -2)}
                            </h4>
                          );
                        }
                        if (paragraph.startsWith('- ')) {
                          return (
                            <li key={i} className="ml-4">
                              {paragraph.slice(2)}
                            </li>
                          );
                        }
                        if (paragraph.trim()) {
                          return <p key={i}>{paragraph}</p>;
                        }
                        return null;
                      })}
                    </div>

                    {/* Examples */}
                    {currentLesson.examples.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Music2 className="h-4 w-4" />
                            Examples
                          </h4>
                          {currentLesson.examples.map((example, i) => (
                            <div
                              key={i}
                              className="p-3 rounded-lg bg-muted/50 space-y-1"
                            >
                              <p className="font-medium text-sm">
                                {example.description}
                              </p>
                              {example.notation && (
                                <p className="font-mono text-xs bg-background p-2 rounded">
                                  {example.notation}
                                </p>
                              )}
                              {example.audioDescription && (
                                <p className="text-xs text-muted-foreground">
                                  💡 {example.audioDescription}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Key Takeaways */}
                    {currentLesson.keyTakeaways.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-yellow-500" />
                            Key Takeaways
                          </h4>
                          <ul className="space-y-1">
                            {currentLesson.keyTakeaways.map((takeaway, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-sm"
                              >
                                <ChevronRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                                <span>{takeaway}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}

                    {/* Related Topics */}
                    {currentLesson.relatedTopics.length > 0 && (
                      <>
                        <Separator />
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-muted-foreground">
                            Related:
                          </span>
                          {currentLesson.relatedTopics.map((related) => (
                            <Button
                              key={related}
                              variant="outline"
                              size="sm"
                              onClick={() => handleTopicSelect(related)}
                              className="h-7 text-xs"
                            >
                              {TOPIC_ICONS[related]} {TOPIC_LABELS[related]}
                            </Button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Quiz Button */}
                    <div className="pt-4">
                      <Button
                        onClick={handleStartQuiz}
                        className="w-full gap-2"
                      >
                        <GraduationCap className="h-4 w-4" />
                        Test Your Knowledge
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

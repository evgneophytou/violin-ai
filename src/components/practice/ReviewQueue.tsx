'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Clock, Calendar, ChevronRight, RefreshCw } from 'lucide-react';
import { RATING_LABELS, type Rating } from '@/lib/ai/spaced-repetition-types';
import type { ReviewItem } from '@prisma/client';

interface ReviewQueueProps {
  dueItems: ReviewItem[];
  upcomingItems: ReviewItem[];
  stats: {
    dueToday: number;
    dueThisWeek: number;
    totalItems: number;
    avgRetention: number;
  };
  onStartReview: (item: ReviewItem) => void;
  onRateItem?: (item: ReviewItem, rating: Rating) => void;
  isLoading?: boolean;
}

export const ReviewQueue = ({
  dueItems,
  upcomingItems,
  stats,
  onStartReview,
  onRateItem,
  isLoading = false,
}: ReviewQueueProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setCurrentTime(new Date());
  }, []);

  const formatDate = useMemo(() => (date: Date | string) => {
    if (!currentTime) return '...';
    const d = new Date(date);
    const diffDays = Math.ceil((d.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Now';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return d.toLocaleDateString();
  }, [currentTime]);

  const getRetentionColor = (retention: number) => {
    if (retention >= 0.9) return 'text-green-500';
    if (retention >= 0.7) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Spaced Repetition
          </span>
          {stats.dueToday > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {stats.dueToday} due now
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 bg-secondary/30 rounded-lg">
            <p className="text-xl font-bold">{stats.dueToday}</p>
            <p className="text-xs text-muted-foreground">Due Today</p>
          </div>
          <div className="text-center p-2 bg-secondary/30 rounded-lg">
            <p className="text-xl font-bold">{stats.dueThisWeek}</p>
            <p className="text-xs text-muted-foreground">This Week</p>
          </div>
          <div className="text-center p-2 bg-secondary/30 rounded-lg">
            <p className="text-xl font-bold">{stats.totalItems}</p>
            <p className="text-xs text-muted-foreground">Total Items</p>
          </div>
          <div className="text-center p-2 bg-secondary/30 rounded-lg">
            <p className={`text-xl font-bold ${getRetentionColor(stats.avgRetention / 100)}`}>
              {stats.avgRetention}%
            </p>
            <p className="text-xs text-muted-foreground">Retention</p>
          </div>
        </div>

        {/* Due Items */}
        {dueItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-destructive" />
              Ready for Review
            </h4>
            <ScrollArea className="h-[150px]">
              <div className="space-y-2 pr-4">
                {dueItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.itemName || item.itemKey}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.itemType}
                        </Badge>
                        <span>•</span>
                        <span className={getRetentionColor(item.retrievability)}>
                          {Math.round(item.retrievability * 100)}% retention
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onStartReview(item)}
                      disabled={isLoading}
                      className="ml-2"
                    >
                      Practice
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Upcoming Items */}
        {upcomingItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Coming Up
            </h4>
            <ScrollArea className="h-[120px]">
              <div className="space-y-1 pr-4">
                {upcomingItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-lg text-sm"
                  >
                    <span className="truncate text-muted-foreground">
                      {item.itemName || item.itemKey}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                      {formatDate(item.nextReview)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Empty State */}
        {dueItems.length === 0 && upcomingItems.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No items to review yet</p>
            <p className="text-xs">Complete exercises to add them to your review queue</p>
          </div>
        )}

        {/* No items due */}
        {dueItems.length === 0 && stats.totalItems > 0 && (
          <div className="text-center py-4 text-muted-foreground bg-secondary/20 rounded-lg">
            <p className="text-sm font-medium">All caught up! 🎉</p>
            <p className="text-xs">Next review: {upcomingItems[0] ? formatDate(upcomingItems[0].nextReview) : 'None scheduled'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Rating buttons component for after practicing
interface RatingButtonsProps {
  onRate: (rating: Rating) => void;
  disabled?: boolean;
}

export const RatingButtons = ({ onRate, disabled = false }: RatingButtonsProps) => {
  const ratings: Rating[] = [1, 2, 3, 4];
  
  return (
    <div className="space-y-2">
      <p className="text-sm text-center text-muted-foreground">How did it go?</p>
      <div className="grid grid-cols-4 gap-2">
        {ratings.map((rating) => {
          const { label, description, color } = RATING_LABELS[rating];
          const variant = color === 'destructive' ? 'destructive' 
            : color === 'success' ? 'default' 
            : color === 'warning' ? 'secondary' 
            : 'outline';
          
          return (
            <Button
              key={rating}
              variant={variant as 'default' | 'destructive' | 'outline' | 'secondary'}
              size="sm"
              onClick={() => onRate(rating)}
              disabled={disabled}
              className="flex flex-col h-auto py-2"
            >
              <span className="font-bold">{label}</span>
              <span className="text-xs font-normal opacity-80 hidden sm:block">
                {description}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

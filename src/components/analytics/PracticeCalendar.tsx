'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { format, subDays, eachDayOfInterval, startOfWeek, getDay } from 'date-fns';

interface CalendarData {
  date: string;
  level: number;
  minutes: number;
}

interface PracticeCalendarProps {
  data: CalendarData[];
  months?: number;
}

export const PracticeCalendar = ({ data, months = 4 }: PracticeCalendarProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setCurrentDate(new Date());
  }, []);

  const { weeks, monthLabels } = useMemo(() => {
    if (!currentDate) {
      return { weeks: [], monthLabels: [] };
    }
    const endDate = currentDate;
    const startDate = subDays(endDate, months * 30);
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Create a map of date -> data
    const dataMap = new Map(data.map(d => [d.date, d]));
    
    // Group days into weeks
    const weeks: Array<Array<{ date: Date; level: number; minutes: number }>> = [];
    let currentWeek: Array<{ date: Date; level: number; minutes: number }> = [];
    
    // Pad the first week with empty days
    const firstDayOfWeek = getDay(allDays[0]);
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: new Date(0), level: -1, minutes: 0 });
    }
    
    for (const day of allDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayData = dataMap.get(dateStr);
      
      currentWeek.push({
        date: day,
        level: dayData?.level ?? 0,
        minutes: dayData?.minutes ?? 0,
      });
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    
    // Add remaining days
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    // Generate month labels
    const monthLabels: Array<{ label: string; weekIndex: number }> = [];
    let lastMonth = -1;
    
    weeks.forEach((week, weekIndex) => {
      const firstValidDay = week.find(d => d.level >= 0);
      if (firstValidDay && firstValidDay.date.getTime() > 0) {
        const month = firstValidDay.date.getMonth();
        if (month !== lastMonth) {
          monthLabels.push({
            label: format(firstValidDay.date, 'MMM'),
            weekIndex,
          });
          lastMonth = month;
        }
      }
    });
    
    return { weeks, monthLabels };
  }, [data, months, currentDate]);

  const levelColors = [
    'bg-secondary',           // 0 - no practice
    'bg-green-200 dark:bg-green-900',  // 1 - < 15 min
    'bg-green-400 dark:bg-green-700',  // 2 - 15-30 min
    'bg-green-500 dark:bg-green-600',  // 3 - 30-60 min
    'bg-green-600 dark:bg-green-500',  // 4 - 60+ min
  ];

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!isMounted) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Practice Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 flex items-center justify-center text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Practice Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Month labels */}
          <div className="flex mb-1 ml-8">
            {monthLabels.map(({ label, weekIndex }, i) => (
              <div
                key={i}
                className="text-xs text-muted-foreground"
                style={{ marginLeft: i === 0 ? `${weekIndex * 14}px` : '28px' }}
              >
                {label}
              </div>
            ))}
          </div>
          
          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              {dayLabels.map((label, i) => (
                <div
                  key={label}
                  className="h-3 w-6 text-xs text-muted-foreground flex items-center"
                  style={{ visibility: i % 2 === 1 ? 'visible' : 'hidden' }}
                >
                  {label[0]}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-0.5" role="row">
                {week.map((day, dayIndex) => {
                  const isValidDay = day.level >= 0 && day.date.getTime() > 0;
                  const dateLabel = isValidDay 
                    ? `${format(day.date, 'MMM d, yyyy')}: ${day.minutes} minutes practiced`
                    : '';
                  
                  return (
                    <div
                      key={dayIndex}
                      className={`h-3 w-3 rounded-sm ${
                        day.level < 0 ? 'bg-transparent' : levelColors[day.level]
                      } ${day.level > 0 ? 'cursor-pointer' : ''}`}
                      title={dateLabel}
                      role={isValidDay ? 'gridcell' : undefined}
                      aria-label={dateLabel || undefined}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-3 text-xs text-muted-foreground">
            <span>Less</span>
            {levelColors.map((color, i) => (
              <div
                key={i}
                className={`h-3 w-3 rounded-sm ${color}`}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

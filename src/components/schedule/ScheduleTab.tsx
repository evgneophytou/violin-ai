'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  Target,
  Music,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  Circle,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import {
  createPracticePlanner,
  PracticePlanner,
  DailyPlan,
  WeeklyPlan,
  PracticeGoal,
  PracticeActivity,
} from '@/lib/ai/practice-planner-agent';

// Day names
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Activity type colors
const ACTIVITY_COLORS: Record<string, string> = {
  warmup: 'bg-yellow-500',
  scales: 'bg-blue-500',
  technique: 'bg-purple-500',
  etudes: 'bg-pink-500',
  repertoire: 'bg-green-500',
  sight_reading: 'bg-orange-500',
  review: 'bg-cyan-500',
  cool_down: 'bg-slate-400',
};

// Activity icons
const getActivityIcon = (type: string) => {
  switch (type) {
    case 'warmup':
    case 'cool_down':
      return '🎵';
    case 'scales':
      return '🎼';
    case 'technique':
      return '✋';
    case 'repertoire':
      return '📖';
    case 'sight_reading':
      return '👁️';
    case 'review':
      return '🔄';
    default:
      return '🎻';
  }
};

// Daily Plan Card Component
const DailyPlanCard = ({
  plan,
  isToday,
  onActivityComplete,
}: {
  plan: DailyPlan;
  isToday: boolean;
  onActivityComplete: (activityId: string) => void;
}) => {
  const [completedActivities, setCompletedActivities] = useState<string[]>([]);

  const handleToggleActivity = (activityId: string) => {
    setCompletedActivities((prev) =>
      prev.includes(activityId)
        ? prev.filter((id) => id !== activityId)
        : [...prev, activityId]
    );
    onActivityComplete(activityId);
  };

  const progress = plan.activities.length > 0
    ? (completedActivities.length / plan.activities.length) * 100
    : 0;

  const dayName = DAY_NAMES[plan.dayOfWeek];
  const dateStr = new Date(plan.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  if (plan.totalMinutes === 0) {
    return (
      <Card className={`${isToday ? 'border-primary' : ''}`}>
        <CardContent className="p-4 text-center">
          <div className="font-medium">{dayName}</div>
          <div className="text-sm text-muted-foreground">{dateStr}</div>
          <div className="mt-4 text-muted-foreground text-sm">Rest Day</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${isToday ? 'border-primary ring-2 ring-primary/20' : ''} overflow-hidden`}>
      <CardHeader className="py-3 px-3 overflow-hidden">
        <div className="flex items-center justify-between gap-1">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm">{dayName}</CardTitle>
            <CardDescription>{dateStr}</CardDescription>
          </div>
          <Badge variant={isToday ? 'default' : 'secondary'} className="flex-shrink-0 text-xs">
            {plan.totalMinutes}min
          </Badge>
        </div>
        {plan.focusTheme && (
          <div className="overflow-hidden mt-1">
            <Badge variant="outline" className="text-[10px] inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
              {plan.focusTheme}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <Progress value={progress} className="h-1" />
        
        <div className="space-y-1">
          {plan.activities.map((activity) => (
            <div
              key={activity.id}
              className={`flex items-center gap-1.5 p-1.5 rounded cursor-pointer transition-colors ${
                completedActivities.includes(activity.id)
                  ? 'bg-green-50 dark:bg-green-950'
                  : 'hover:bg-muted'
              }`}
              onClick={() => handleToggleActivity(activity.id)}
            >
              {completedActivities.includes(activity.id) ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              )}
              <span className="text-xs flex-1 min-w-0 truncate">{activity.name}</span>
              <span className="text-[10px] text-muted-foreground flex-shrink-0">{activity.duration}m</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Goal Input Component
const GoalInput = ({
  onAddGoal,
}: {
  onAddGoal: (goal: Omit<PracticeGoal, 'id' | 'progress'>) => void;
}) => {
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PracticeGoal['type']>('general');
  const [priority, setPriority] = useState<PracticeGoal['priority']>('medium');

  const handleSubmit = () => {
    if (!description.trim()) return;
    
    onAddGoal({
      type,
      description: description.trim(),
      priority,
    });
    
    setDescription('');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          Add Goal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="What do you want to achieve?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        
        <div className="flex gap-2">
          <select
            className="flex-1 px-3 py-2 rounded-md border bg-background text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as PracticeGoal['type'])}
          >
            <option value="general">General</option>
            <option value="technique">Technique</option>
            <option value="repertoire">Repertoire</option>
            <option value="exam">Exam Prep</option>
          </select>
          
          <select
            className="flex-1 px-3 py-2 rounded-md border bg-background text-sm"
            value={priority}
            onChange={(e) => setPriority(e.target.value as PracticeGoal['priority'])}
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
        </div>
        
        <Button onClick={handleSubmit} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Add Goal
        </Button>
      </CardContent>
    </Card>
  );
};

// Settings Panel Component
const SettingsPanel = ({
  minutesPerDay,
  onMinutesChange,
  availableDays,
  onDaysChange,
  level,
  onLevelChange,
}: {
  minutesPerDay: number;
  onMinutesChange: (minutes: number) => void;
  availableDays: number[];
  onDaysChange: (days: number[]) => void;
  level: number;
  onLevelChange: (level: number) => void;
}) => {
  const toggleDay = (day: number) => {
    if (availableDays.includes(day)) {
      onDaysChange(availableDays.filter((d) => d !== day));
    } else {
      onDaysChange([...availableDays, day].sort());
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Schedule Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Practice Time */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Daily Practice Time</span>
            <span className="text-sm text-muted-foreground">{minutesPerDay} min</span>
          </div>
          <Slider
            value={[minutesPerDay]}
            onValueChange={([v]) => onMinutesChange(v)}
            min={15}
            max={180}
            step={15}
          />
        </div>

        {/* Available Days */}
        <div>
          <span className="text-sm font-medium block mb-2">Practice Days</span>
          <div className="flex gap-1">
            {DAY_NAMES.map((name, idx) => (
              <Button
                key={idx}
                variant={availableDays.includes(idx) ? 'default' : 'outline'}
                size="sm"
                className="flex-1 p-1 text-xs"
                onClick={() => toggleDay(idx)}
              >
                {name[0]}
              </Button>
            ))}
          </div>
        </div>

        {/* Skill Level */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Skill Level</span>
            <span className="text-sm text-muted-foreground">{level}/10</span>
          </div>
          <Slider
            value={[level]}
            onValueChange={([v]) => onLevelChange(v)}
            min={1}
            max={10}
            step={1}
          />
        </div>
      </CardContent>
    </Card>
  );
};

// Main Schedule Tab Component
export const ScheduleTab = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [minutesPerDay, setMinutesPerDay] = useState(60);
  const [availableDays, setAvailableDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [level, setLevel] = useState(5);
  const [goals, setGoals] = useState<PracticeGoal[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Generate weekly plan when settings change
  useEffect(() => {
    if (!isMounted) return;

    const planner = createPracticePlanner({
      goals,
      constraints: {
        availableDays,
        minutesPerDay,
      },
      assessment: {
        level,
        strengths: [],
        weaknesses: [],
        recentFocusAreas: [],
      },
    });

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + weekOffset * 7);
    // Move to start of week (Sunday)
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const plan = planner.generateWeeklyPlan(startDate);
    setWeeklyPlan(plan);
  }, [isMounted, minutesPerDay, availableDays, level, goals, weekOffset]);

  const handleAddGoal = (goalData: Omit<PracticeGoal, 'id' | 'progress'>) => {
    const newGoal: PracticeGoal = {
      ...goalData,
      id: `goal_${Date.now()}`,
      progress: 0,
    };
    setGoals((prev) => [...prev, newGoal]);
  };

  const handleRemoveGoal = (goalId: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  const handleActivityComplete = (activityId: string) => {
    // Track completed activities
    console.log('Activity completed:', activityId);
  };

  if (!isMounted) {
    return null;
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{weeklyPlan?.totalMinutes || 0}</p>
            <p className="text-xs text-muted-foreground">Minutes This Week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{goals.length}</p>
            <p className="text-xs text-muted-foreground">Active Goals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-6 w-6 mx-auto mb-1 text-purple-500" />
            <p className="text-2xl font-bold">{availableDays.length}</p>
            <p className="text-xs text-muted-foreground">Practice Days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Settings & Goals */}
        <div className="space-y-4">
          <SettingsPanel
            minutesPerDay={minutesPerDay}
            onMinutesChange={setMinutesPerDay}
            availableDays={availableDays}
            onDaysChange={setAvailableDays}
            level={level}
            onLevelChange={setLevel}
          />

          <GoalInput onAddGoal={handleAddGoal} />

          {/* Goals List */}
          {goals.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Your Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {goals.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between p-2 bg-muted rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            goal.priority === 'high'
                              ? 'destructive'
                              : goal.priority === 'medium'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {goal.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {goal.type}
                        </Badge>
                      </div>
                      <p className="text-sm mt-1">{goal.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemoveGoal(goal.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Weekly Schedule */}
        <div className="lg:col-span-2 space-y-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset((prev) => prev - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="text-center">
              <h3 className="font-medium">
                {weeklyPlan?.weekStartDate && weeklyPlan?.weekEndDate
                  ? `${new Date(weeklyPlan.weekStartDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })} - ${new Date(weeklyPlan.weekEndDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}`
                  : 'Loading...'}
              </h3>
              {weekOffset === 0 && (
                <Badge variant="secondary" className="text-xs">
                  This Week
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset((prev) => prev + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Weekly Goals */}
          {weeklyPlan && weeklyPlan.weeklyGoals.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Weekly Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3">
                <ul className="space-y-1">
                  {weeklyPlan.weeklyGoals.map((goal, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                      <Circle className="h-2 w-2 flex-shrink-0" />
                      {goal}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Daily Plans Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {weeklyPlan?.dailyPlans.map((plan) => (
              <DailyPlanCard
                key={plan.date}
                plan={plan}
                isToday={plan.date === today}
                onActivityComplete={handleActivityComplete}
              />
            ))}
          </div>

          {/* Focus Distribution */}
          {weeklyPlan && Object.keys(weeklyPlan.focusDistribution).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Time Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(weeklyPlan.focusDistribution).map(([area, minutes]) => (
                    <Badge
                      key={area}
                      variant="outline"
                      className={`${ACTIVITY_COLORS[area] || 'bg-gray-500'} bg-opacity-20`}
                    >
                      {getActivityIcon(area)} {area.replace(/_/g, ' ')}: {minutes}m
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleTab;

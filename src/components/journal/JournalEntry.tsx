'use client';

import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Save,
  X,
  Sparkles,
  Clock,
  Target,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';
import { MOOD_LABELS, ENERGY_LABELS } from '@/stores/journal-store';
import type { JournalEntry as JournalEntryType } from '@/types';

interface JournalEntryProps {
  entry?: JournalEntryType;
  isNew?: boolean;
  onSave: (data: Partial<JournalEntryType> & { generateSummary?: boolean }) => Promise<void>;
  onCancel?: () => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

export const JournalEntryForm = ({
  entry,
  isNew = false,
  onSave,
  onCancel,
  onDelete,
  isLoading = false,
}: JournalEntryProps) => {
  const [content, setContent] = useState(entry?.content || '');
  const [mood, setMood] = useState(entry?.mood || 3);
  const [energy, setEnergy] = useState(entry?.energy || 3);
  const [goals, setGoals] = useState<string[]>(entry?.goals || []);
  const [newGoal, setNewGoal] = useState('');
  const [practiceMinutes, setPracticeMinutes] = useState(entry?.practiceMinutes || 0);
  const [generateSummary, setGenerateSummary] = useState(true);

  const handleAddGoal = useCallback(() => {
    if (newGoal.trim()) {
      setGoals((prev) => [...prev, newGoal.trim()]);
      setNewGoal('');
    }
  }, [newGoal]);

  const handleRemoveGoal = useCallback((index: number) => {
    setGoals((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleToggleGoal = useCallback((index: number) => {
    setGoals((prev) =>
      prev.map((goal, i) =>
        i === index
          ? goal.startsWith('✓ ')
            ? goal.slice(2)
            : `✓ ${goal}`
          : goal
      )
    );
  }, []);

  const handleSave = useCallback(async () => {
    await onSave({
      id: entry?.id,
      content,
      mood,
      energy,
      goals,
      practiceMinutes,
      generateSummary: isNew && generateSummary,
    });
  }, [entry?.id, content, mood, energy, goals, practiceMinutes, isNew, generateSummary, onSave]);

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{isNew ? 'New Journal Entry' : 'Edit Entry'}</span>
          <div className="flex items-center gap-2">
            {entry?.aiSummary && (
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AI Summary
              </Badge>
            )}
            <Badge variant="outline" suppressHydrationWarning>
              {new Date(entry?.date || Date.now()).toLocaleDateString()}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Summary Display */}
        {entry?.aiSummary && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 text-sm font-medium mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Summary
            </div>
            <p className="text-sm text-muted-foreground">{entry.aiSummary}</p>
          </div>
        )}

        {/* Mood & Energy */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Mood</label>
            <div className="flex gap-1">
              {MOOD_LABELS.map((emoji, index) => (
                <Button
                  key={index}
                  variant={mood === index + 1 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMood(index + 1)}
                  className="flex-1 text-lg"
                  aria-label={`Mood ${index + 1}`}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Energy</label>
            <div className="flex gap-1">
              {ENERGY_LABELS.map((emoji, index) => (
                <Button
                  key={index}
                  variant={energy === index + 1 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEnergy(index + 1)}
                  className="flex-1 text-lg"
                  aria-label={`Energy ${index + 1}`}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Practice Time */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Practice Time (minutes)
          </label>
          <input
            type="number"
            value={practiceMinutes}
            onChange={(e) => setPracticeMinutes(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            min={0}
            placeholder="30"
          />
        </div>

        {/* Goals */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Practice Goals
          </label>
          <div className="space-y-2">
            {goals.map((goal, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
              >
                <button
                  onClick={() => handleToggleGoal(index)}
                  className={`flex-1 text-left text-sm ${
                    goal.startsWith('✓ ') ? 'line-through text-muted-foreground' : ''
                  }`}
                >
                  {goal}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveGoal(index)}
                  className="h-6 w-6"
                  aria-label="Remove goal"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddGoal();
                  }
                }}
                className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                placeholder="Add a practice goal..."
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleAddGoal}
                disabled={!newGoal.trim()}
                aria-label="Add goal"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Content */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Notes</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[150px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
            placeholder="What did you practice today? How did it go? Any breakthroughs or challenges?"
          />
        </div>

        {/* Generate Summary Option (for new entries) */}
        {isNew && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={generateSummary}
              onChange={(e) => setGenerateSummary(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Generate AI summary
            </span>
          </label>
        )}

        {/* Actions */}
        <div className="flex justify-between">
          <div>
            {entry && onDelete && (
              <Button
                variant="ghost"
                onClick={() => onDelete(entry.id)}
                className="text-destructive gap-1"
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSave} disabled={!content.trim() || isLoading} className="gap-1">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

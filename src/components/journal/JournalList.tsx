'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { JournalEntryForm } from './JournalEntry';
import {
  BookOpen,
  Plus,
  Calendar,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useJournalStore, getMoodLabel, getEnergyLabel } from '@/stores/journal-store';
import { FEATURES, EVENTS, trackEvent } from '@/lib/analytics/tracking';
import type { JournalEntry } from '@/types';

interface JournalListProps {
  className?: string;
}

// Format date consistently to avoid hydration mismatch
const formatShortDate = (date: Date): string => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
};

const JournalEntryCard = ({
  entry,
  isSelected,
  onSelect,
}: {
  entry: JournalEntry;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const date = new Date(entry.date);
  const preview = entry.content.slice(0, 100) + (entry.content.length > 100 ? '...' : '');

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
      }`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-selected={isSelected}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          {formatShortDate(date)}
        </span>
        <div className="flex items-center gap-1">
          {entry.mood && (
            <span className="text-sm" title={`Mood: ${entry.mood}/5`}>
              {getMoodLabel(entry.mood)}
            </span>
          )}
          {entry.energy && (
            <span className="text-sm" title={`Energy: ${entry.energy}/5`}>
              {getEnergyLabel(entry.energy)}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">{preview}</p>
      <div className="flex items-center gap-2 mt-2">
        {entry.practiceMinutes && entry.practiceMinutes > 0 && (
          <Badge variant="outline" className="text-xs gap-1">
            <Clock className="h-3 w-3" />
            {entry.practiceMinutes}m
          </Badge>
        )}
        {entry.aiSummary && (
          <Badge variant="secondary" className="text-xs gap-1">
            <Sparkles className="h-3 w-3" />
          </Badge>
        )}
        {entry.goals && entry.goals.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {entry.goals.filter((g) => g.startsWith('✓')).length}/{entry.goals.length} goals
          </Badge>
        )}
      </div>
    </div>
  );
};

export const JournalList = ({ className }: JournalListProps) => {
  const {
    entries,
    selectedEntryId,
    isLoading,
    error,
    setEntries,
    addEntry,
    updateEntry,
    removeEntry,
    selectEntry,
    setIsLoading,
    setError,
  } = useJournalStore();

  const [isCreating, setIsCreating] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Set current month only on client to avoid hydration mismatch
  useEffect(() => {
    setCurrentMonth(new Date());
    setIsMounted(true);
  }, []);

  // Fetch entries on mount
  useEffect(() => {
    const fetchEntries = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/journal');
        if (response.ok) {
          const data = await response.json();
          setEntries(data.entries);
        }
      } catch (err) {
        setError('Failed to load journal entries');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntries();
  }, [setEntries, setIsLoading, setError]);

  const handleSelectEntry = useCallback((entryId: string | null) => {
    selectEntry(entryId);
    if (entryId) {
      // Track entry viewed
      trackEvent(EVENTS.JOURNAL_ENTRY_VIEWED, FEATURES.JOURNAL);
    }
  }, [selectEntry]);

  const handleSave = useCallback(
    async (data: Partial<JournalEntry> & { generateSummary?: boolean }) => {
      setIsLoading(true);
      try {
        if (data.id) {
          // Update existing entry
          const response = await fetch('/api/journal', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (response.ok) {
            const result = await response.json();
            updateEntry(data.id, result.entry);
          }
        } else {
          // Create new entry
          const response = await fetch('/api/journal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (response.ok) {
            const result = await response.json();
            addEntry(result.entry);
            setIsCreating(false);
            
            // Track entry created
            trackEvent(EVENTS.JOURNAL_ENTRY_CREATED, FEATURES.JOURNAL);
          }
        }
      } catch (err) {
        setError('Failed to save journal entry');
      } finally {
        setIsLoading(false);
      }
    },
    [addEntry, updateEntry, setIsLoading, setError]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Are you sure you want to delete this entry?')) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/journal?id=${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          removeEntry(id);
        }
      } catch (err) {
        setError('Failed to delete journal entry');
      } finally {
        setIsLoading(false);
      }
    },
    [removeEntry, setIsLoading, setError]
  );

  const selectedEntry = entries.find((e) => e.id === selectedEntryId);

  // Filter entries by current month
  const filteredEntries = currentMonth
    ? entries.filter((entry) => {
        const entryDate = new Date(entry.date);
        return (
          entryDate.getMonth() === currentMonth.getMonth() &&
          entryDate.getFullYear() === currentMonth.getFullYear()
        );
      })
    : [];

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => prev ? new Date(prev.getFullYear(), prev.getMonth() - 1) : new Date());
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => prev ? new Date(prev.getFullYear(), prev.getMonth() + 1) : new Date());
  };

  // Format date consistently to avoid hydration mismatch
  const formatMonthYear = (date: Date): string => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <div className={`grid md:grid-cols-2 gap-6 ${className}`}>
      {/* Entry List */}
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="py-3 flex-shrink-0">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <span>Practice Journal</span>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setIsCreating(true);
                handleSelectEntry(null);
              }}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              New
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 p-0">
          {/* Month Navigation */}
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} disabled={!currentMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {currentMonth ? formatMonthYear(currentMonth) : 'Loading...'}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} disabled={!currentMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Entry List */}
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-2 py-4">
              {isLoading && entries.length === 0 ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2" />
                  <p>No entries this month</p>
                  <Button
                    variant="link"
                    onClick={() => setIsCreating(true)}
                    className="mt-2"
                  >
                    Create your first entry
                  </Button>
                </div>
              ) : (
                filteredEntries.map((entry) => (
                  <JournalEntryCard
                    key={entry.id}
                    entry={entry}
                    isSelected={selectedEntryId === entry.id}
                    onSelect={() => {
                      handleSelectEntry(entry.id);
                      setIsCreating(false);
                    }}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Stats Footer */}
          <div className="px-4 py-2 border-t text-xs text-muted-foreground">
            {filteredEntries.length} entries this month •{' '}
            {filteredEntries.reduce((sum, e) => sum + (e.practiceMinutes || 0), 0)} total minutes
          </div>
        </CardContent>
      </Card>

      {/* Entry Editor */}
      <div>
        {isCreating ? (
          <JournalEntryForm
            isNew
            onSave={handleSave}
            onCancel={() => setIsCreating(false)}
            isLoading={isLoading}
          />
        ) : selectedEntry ? (
          <JournalEntryForm
            entry={selectedEntry}
            onSave={handleSave}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        ) : (
          <Card className="h-[600px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4" />
              <p>Select an entry to view or edit</p>
              <p className="text-sm mt-1">or create a new one</p>
            </div>
          </Card>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 p-4 bg-destructive text-destructive-foreground rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
};

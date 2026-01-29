'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WaveformDisplay } from './WaveformDisplay';
import {
  Mic,
  Square,
  Save,
  Trash2,
  Download,
  Star,
  StarOff,
  Clock,
  FolderOpen,
  X,
  ChevronDown,
  ChevronUp,
  ListMusic,
} from 'lucide-react';
import {
  useStudioStore,
  createTakeFromBlob,
  createRecordingFromTake,
  base64ToBlob,
} from '@/stores/studio-store';
import type { RecordingTake, Recording, Exercise } from '@/types';

interface RecordingStudioProps {
  currentExercise: Exercise | null;
  onClose?: () => void;
}

const TakeItem = ({
  take,
  isSelected,
  onSelect,
  onDelete,
  onSave,
}: {
  take: RecordingTake;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onSave: () => void;
}) => (
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
        Take {new Date(take.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          className="h-7 w-7"
          aria-label="Save take"
        >
          <Save className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="h-7 w-7 text-destructive"
          aria-label="Delete take"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>{Math.round(take.duration)}s</span>
    </div>
    {isSelected && (
      <div className="mt-2">
        <WaveformDisplay
          audioUrl={take.audioUrl}
          duration={take.duration}
          isCompact
          showControls={false}
        />
      </div>
    )}
  </div>
);

const SavedRecordingItem = ({
  recording,
  isSelected,
  onSelect,
  onDelete,
  onToggleFavorite,
  onExport,
}: {
  recording: Recording;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onExport: () => void;
}) => (
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
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm font-medium truncate flex-1">{recording.title}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="h-7 w-7"
          aria-label={recording.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {recording.isFavorite ? (
            <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
          ) : (
            <StarOff className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onExport();
          }}
          className="h-7 w-7"
          aria-label="Export recording"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="h-7 w-7 text-destructive"
          aria-label="Delete recording"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {Math.round(recording.duration)}s
      </span>
      <span>
        {new Date(recording.createdAt).toLocaleDateString()}
      </span>
    </div>
    {recording.exerciseTitle && (
      <Badge variant="outline" className="mt-2 text-xs">
        {recording.exerciseTitle}
      </Badge>
    )}
  </div>
);

export const RecordingStudio = ({ currentExercise, onClose }: RecordingStudioProps) => {
  const {
    isRecording,
    recordingDuration,
    takes,
    selectedTakeId,
    savedRecordings,
    selectedRecordingId,
    setIsRecording,
    setRecordingDuration,
    addTake,
    removeTake,
    selectTake,
    clearTakes,
    addRecording,
    removeRecording,
    selectRecording,
    toggleFavorite,
  } = useStudioStore();

  const [showSavedRecordings, setShowSavedRecordings] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [takeToSave, setTakeToSave] = useState<RecordingTake | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedTake = takes.find((t) => t.id === selectedTakeId);
  const selectedRecording = savedRecordings.find((r) => r.id === selectedRecordingId);

  // Cleanup on unmount - ensure all resources are released
  useEffect(() => {
    return () => {
      // Clear the recording timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Stop the media recorder if recording
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
      // Stop all media stream tracks to release the microphone
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Store stream reference for cleanup
      mediaStreamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const duration = (Date.now() - startTimeRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        const take = createTakeFromBlob(blob, duration);
        addTake(take);

        // Stop all tracks and clear reference
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setRecordingDuration(elapsed);
      }, 100);
    } catch (error) {
      // Clean up stream if error occurs after getting it
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error starting recording:', error);
      }
    }
  }, [addTake, setIsRecording, setRecordingDuration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  }, [setIsRecording]);

  const handleSaveTake = useCallback((take: RecordingTake) => {
    setTakeToSave(take);
    setSaveTitle(
      currentExercise
        ? `${currentExercise.metadata.title} - ${new Date().toLocaleDateString()}`
        : `Recording - ${new Date().toLocaleDateString()}`
    );
    setSaveDialogOpen(true);
  }, [currentExercise]);

  const confirmSave = useCallback(async () => {
    if (!takeToSave || !saveTitle.trim()) return;

    const recording = await createRecordingFromTake(
      takeToSave,
      saveTitle.trim(),
      currentExercise?.metadata.id,
      currentExercise?.metadata.title
    );
    addRecording(recording);
    setSaveDialogOpen(false);
    setTakeToSave(null);
    setSaveTitle('');
  }, [takeToSave, saveTitle, currentExercise, addRecording]);

  const handleExport = useCallback((recording: Recording) => {
    const blob = base64ToBlob(recording.audioData);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording.title.replace(/[^a-z0-9]/gi, '_')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3 flex-shrink-0">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            <span>Recording Studio</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showSavedRecordings ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowSavedRecordings(!showSavedRecordings)}
              className="gap-1"
            >
              <FolderOpen className="h-4 w-4" />
              Library
              {savedRecordings.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {savedRecordings.length}
                </Badge>
              )}
            </Button>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 space-y-4">
        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-4 py-4">
          {isRecording ? (
            <>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                <span className="font-mono text-lg">{formatDuration(recordingDuration)}</span>
              </div>
              <Button
                variant="destructive"
                size="lg"
                onClick={stopRecording}
                className="gap-2"
              >
                <Square className="h-5 w-5" />
                Stop
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="lg"
              onClick={startRecording}
              className="gap-2"
            >
              <Mic className="h-5 w-5" />
              Start Recording
            </Button>
          )}
        </div>

        <Separator />

        {/* Waveform Display for Selected Take/Recording */}
        {(selectedTake || selectedRecording) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedTake
                  ? `Take - ${new Date(selectedTake.timestamp).toLocaleTimeString()}`
                  : selectedRecording?.title}
              </span>
            </div>
            <WaveformDisplay
              audioUrl={
                selectedTake?.audioUrl ||
                (selectedRecording
                  ? URL.createObjectURL(base64ToBlob(selectedRecording.audioData))
                  : null)
              }
              duration={selectedTake?.duration || selectedRecording?.duration || 0}
              showControls
            />
          </div>
        )}

        <Separator />

        {/* Takes / Saved Recordings List */}
        <div className="flex-1 min-h-0">
          {showSavedRecordings ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <ListMusic className="h-4 w-4" />
                  Saved Recordings
                </span>
              </div>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-4">
                  {savedRecordings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No saved recordings yet
                    </p>
                  ) : (
                    savedRecordings.map((recording) => (
                      <SavedRecordingItem
                        key={recording.id}
                        recording={recording}
                        isSelected={selectedRecordingId === recording.id}
                        onSelect={() => {
                          selectRecording(recording.id);
                          selectTake(null);
                        }}
                        onDelete={() => removeRecording(recording.id)}
                        onToggleFavorite={() => toggleFavorite(recording.id)}
                        onExport={() => handleExport(recording)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Session Takes ({takes.length})</span>
                {takes.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearTakes}
                    className="text-destructive h-7"
                  >
                    Clear All
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-4">
                  {takes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Record a take to get started
                    </p>
                  ) : (
                    takes.map((take) => (
                      <TakeItem
                        key={take.id}
                        take={take}
                        isSelected={selectedTakeId === take.id}
                        onSelect={() => {
                          selectTake(take.id);
                          selectRecording(null);
                        }}
                        onDelete={() => removeTake(take.id)}
                        onSave={() => handleSaveTake(take)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </CardContent>

      {/* Save Dialog */}
      {saveDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="text-base">Save Recording</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="save-title" className="text-sm font-medium">
                  Title
                </label>
                <input
                  id="save-title"
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                  placeholder="Enter recording title..."
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSaveDialogOpen(false);
                    setTakeToSave(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={confirmSave} disabled={!saveTitle.trim()}>
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
};

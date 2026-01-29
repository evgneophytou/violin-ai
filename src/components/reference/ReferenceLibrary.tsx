'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Volume2,
  VolumeX,
  Heart,
  Search,
  Upload,
  ExternalLink,
  Trash2,
  Music2,
  Clock,
  Gauge,
  X,
} from 'lucide-react';
import {
  useReferenceStore,
  ReferenceRecording,
  WaveformData,
  generateWaveform,
} from '@/stores/reference-store';

// Waveform visualization component
const WaveformDisplay = ({
  waveform,
  currentTime,
  duration,
  loopStart,
  loopEnd,
  isLooping,
  onSeek,
  onLoopSelect,
  height = 80,
}: {
  waveform: WaveformData | null;
  currentTime: number;
  duration: number;
  loopStart: number;
  loopEnd: number;
  isLooping: boolean;
  onSeek: (time: number) => void;
  onLoopSelect: (start: number, end: number) => void;
  height?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  
  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveform) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width } = canvas;
    const peaks = waveform.peaks;
    const barWidth = width / peaks.length;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw loop region
    if (isLooping && loopEnd > loopStart) {
      const loopStartX = (loopStart / duration) * width;
      const loopEndX = (loopEnd / duration) * width;
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(loopStartX, 0, loopEndX - loopStartX, height);
    }
    
    // Draw waveform
    ctx.fillStyle = 'rgb(100, 116, 139)';
    const midY = height / 2;
    
    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const peakHeight = peaks[i] * height * 0.8;
      ctx.fillRect(x, midY - peakHeight / 2, barWidth - 1, peakHeight);
    }
    
    // Draw progress
    const progressX = (currentTime / duration) * width;
    ctx.fillStyle = 'rgb(59, 130, 246)';
    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      if (x > progressX) break;
      const peakHeight = peaks[i] * height * 0.8;
      ctx.fillRect(x, midY - peakHeight / 2, barWidth - 1, peakHeight);
    }
    
    // Draw playhead
    ctx.fillStyle = 'rgb(239, 68, 68)';
    ctx.fillRect(progressX - 1, 0, 2, height);
    
  }, [waveform, currentTime, duration, loopStart, loopEnd, isLooping, height]);
  
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !duration) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / canvas.width) * duration;
    onSeek(time);
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.shiftKey) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = (x / canvas.width) * duration;
      setSelectionStart(time);
      setIsDragging(true);
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || selectionStart === null) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / canvas.width) * duration;
    
    onLoopSelect(Math.min(selectionStart, time), Math.max(selectionStart, time));
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
    setSelectionStart(null);
  };
  
  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={height}
      className="w-full cursor-pointer rounded-md bg-muted"
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};

// Recording card component
const RecordingCard = ({
  recording,
  isSelected,
  onSelect,
  onToggleFavorite,
  onDelete,
}: {
  recording: ReferenceRecording;
  isSelected: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}) => {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <Card
      className={`cursor-pointer transition-colors ${
        isSelected ? 'border-primary' : 'hover:border-muted-foreground'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium line-clamp-1">{recording.title}</h4>
            <p className="text-sm text-muted-foreground">{recording.artist}</p>
            {recording.pieceName && (
              <p className="text-xs text-muted-foreground mt-1">{recording.pieceName}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
            >
              <Heart
                className={`h-4 w-4 ${
                  recording.isFavorite ? 'fill-red-500 text-red-500' : ''
                }`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs capitalize">
            {recording.source}
          </Badge>
          {recording.duration && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(recording.duration)}
            </span>
          )}
        </div>
        
        {recording.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {recording.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main Reference Library component
export const ReferenceLibrary = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadArtist, setUploadArtist] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const {
    recordings,
    selectedRecording,
    waveformCache,
    isPlaying,
    currentTime,
    playbackSpeed,
    isLooping,
    loopStart,
    loopEnd,
    referenceVolume,
    isMuted,
    selectRecording,
    toggleFavorite,
    deleteRecording,
    addRecording,
    setWaveformData,
    getWaveformData,
    setPlaying,
    setCurrentTime,
    setPlaybackSpeed,
    setLooping,
    setLoopRange,
    setReferenceVolume,
    toggleMute,
    searchRecordings,
  } = useReferenceStore();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filter recordings
  const filteredRecordings = searchQuery
    ? searchRecordings(searchQuery)
    : recordings;

  // Audio playback handling
  useEffect(() => {
    if (!selectedRecording || !audioRef.current) return;
    
    const audio = audioRef.current;
    
    if (selectedRecording.audioData) {
      audio.src = selectedRecording.audioData;
    } else if (selectedRecording.url) {
      audio.src = selectedRecording.url;
    }
    
    // Generate waveform if not cached
    if (selectedRecording.audioData && !getWaveformData(selectedRecording.id)) {
      generateWaveform(selectedRecording.audioData).then((data) => {
        setWaveformData(selectedRecording.id, data);
      });
    }
  }, [selectedRecording]);

  // Playback controls
  useEffect(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    if (isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
    
    audio.volume = isMuted ? 0 : referenceVolume;
    audio.playbackRate = playbackSpeed;
  }, [isPlaying, referenceVolume, isMuted, playbackSpeed]);

  // Time update handling
  useEffect(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      
      // Handle looping
      if (isLooping && audio.currentTime >= loopEnd && loopEnd > loopStart) {
        audio.currentTime = loopStart;
      }
    };
    
    const handleEnded = () => {
      if (isLooping && loopEnd > loopStart) {
        audio.currentTime = loopStart;
        audio.play();
      } else {
        setPlaying(false);
        setCurrentTime(0);
      }
    };
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isLooping, loopStart, loopEnd]);

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const audioData = event.target?.result as string;
      
      // Get duration
      const audio = new Audio(audioData);
      await new Promise((resolve) => {
        audio.onloadedmetadata = resolve;
      });
      
      addRecording({
        title: uploadTitle || file.name.replace(/\.[^.]+$/, ''),
        artist: uploadArtist || 'Unknown',
        source: 'upload',
        audioData,
        duration: audio.duration,
        isFavorite: false,
        tags: [],
      });
      
      setShowUpload(false);
      setUploadTitle('');
      setUploadArtist('');
    };
    
    reader.readAsDataURL(file);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isMounted) {
    return null;
  }

  const selectedWaveform = selectedRecording
    ? getWaveformData(selectedRecording.id)
    : null;

  return (
    <div className="space-y-4">
      {/* Hidden audio element */}
      <audio ref={audioRef} />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recordings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Upload Recording</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Title"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
            />
            <Input
              placeholder="Artist"
              value={uploadArtist}
              onChange={(e) => setUploadArtist(e.target.value)}
            />
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90"
            />
          </CardContent>
        </Card>
      )}

      {/* Player */}
      {selectedRecording && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{selectedRecording.title}</h3>
                <p className="text-sm text-muted-foreground">{selectedRecording.artist}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => selectRecording(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Waveform */}
            <div>
              <WaveformDisplay
                waveform={selectedWaveform}
                currentTime={currentTime}
                duration={selectedRecording.duration || 0}
                loopStart={loopStart}
                loopEnd={loopEnd}
                isLooping={isLooping}
                onSeek={handleSeek}
                onLoopSelect={setLoopRange}
              />
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Shift+drag to select loop region
              </p>
            </div>

            {/* Time display */}
            <div className="flex items-center justify-between text-sm">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(selectedRecording.duration || 0)}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleSeek(Math.max(0, currentTime - 5))}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button
                size="icon"
                onClick={() => setPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleSeek(currentTime + 5)}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
              
              <Button
                variant={isLooping ? 'default' : 'outline'}
                size="icon"
                onClick={() => setLooping(!isLooping)}
              >
                <Repeat className="h-4 w-4" />
              </Button>
            </div>

            {/* Speed and Volume */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Gauge className="h-3 w-3" />
                    Speed
                  </span>
                  <span className="text-xs">{playbackSpeed.toFixed(2)}x</span>
                </div>
                <Slider
                  value={[playbackSpeed]}
                  onValueChange={([v]) => setPlaybackSpeed(v)}
                  min={0.25}
                  max={2}
                  step={0.05}
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={toggleMute}
                  >
                    {isMuted ? (
                      <VolumeX className="h-3 w-3" />
                    ) : (
                      <Volume2 className="h-3 w-3" />
                    )}
                  </Button>
                  <span className="text-xs">{Math.round(referenceVolume * 100)}%</span>
                </div>
                <Slider
                  value={[referenceVolume]}
                  onValueChange={([v]) => setReferenceVolume(v)}
                  min={0}
                  max={1}
                  step={0.1}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recording List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecordings.map((recording) => (
          <RecordingCard
            key={recording.id}
            recording={recording}
            isSelected={selectedRecording?.id === recording.id}
            onSelect={() => selectRecording(recording)}
            onToggleFavorite={() => toggleFavorite(recording.id)}
            onDelete={() => deleteRecording(recording.id)}
          />
        ))}
      </div>

      {filteredRecordings.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Music2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No reference recordings yet.</p>
          <p className="text-sm">Upload recordings to compare with your practice.</p>
        </div>
      )}
    </div>
  );
};

export default ReferenceLibrary;

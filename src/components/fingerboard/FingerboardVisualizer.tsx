'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Settings2,
} from 'lucide-react';

// Types
interface FingerPosition {
  string: 0 | 1 | 2 | 3; // G, D, A, E
  position: number; // Position number (1-7)
  finger: 0 | 1 | 2 | 3 | 4; // 0 = open, 1-4 = fingers
  note: string;
  frequency: number;
}

interface FingerboardConfig {
  showNotes: boolean;
  showPositions: boolean;
  showFingers: boolean;
  colorByString: boolean;
  animateTransitions: boolean;
}

// Constants
const STRING_NAMES = ['G', 'D', 'A', 'E'];
const STRING_COLORS = ['#8B4513', '#CD853F', '#DAA520', '#FFD700'];
const FINGER_COLORS = ['transparent', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

// Note frequencies (equal temperament, A4 = 440Hz)
const NOTE_FREQUENCIES: Record<string, number> = {
  'G3': 196.00, 'G#3': 207.65, 'Ab3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'Bb3': 233.08,
  'B3': 246.94, 'C4': 261.63, 'C#4': 277.18, 'Db4': 277.18, 'D4': 293.66, 'D#4': 311.13,
  'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'Gb4': 369.99, 'G4': 392.00,
  'G#4': 415.30, 'Ab4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'Bb4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'Db5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'Eb5': 622.25,
  'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'Gb5': 739.99, 'G5': 783.99, 'G#5': 830.61,
  'Ab5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'Bb5': 932.33, 'B5': 987.77, 'C6': 1046.50,
};

// String open notes
const STRING_OPEN_NOTES = ['G3', 'D4', 'A4', 'E5'];

// Generate fingerboard positions (positions 1-7)
const generateFingerboardPositions = (): FingerPosition[][] => {
  const positions: FingerPosition[][] = [];
  
  const noteSequence = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  for (let stringIdx = 0; stringIdx < 4; stringIdx++) {
    const stringPositions: FingerPosition[] = [];
    const openNote = STRING_OPEN_NOTES[stringIdx];
    const openNoteName = openNote.replace(/\d/, '');
    const openOctave = parseInt(openNote.slice(-1));
    
    let noteIdx = noteSequence.indexOf(openNoteName);
    let octave = openOctave;
    
    // Open string
    stringPositions.push({
      string: stringIdx as 0 | 1 | 2 | 3,
      position: 0,
      finger: 0,
      note: openNote,
      frequency: NOTE_FREQUENCIES[openNote] || 0,
    });
    
    // Positions 1-7 (approximately 28 semitones)
    for (let i = 1; i <= 28; i++) {
      noteIdx = (noteIdx + 1) % 12;
      if (noteIdx === 0) octave++;
      
      const noteName = noteSequence[noteIdx];
      const fullNote = `${noteName}${octave}`;
      const position = Math.ceil(i / 4); // Approximate position grouping
      const finger = ((i - 1) % 4) + 1;
      
      stringPositions.push({
        string: stringIdx as 0 | 1 | 2 | 3,
        position,
        finger: finger as 1 | 2 | 3 | 4,
        note: fullNote,
        frequency: NOTE_FREQUENCIES[fullNote] || 0,
      });
    }
    
    positions.push(stringPositions);
  }
  
  return positions;
};

// Fingerboard component
export const FingerboardVisualizer = ({
  activeNotes = [],
  highlightPosition,
  onNoteClick,
}: {
  activeNotes?: string[];
  highlightPosition?: number;
  onNoteClick?: (note: string, finger: FingerPosition) => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [config, setConfig] = useState<FingerboardConfig>({
    showNotes: true,
    showPositions: true,
    showFingers: true,
    colorByString: true,
    animateTransitions: true,
  });
  const [zoom, setZoom] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [hoveredNote, setHoveredNote] = useState<FingerPosition | null>(null);
  
  const fingerboardPositions = useMemo(() => generateFingerboardPositions(), []);
  
  // Draw fingerboard
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    // Fingerboard dimensions
    const margin = 40;
    const fingerboardWidth = (width - margin * 2) * zoom;
    const fingerboardHeight = height - margin * 2;
    const startX = margin;
    const startY = margin;
    
    // Draw fingerboard background
    ctx.fillStyle = '#2d1810';
    ctx.fillRect(startX, startY, fingerboardWidth, fingerboardHeight);
    
    // Draw nut
    ctx.fillStyle = '#F5F5DC';
    ctx.fillRect(startX, startY, 8, fingerboardHeight);
    
    // String spacing
    const stringSpacing = fingerboardHeight / 5;
    
    // Draw position markers
    if (config.showPositions) {
      const positionMarkers = [3, 5, 7, 12]; // Common position markers
      ctx.fillStyle = '#4a3728';
      
      positionMarkers.forEach((pos) => {
        const x = startX + (pos / 7) * fingerboardWidth * 0.8;
        ctx.beginPath();
        ctx.arc(x, height / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    
    // Draw fret lines (position boundaries)
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 1;
    
    for (let pos = 1; pos <= 7; pos++) {
      const x = startX + 8 + (pos / 7) * (fingerboardWidth - 8) * 0.85;
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, startY + fingerboardHeight);
      ctx.stroke();
      
      // Position number
      if (config.showPositions) {
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(pos.toString(), x - 15, startY + fingerboardHeight + 15);
      }
    }
    
    // Draw strings and finger positions
    for (let stringIdx = 0; stringIdx < 4; stringIdx++) {
      const y = startY + stringSpacing * (stringIdx + 1);
      
      // Draw string
      const stringThickness = 4 - stringIdx * 0.5;
      ctx.strokeStyle = STRING_COLORS[stringIdx];
      ctx.lineWidth = stringThickness;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + fingerboardWidth, y);
      ctx.stroke();
      
      // String name
      ctx.fillStyle = '#888';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(STRING_NAMES[stringIdx], startX - 10, y + 5);
      
      // Draw finger positions
      const stringNotes = fingerboardPositions[stringIdx];
      
      stringNotes.slice(0, 15).forEach((pos, noteIdx) => {
        if (noteIdx === 0) return; // Skip open string for now
        
        const noteX = startX + 8 + (noteIdx / 15) * (fingerboardWidth - 8) * 0.85;
        const isActive = activeNotes.includes(pos.note);
        const isHovered = hoveredNote?.note === pos.note;
        
        // Draw finger dot
        const dotRadius = isActive || isHovered ? 14 : 10;
        
        if (isActive) {
          // Active note highlight
          ctx.fillStyle = config.colorByString 
            ? STRING_COLORS[stringIdx] 
            : FINGER_COLORS[pos.finger];
          ctx.shadowColor = STRING_COLORS[stringIdx];
          ctx.shadowBlur = 15;
        } else {
          ctx.fillStyle = '#3a3a4a';
          ctx.shadowBlur = 0;
        }
        
        ctx.beginPath();
        ctx.arc(noteX, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Border
        if (isActive || isHovered) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        
        // Note name
        if (config.showNotes && (isActive || isHovered || noteIdx <= 5)) {
          ctx.fillStyle = isActive ? '#fff' : '#999';
          ctx.font = `${isActive ? 'bold ' : ''}10px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(pos.note.replace(/\d/, ''), noteX, y);
        }
        
        // Finger number
        if (config.showFingers && isActive && pos.finger > 0) {
          ctx.fillStyle = '#000';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText(pos.finger.toString(), noteX, y + dotRadius + 8);
        }
      });
      
      // Open string indicator
      const openNote = stringNotes[0];
      const isOpenActive = activeNotes.includes(openNote.note);
      
      ctx.fillStyle = isOpenActive ? STRING_COLORS[stringIdx] : '#2a2a3a';
      ctx.beginPath();
      ctx.arc(startX - 25, y, 12, 0, Math.PI * 2);
      ctx.fill();
      
      if (isOpenActive) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.fillStyle = isOpenActive ? '#fff' : '#666';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(openNote.note.replace(/\d/, ''), startX - 25, y + 3);
    }
    
    // Highlight current position
    if (highlightPosition !== undefined && highlightPosition > 0) {
      const posX = startX + 8 + ((highlightPosition - 0.5) / 7) * (fingerboardWidth - 8) * 0.85;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(posX - 20, startY, 40, fingerboardHeight);
    }
    
  }, [fingerboardPositions, activeNotes, highlightPosition, config, zoom, hoveredNote]);
  
  // Mouse interaction
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Find clicked note
    const margin = 40;
    const stringSpacing = (canvas.height - margin * 2) / 5;
    const startY = margin;
    
    for (let stringIdx = 0; stringIdx < 4; stringIdx++) {
      const stringY = startY + stringSpacing * (stringIdx + 1);
      
      if (Math.abs(y - stringY) < 20) {
        const stringNotes = fingerboardPositions[stringIdx];
        const fingerboardWidth = (canvas.width - margin * 2) * zoom;
        
        for (let noteIdx = 0; noteIdx < Math.min(15, stringNotes.length); noteIdx++) {
          const noteX = margin + 8 + (noteIdx / 15) * (fingerboardWidth - 8) * 0.85;
          
          if (Math.abs(x - noteX) < 15) {
            onNoteClick?.(stringNotes[noteIdx].note, stringNotes[noteIdx]);
            return;
          }
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const margin = 40;
    const stringSpacing = (canvas.height - margin * 2) / 5;
    const startY = margin;
    
    let found = false;
    
    for (let stringIdx = 0; stringIdx < 4; stringIdx++) {
      const stringY = startY + stringSpacing * (stringIdx + 1);
      
      if (Math.abs(y - stringY) < 20) {
        const stringNotes = fingerboardPositions[stringIdx];
        const fingerboardWidth = (canvas.width - margin * 2) * zoom;
        
        for (let noteIdx = 0; noteIdx < Math.min(15, stringNotes.length); noteIdx++) {
          const noteX = margin + 8 + (noteIdx / 15) * (fingerboardWidth - 8) * 0.85;
          
          if (Math.abs(x - noteX) < 15) {
            setHoveredNote(stringNotes[noteIdx]);
            found = true;
            break;
          }
        }
      }
      if (found) break;
    }
    
    if (!found && hoveredNote) {
      setHoveredNote(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setZoom(1)}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        
        <Button
          variant={showSettings ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings2 className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <Card>
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(config).map(([key, value]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                  className="rounded"
                />
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Fingerboard canvas */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <canvas
            ref={canvasRef}
            width={800}
            height={300}
            className="w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredNote(null)}
            role="img"
            aria-label="Violin fingerboard visualization. Click on finger positions to hear notes. Shows all four strings (G, D, A, E) with finger positions marked."
            tabIndex={0}
            onKeyDown={(e) => {
              // Allow Enter/Space to interact with canvas
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                // Trigger click for keyboard interaction
                if (hoveredNote && onNoteClick) {
                  onNoteClick(hoveredNote.note, hoveredNote);
                }
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Hovered note info */}
      {hoveredNote && (
        <div className="flex items-center gap-4 text-sm">
          <Badge variant="outline" className="text-lg px-3 py-1">
            {hoveredNote.note}
          </Badge>
          <span className="text-muted-foreground">
            String: {STRING_NAMES[hoveredNote.string]} | 
            Position: {hoveredNote.position || 'Open'} | 
            Finger: {hoveredNote.finger || 'Open'}
          </span>
          {hoveredNote.frequency > 0 && (
            <span className="text-muted-foreground">
              {hoveredNote.frequency.toFixed(1)} Hz
            </span>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Strings:</span>
          {STRING_NAMES.map((name, idx) => (
            <div key={name} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: STRING_COLORS[idx] }}
              />
              <span>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FingerboardVisualizer;

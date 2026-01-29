'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { OpenSheetMusicDisplay as OSMD } from 'opensheetmusicdisplay';
import { Card } from '@/components/ui/card';

interface SheetMusicDisplayProps {
  musicXML: string | null;
  currentNoteIndex?: number;
  highlightErrors?: number[];
  className?: string;
  onReady?: () => void;
}

export const SheetMusicDisplay = ({
  musicXML,
  currentNoteIndex = -1,
  highlightErrors = [],
  className = '',
  onReady,
}: SheetMusicDisplayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OSMD | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeOSMD = useCallback(async () => {
    if (!containerRef.current || !musicXML) return;

    setIsLoading(true);
    setError(null);

    try {
      // Clean up previous instance
      if (osmdRef.current) {
        osmdRef.current.clear();
      }

      // Create new OSMD instance
      osmdRef.current = new OSMD(containerRef.current, {
        autoResize: true,
        drawTitle: true,
        drawSubtitle: false,
        drawComposer: false,
        drawCredits: false,
        drawPartNames: false,
        drawPartAbbreviations: false,
        drawingParameters: 'default',
        coloringEnabled: true,
        coloringMode: 0, // Custom coloring
        colorStemsLikeNoteheads: true,
        defaultColorNotehead: '#1a1a1a',
        defaultColorStem: '#1a1a1a',
        defaultColorRest: '#666666',
        defaultColorLabel: '#333333',
        defaultColorTitle: '#1a1a1a',
      });

      // Load the MusicXML
      await osmdRef.current.load(musicXML);
      
      // Render
      osmdRef.current.render();
      
      setIsLoading(false);
      
      if (onReady) {
        onReady();
      }
    } catch (err) {
      console.error('Error rendering sheet music:', err);
      setError('Failed to render sheet music');
      setIsLoading(false);
    }
  }, [musicXML, onReady]);

  // Initialize OSMD when musicXML changes
  useEffect(() => {
    initializeOSMD();
    
    return () => {
      if (osmdRef.current) {
        osmdRef.current.clear();
      }
    };
  }, [initializeOSMD]);

  // Highlight current note during playback
  useEffect(() => {
    if (!osmdRef.current || currentNoteIndex < 0) return;

    try {
      const cursor = osmdRef.current.cursor;
      
      // Reset cursor to beginning
      cursor.reset();
      
      // Move cursor to current note
      for (let i = 0; i < currentNoteIndex; i++) {
        cursor.next();
      }
      
      cursor.show();
    } catch (err) {
      // Cursor operations may fail silently
    }
  }, [currentNoteIndex]);

  // Highlight error notes
  useEffect(() => {
    if (!osmdRef.current || highlightErrors.length === 0) return;

    try {
      // This is a simplified approach - full implementation would
      // iterate through graphic notes and color them
      const graphicSheet = osmdRef.current.GraphicSheet;
      if (!graphicSheet) return;

      // Reset colors first
      osmdRef.current.render();

      // Note: Full note coloring requires deeper OSMD API access
      // This would be expanded in a production implementation
    } catch (err) {
      console.error('Error highlighting errors:', err);
    }
  }, [highlightErrors]);

  if (!musicXML) {
    return (
      <Card className={`flex items-center justify-center min-h-[300px] ${className}`}>
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">No music loaded</p>
          <p className="text-sm">Generate an exercise to see sheet music</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading sheet music...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 z-10">
          <div className="text-center text-destructive">
            <p className="font-medium">{error}</p>
            <p className="text-sm">Please try generating a new exercise</p>
          </div>
        </div>
      )}
      
      <div
        ref={containerRef}
        className="w-full min-h-[300px] p-4"
        aria-label="Sheet music display"
        role="img"
      />
    </Card>
  );
};

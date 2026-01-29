'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Video } from 'lucide-react';

// Dynamically import VideoAnalyzer only on client side
export const VideoTab = () => {
  const [VideoAnalyzer, setVideoAnalyzer] = useState<React.ComponentType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only load on client side
    if (typeof window === 'undefined') return;

    const loadVideoAnalyzer = async () => {
      try {
        const module = await import('./VideoAnalyzer');
        setVideoAnalyzer(() => module.VideoAnalyzer);
      } catch (err) {
        console.error('Failed to load VideoAnalyzer:', err);
        setError('Failed to load video analysis module. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadVideoAnalyzer();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Loading video analysis...</p>
              <p className="text-xs">This may take a moment on first load</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Video className="h-12 w-12" />
              <p className="text-destructive">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (VideoAnalyzer) {
    return (
      <div className="max-w-xl mx-auto">
        <VideoAnalyzer />
      </div>
    );
  }

  return null;
};

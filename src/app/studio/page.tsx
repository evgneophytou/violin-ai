'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RecordingStudio } from '@/components/studio/RecordingStudio';
import { useExerciseSession } from '@/hooks/useExerciseSession';
import { ArrowLeft, Music, Mic } from 'lucide-react';

export default function StudioPage() {
  const session = useExerciseSession();

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" aria-label="Back to practice">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Mic className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Recording Studio</h1>
                <p className="text-sm text-muted-foreground">Record, manage, and compare takes</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {session.currentExercise && (
                <Badge variant="outline" className="gap-1">
                  <Music className="h-3 w-3" />
                  {session.currentExercise.metadata.title}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <RecordingStudio currentExercise={session.currentExercise} />
        </div>
      </div>
    </main>
  );
}

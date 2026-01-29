'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SheetMusicDisplay } from '@/components/sheet-music/SheetMusicDisplay';
import { PitchVisualizer } from '@/components/audio/PitchVisualizer';
import { PlaybackControls } from '@/components/audio/PlaybackControls';
import { FeedbackPanel } from '@/components/feedback/FeedbackPanel';
import { DifficultySelector } from '@/components/difficulty/DifficultySelector';
import { AdaptiveIndicator } from '@/components/difficulty/AdaptiveIndicator';
import { StreakBadge } from '@/components/gamification/StreakBadge';
import { XPBar } from '@/components/gamification/XPBar';
import { LevelBadge } from '@/components/gamification/LevelBadge';
import { AchievementToastContainer } from '@/components/gamification/AchievementToast';
import { SmartMetronome } from '@/components/audio/SmartMetronome';
import { ReviewQueue } from '@/components/practice/ReviewQueue';
import { AnalyticsSummary } from '@/components/analytics/AnalyticsDashboard';
import { useExerciseSession } from '@/hooks/useExerciseSession';
import { SlowPracticeControls } from '@/components/practice/SlowPracticeControls';
import { ChatPanel } from '@/components/coach/ChatPanel';
import { RecordingStudio } from '@/components/studio/RecordingStudio';
import { JournalList } from '@/components/journal/JournalList';
import { TheoryPanel } from '@/components/theory/TheoryPanel';
import { ExpressionPanel } from '@/components/expression/ExpressionPanel';
import { SightReadingMode } from '@/components/sight-reading/SightReadingMode';
import { AccompanimentPlayer } from '@/components/accompaniment/AccompanimentPlayer';
import { StemPlayer } from '@/components/stems/StemPlayer';
import { ExamDashboard } from '@/components/exam/ExamDashboard';
import { Music, Mic, AlertCircle, BarChart3, Trophy, Brain, Timer, Radio, BookOpen, GraduationCap, Activity, Eye, Piano, SplitSquareVertical, Video, Award, Library, Heart, Calendar, Disc, FileMusic } from 'lucide-react';
import { VideoTab } from '@/components/video';
import { RepertoireTab } from '@/components/repertoire';
import { ReferenceLibrary } from '@/components/reference';
import { FingerboardVisualizer } from '@/components/fingerboard';
import { WellnessTab } from '@/components/wellness';
import { ScheduleTab } from '@/components/schedule';
import { PieceUploader, PieceAnalysisResults } from '@/components/piece-upload';
import { usePieceAnalysisStore } from '@/stores/piece-analysis-store';
import { FEATURES, trackFeatureView, endFeatureView, trackEvent, EVENTS, type FeatureValue } from '@/lib/analytics/tracking';
import type { Achievement, ReviewItem } from '@prisma/client';

// Map tab names to feature tracking IDs
const TAB_TO_FEATURE: Record<string, FeatureValue> = {
  'practice': FEATURES.PRACTICE,
  'sight-reading': FEATURES.SIGHT_READING,
  'studio': FEATURES.STUDIO,
  'expression': FEATURES.EXPRESSION,
  'tools': FEATURES.TOOLS,
  'journal': FEATURES.JOURNAL,
  'theory': FEATURES.THEORY,
  'review': FEATURES.REVIEW,
  'metronome': FEATURES.METRONOME,
  'technique': FEATURES.TECHNIQUE,
  'exams': FEATURES.EXAMS,
  'stats': FEATURES.STATS,
  'repertoire': FEATURES.REPERTOIRE,
  'wellness': FEATURES.WELLNESS,
  'schedule': FEATURES.SCHEDULE,
  'reference': FEATURES.REFERENCE,
  'my-pieces': FEATURES.MY_PIECES,
};

interface UserData {
  id: string;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastPracticeAt: string | null;
  totalPracticeMinutes: number;
}

// My Pieces Tab Component
const MyPiecesTab = ({ session }: { session: ReturnType<typeof useExerciseSession> }) => {
  const { currentAnalysis, savedPieces, loadPiece, uploadStatus } = usePieceAnalysisStore();
  
  const handlePracticeSection = (section: any) => {
    // Switch to practice tab and load the exercise
    // This integrates with the existing practice system
    if (section.practiceExercise) {
      // If there's a generated exercise for this section, use it
      // For now, we'll generate a new one based on the section's characteristics
      session.setFocus(section.category === 'bowing' ? 'bowing' : 
                       section.category === 'rhythm' ? 'rhythm' :
                       section.category === 'intonation' ? 'intonation' : 'mixed');
      session.setDifficulty(Math.min(10, section.difficultyScore));
      session.generateExercise();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileMusic className="h-6 w-6" />
            My Pieces
          </h2>
          <p className="text-muted-foreground">
            Upload sheet music to get AI-powered analysis and practice suggestions
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <PieceUploader />

      {/* Analysis Results */}
      {currentAnalysis && uploadStatus.state === 'complete' && (
        <PieceAnalysisResults 
          analysis={currentAnalysis}
          onPracticeSection={handlePracticeSection}
        />
      )}

      {/* Saved Pieces Library */}
      {savedPieces.length > 0 && !currentAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Library className="h-5 w-5" />
              Saved Pieces ({savedPieces.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {savedPieces.map((piece) => (
                <div
                  key={piece.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => loadPiece(piece.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') loadPiece(piece.id);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <FileMusic className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium">{piece.analysis.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {piece.analysis.composer && (
                          <span>{piece.analysis.composer}</span>
                        )}
                        <span>-</span>
                        <span>Difficulty: {piece.analysis.overallDifficulty}/10</span>
                        {piece.totalPracticeTime > 0 && (
                          <>
                            <span>-</span>
                            <span>{piece.totalPracticeTime} min practiced</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {piece.isFavorite && (
                      <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                    )}
                    <Badge variant={
                      piece.analysis.overallDifficulty <= 3 ? 'secondary' :
                      piece.analysis.overallDifficulty <= 6 ? 'default' : 'destructive'
                    }>
                      {piece.analysis.gradeLevel || `Level ${piece.analysis.overallDifficulty}`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {savedPieces.length === 0 && !currentAnalysis && uploadStatus.state === 'idle' && (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <FileMusic className="h-16 w-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No pieces yet</h3>
              <p className="text-muted-foreground">
                Upload a MusicXML, PDF, or image of sheet music to get started
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const session = useExerciseSession();
  
  // User and gamification state
  const [userData, setUserData] = useState<UserData | null>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [reviewData, setReviewData] = useState<{
    dueItems: ReviewItem[];
    upcomingItems: ReviewItem[];
    stats: { dueToday: number; dueThisWeek: number; totalItems: number; avgRetention: number };
  } | null>(null);
  const [analyticsData, setAnalyticsData] = useState<{
    dailyStats: Array<{ date: string; practiceMinutes: number; exercisesCompleted: number }>;
    overallStats: { totalPracticeMinutes: number; totalExercises: number; totalSessions: number; avgScore: number; currentStreak: number; longestStreak: number };
  } | null>(null);
  const [activeTab, setActiveTab] = useState('practice');
  const previousTabRef = useRef<string | null>(null);

  // Mark as mounted on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Track tab changes for analytics
  useEffect(() => {
    const currentFeature = TAB_TO_FEATURE[activeTab];
    const previousFeature = previousTabRef.current ? TAB_TO_FEATURE[previousTabRef.current] : null;

    // End previous feature session
    if (previousFeature && previousFeature !== currentFeature) {
      endFeatureView(previousFeature);
    }

    // Start new feature session
    if (currentFeature) {
      trackFeatureView(currentFeature);
      
      // Track tab switch event if there was a previous tab
      if (previousFeature && previousFeature !== currentFeature) {
        trackEvent(EVENTS.TAB_SWITCHED, currentFeature, {
          from_tab: previousTabRef.current,
          to_tab: activeTab,
        });
      }
    }

    previousTabRef.current = activeTab;

    // Cleanup on unmount
    return () => {
      if (currentFeature) {
        endFeatureView(currentFeature);
      }
    };
  }, [activeTab]);

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const [userRes, reviewRes, analyticsRes] = await Promise.all([
          fetch('/api/user'),
          fetch('/api/review-queue'),
          fetch('/api/analytics?days=14'),
        ]);
        
        if (userRes.ok) {
          const data = await userRes.json();
          setUserData(data.user);
        }
        
        if (reviewRes.ok) {
          const data = await reviewRes.json();
          setReviewData(data);
        }
        
        if (analyticsRes.ok) {
          const data = await analyticsRes.json();
          setAnalyticsData(data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    fetchUserData();
  }, []);

  // Initialize audio on first user interaction
  const handleInitialize = useCallback(async () => {
    await session.initializeAudio();
  }, [session]);

  // Update pitch display while recording
  useEffect(() => {
    if (session.isRecording) {
      const interval = setInterval(() => {
        session.updateCurrentPitch();
      }, 50);
      return () => clearInterval(interval);
    }
  }, [session, session.isRecording]);

  // Handle achievement dismissal
  const handleDismissAchievement = (key: string) => {
    setUnlockedAchievements(prev => prev.filter(a => a.key !== key));
  };

  // Handle review item click
  const handleStartReview = (item: ReviewItem) => {
    // Generate exercise for the review item
    session.setFocus(item.itemType as 'scales' | 'arpeggios' | 'bowing' | 'intonation' | 'rhythm' | 'mixed');
    session.generateExercise();
  };

  // Show loading skeleton on server to prevent hydration mismatch
  if (!isMounted) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <Image
                src="/brio-logo.png"
                alt="Brio Logo"
                width={48}
                height={48}
                className="h-12 w-auto"
                priority
              />
              <p className="text-sm text-muted-foreground hidden sm:block">Adaptive Practice Assistant</p>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="animate-pulse">
                <Image
                  src="/brio-logo.png"
                  alt="Brio Logo"
                  width={64}
                  height={64}
                  className="h-16 w-auto mx-auto"
                />
              </div>
              <p className="text-muted-foreground">Loading practice session...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/brio-logo.png"
                alt="Brio Logo"
                width={48}
                height={48}
                className="h-12 w-auto"
                priority
              />
              <p className="text-sm text-muted-foreground hidden sm:block">Adaptive Practice Assistant</p>
            </div>
            
            {/* User Stats in Header */}
            <div className="flex items-center gap-3">
              {userData && (
                <>
                  <StreakBadge
                    currentStreak={userData.currentStreak}
                    longestStreak={userData.longestStreak}
                    lastPracticeAt={userData.lastPracticeAt ? new Date(userData.lastPracticeAt) : null}
                    size="sm"
                  />
                  <LevelBadge level={userData.level} showTitle={false} size="sm" />
                </>
              )}
              {session.isAudioInitialized && (
                <Badge variant="secondary" className="gap-1 hidden sm:flex">
                  <Mic className="h-3 w-3" />
                  Audio Ready
                </Badge>
              )}
            </div>
          </div>
          
          {/* XP Bar */}
          {userData && (
            <div className="mt-2">
              <XPBar currentXP={userData.xp} level={userData.level} size="sm" showDetails={false} />
            </div>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Error Alert */}
        {session.error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{session.error}</p>
          </div>
        )}

        {/* Audio Initialization */}
        {!session.isAudioInitialized && (
          <Card className="mb-6">
            <CardContent className="py-8">
              <div className="text-center space-y-4">
                <Mic className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h2 className="text-lg font-semibold">Enable Audio</h2>
                  <p className="text-sm text-muted-foreground">
                    Click below to enable microphone access for recording your practice
                  </p>
                </div>
                <Button onClick={handleInitialize} size="lg" className="gap-2">
                  <Mic className="h-4 w-4" />
                  Enable Microphone
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto pb-2 mb-4 -mx-4 px-4">
            <TabsList className="inline-flex h-auto p-1 gap-1 min-w-max">
              <TabsTrigger value="practice" className="gap-2 whitespace-nowrap">
                <Music className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Practice</span>
              </TabsTrigger>
              <TabsTrigger value="sight-reading" className="gap-2 whitespace-nowrap">
                <Eye className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Sight-Read</span>
              </TabsTrigger>
              <TabsTrigger value="studio" className="gap-2 whitespace-nowrap">
                <Radio className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Studio</span>
              </TabsTrigger>
              <TabsTrigger value="expression" className="gap-2 whitespace-nowrap">
                <Activity className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Expression</span>
              </TabsTrigger>
              <TabsTrigger value="tools" className="gap-2 whitespace-nowrap">
                <Piano className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Tools</span>
              </TabsTrigger>
              <TabsTrigger value="journal" className="gap-2 whitespace-nowrap">
                <BookOpen className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Journal</span>
              </TabsTrigger>
              <TabsTrigger value="theory" className="gap-2 whitespace-nowrap">
                <GraduationCap className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Theory</span>
              </TabsTrigger>
              <TabsTrigger value="review" className="gap-2 whitespace-nowrap">
                <Brain className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Review</span>
                {reviewData && reviewData.stats.dueToday > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                    {reviewData.stats.dueToday}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="metronome" className="gap-2 whitespace-nowrap">
                <Timer className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Metronome</span>
              </TabsTrigger>
              <TabsTrigger value="video" className="gap-2 whitespace-nowrap">
                <Video className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Technique</span>
              </TabsTrigger>
              <TabsTrigger value="exams" className="gap-2 whitespace-nowrap">
                <Award className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Exams</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-2 whitespace-nowrap">
                <BarChart3 className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="repertoire" className="gap-2 whitespace-nowrap">
                <Library className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Repertoire</span>
              </TabsTrigger>
              <TabsTrigger value="wellness" className="gap-2 whitespace-nowrap">
                <Heart className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Wellness</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="gap-2 whitespace-nowrap">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Schedule</span>
              </TabsTrigger>
              <TabsTrigger value="reference" className="gap-2 whitespace-nowrap">
                <Disc className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Reference</span>
              </TabsTrigger>
              <TabsTrigger value="my-pieces" className="gap-2 whitespace-nowrap">
                <FileMusic className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">My Pieces</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Sight-Reading Tab */}
          <TabsContent value="sight-reading">
            <div className="max-w-2xl mx-auto">
              <SightReadingMode />
            </div>
          </TabsContent>

          {/* Studio Tab */}
          <TabsContent value="studio">
            <div className="max-w-4xl mx-auto">
              <RecordingStudio currentExercise={session.currentExercise} />
            </div>
          </TabsContent>

          {/* Expression Tab */}
          <TabsContent value="expression">
            <div className="max-w-2xl mx-auto">
              <ExpressionPanel />
            </div>
          </TabsContent>

          {/* Tools Tab (Accompaniment & Stems) */}
          <TabsContent value="tools">
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              <AccompanimentPlayer exercise={session.currentExercise} />
              <StemPlayer />
            </div>
          </TabsContent>

          {/* Journal Tab */}
          <TabsContent value="journal">
            <JournalList />
          </TabsContent>

          {/* Theory Tab */}
          <TabsContent value="theory">
            <div className="max-w-3xl mx-auto">
              <TheoryPanel currentExercise={session.currentExercise} />
            </div>
          </TabsContent>

          {/* Practice Tab */}
          <TabsContent value="practice">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Settings */}
              <div className="space-y-6">
                <DifficultySelector
                  difficulty={session.difficulty}
                  focus={session.focus}
                  onDifficultyChange={session.setDifficulty}
                  onFocusChange={session.setFocus}
                  disabled={session.isPlaying || session.isRecording || session.isGenerating}
                />
                
                <AdaptiveIndicator
                  currentDifficulty={session.difficulty}
                  lastAdjustment={session.lastAdjustment}
                  performanceHistory={session.performanceHistory}
                />

                {/* Slow Practice Mode */}
                {session.currentExercise && (
                  <SlowPracticeControls
                    baseTempo={session.currentExercise.metadata.tempo}
                    tempoPercent={session.tempoPercent}
                    onTempoPercentChange={session.setTempoPercent}
                    loopConfig={session.loopConfig}
                    onLoopChange={session.setLoop}
                    loopCount={session.loopCount}
                    totalMeasures={session.currentExercise.metadata.measures}
                    notes={session.currentExercise.notes}
                    isPlaying={session.isPlaying}
                    disabled={session.isRecording || session.isGenerating || session.isAnalyzing}
                    onPlay={session.playExercise}
                    onStop={session.stopPlayback}
                  />
                )}

                {/* Quick Stats */}
                {analyticsData && (
                  <AnalyticsSummary
                    overallStats={analyticsData.overallStats as any}
                    dailyStats={analyticsData.dailyStats as any}
                  />
                )}
              </div>

              {/* Center Column - Sheet Music & Controls */}
              <div className="lg:col-span-1 space-y-4">
                {/* Exercise Info */}
                {session.currentExercise && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{session.currentExercise.metadata.title}</span>
                        <div className="flex gap-2">
                          <Badge variant="secondary">
                            {session.currentExercise.metadata.key}
                          </Badge>
                          <Badge variant="outline">
                            {session.currentExercise.metadata.tempo} BPM
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                )}

                {/* Sheet Music */}
                <SheetMusicDisplay
                  musicXML={session.currentExercise?.musicXML || null}
                  currentNoteIndex={session.currentNoteIndex}
                  className="min-h-[300px]"
                />

                {/* Controls */}
                <Card>
                  <PlaybackControls
                    isPlaying={session.isPlaying}
                    isRecording={session.isRecording}
                    isGenerating={session.isGenerating}
                    isAnalyzing={session.isAnalyzing}
                    hasExercise={!!session.currentExercise}
                    onPlay={session.playExercise}
                    onStop={session.stopPlayback}
                    onRecord={session.startRecording}
                    onStopRecording={session.stopRecording}
                    onGenerate={session.generateExercise}
                    onNext={session.nextExercise}
                  />
                </Card>

                {/* Pitch Visualizer */}
                <PitchVisualizer
                  currentPitch={session.currentPitch}
                  targetNote={session.currentExercise?.notes[0]?.pitch}
                  volume={session.volume}
                  isActive={session.isRecording}
                />

                {/* Fingerboard Visualizer */}
                <FingerboardVisualizer
                  activeNotes={
                    session.currentPitch
                      ? [`${session.currentPitch.note}${session.currentPitch.octave}`]
                      : session.currentExercise?.notes
                          .slice(session.currentNoteIndex, session.currentNoteIndex + 1)
                          .map((n) => n.pitch) || []
                  }
                  highlightPosition={session.currentNoteIndex}
                />
              </div>

              {/* Right Column - Feedback */}
              <div>
                <FeedbackPanel
                  analysis={session.currentAnalysis}
                  isLoading={session.isAnalyzing}
                />
              </div>
            </div>
          </TabsContent>

          {/* Review Tab */}
          <TabsContent value="review">
            <div className="max-w-2xl mx-auto">
              {reviewData ? (
                <ReviewQueue
                  dueItems={reviewData.dueItems}
                  upcomingItems={reviewData.upcomingItems}
                  stats={reviewData.stats}
                  onStartReview={handleStartReview}
                />
              ) : (
                <Card className="p-8 text-center">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Loading review queue...</p>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Metronome Tab */}
          <TabsContent value="metronome">
            <div className="max-w-md mx-auto">
              <SmartMetronome />
            </div>
          </TabsContent>

          {/* Video Technique Tab */}
          <TabsContent value="video">
            <div className="max-w-4xl mx-auto">
              <VideoTab />
            </div>
          </TabsContent>

          {/* Exams Tab */}
          <TabsContent value="exams">
            <div className="max-w-4xl mx-auto">
              <ExamDashboard
                userId={userData?.id || 'demo-user'}
                userLevel={userData?.level || 1}
              />
            </div>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <div className="grid md:grid-cols-2 gap-6">
              {analyticsData && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Your Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Practice Time</span>
                          <span className="font-bold">{formatTime(analyticsData.overallStats.totalPracticeMinutes)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Exercises Completed</span>
                          <span className="font-bold">{analyticsData.overallStats.totalExercises}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Practice Sessions</span>
                          <span className="font-bold">{analyticsData.overallStats.totalSessions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Average Score</span>
                          <span className="font-bold">{analyticsData.overallStats.avgScore}%</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current Streak</span>
                          <span className="font-bold">{analyticsData.overallStats.currentStreak} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Longest Streak</span>
                          <span className="font-bold">{analyticsData.overallStats.longestStreak} days</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {userData && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Level Progress</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-center">
                            <LevelBadge level={userData.level} size="lg" />
                          </div>
                          <XPBar currentXP={userData.xp} level={userData.level} size="lg" />
                          <StreakBadge
                            currentStreak={userData.currentStreak}
                            longestStreak={userData.longestStreak}
                            lastPracticeAt={userData.lastPracticeAt ? new Date(userData.lastPracticeAt) : null}
                            showMessage
                            size="md"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* Repertoire Tab */}
          <TabsContent value="repertoire">
            <div className="max-w-5xl mx-auto">
              <RepertoireTab />
            </div>
          </TabsContent>

          {/* Wellness Tab - Performance Anxiety & Mindset */}
          <TabsContent value="wellness">
            <div className="max-w-3xl mx-auto">
              <WellnessTab />
            </div>
          </TabsContent>

          {/* Schedule Tab - Practice Planner */}
          <TabsContent value="schedule">
            <div className="max-w-4xl mx-auto">
              <ScheduleTab />
            </div>
          </TabsContent>

          {/* Reference Recordings Tab */}
          <TabsContent value="reference">
            <div className="max-w-5xl mx-auto">
              <ReferenceLibrary />
            </div>
          </TabsContent>

          {/* My Pieces Tab - Upload and Analyze */}
          <TabsContent value="my-pieces">
            <MyPiecesTab session={session} />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <Separator className="my-8" />
        <footer className="text-center text-sm text-muted-foreground pb-8">
          <p>Practice with AI-powered feedback. Your progress is saved automatically.</p>
          <p className="mt-1">Tip: Use spaced repetition to optimize your practice time!</p>
        </footer>
      </div>

      {/* Achievement Toasts */}
      {unlockedAchievements.length > 0 && (
        <AchievementToastContainer
          achievements={unlockedAchievements}
          onDismiss={handleDismissAchievement}
        />
      )}

      {/* Practice Coach Chat */}
      <ChatPanel
        difficulty={session.difficulty}
        currentExercise={session.currentExercise}
        currentAnalysis={session.currentAnalysis}
        performanceHistory={session.performanceHistory}
      />
    </main>
  );
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

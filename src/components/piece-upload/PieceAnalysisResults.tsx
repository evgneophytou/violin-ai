'use client';

import { useState, useMemo } from 'react';
import { 
  Music, 
  Star, 
  Clock, 
  Target,
  BookOpen,
  ChevronRight,
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Layers,
  Gauge
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePieceAnalysisStore } from '@/stores/piece-analysis-store';
import { DifficultSectionCard } from './DifficultSectionCard';
import { SheetMusicDisplay } from '@/components/sheet-music/SheetMusicDisplay';
import type { DifficultSection, PieceAnalysis } from '@/types/piece-analysis';

interface PieceAnalysisResultsProps {
  analysis: PieceAnalysis;
  onPracticeSection?: (section: DifficultSection) => void;
}

const getDifficultyColor = (score: number): string => {
  if (score <= 3) return 'text-green-500';
  if (score <= 5) return 'text-yellow-500';
  if (score <= 7) return 'text-orange-500';
  return 'text-red-500';
};

const getDifficultyBgColor = (score: number): string => {
  if (score <= 3) return 'bg-green-100 dark:bg-green-900/30';
  if (score <= 5) return 'bg-yellow-100 dark:bg-yellow-900/30';
  if (score <= 7) return 'bg-orange-100 dark:bg-orange-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
};

export const PieceAnalysisResults = ({ analysis, onPracticeSection }: PieceAnalysisResultsProps) => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedSection, setSelectedSection] = useState<DifficultSection | null>(null);
  
  const { savePiece, savedPieces, removePiece, selectSection } = usePieceAnalysisStore();

  const isSaved = savedPieces.some(p => p.id === analysis.id);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalChallenges = analysis.difficultSections.reduce(
      (sum, s) => sum + s.challenges.length, 0
    );
    const significantChallenges = analysis.difficultSections.reduce(
      (sum, s) => sum + s.challenges.filter(c => c.severity === 'significant').length, 0
    );
    const avgSectionDifficulty = analysis.difficultSections.length > 0
      ? analysis.difficultSections.reduce((sum, s) => sum + s.difficultyScore, 0) / analysis.difficultSections.length
      : 0;

    return {
      totalChallenges,
      significantChallenges,
      avgSectionDifficulty: avgSectionDifficulty.toFixed(1),
      totalEstimatedTime: analysis.practicePlan.totalEstimatedTime,
    };
  }, [analysis]);

  // Sort sections by difficulty
  const sortedSections = useMemo(() => {
    return [...analysis.difficultSections].sort((a, b) => b.difficultyScore - a.difficultyScore);
  }, [analysis.difficultSections]);

  const handleSaveToggle = () => {
    if (isSaved) {
      removePiece(analysis.id);
    } else {
      savePiece(analysis);
    }
  };

  const handleSectionSelect = (section: DifficultSection) => {
    setSelectedSection(section);
    selectSection(section);
  };

  const handlePracticeSection = (section: DifficultSection) => {
    if (onPracticeSection) {
      onPracticeSection(section);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Music className="h-6 w-6" />
                {analysis.title}
              </CardTitle>
              {analysis.composer && (
                <CardDescription className="text-base mt-1">
                  by {analysis.composer}
                  {analysis.opus && ` - ${analysis.opus}`}
                  {analysis.movement && `, ${analysis.movement}`}
                </CardDescription>
              )}
            </div>
            <Button
              variant={isSaved ? "default" : "outline"}
              size="sm"
              onClick={handleSaveToggle}
            >
              {isSaved ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Overall Difficulty */}
            <div className={`p-4 rounded-lg ${getDifficultyBgColor(analysis.overallDifficulty)}`}>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                <Gauge className="h-4 w-4" />
                Difficulty
              </div>
              <div className={`text-3xl font-bold ${getDifficultyColor(analysis.overallDifficulty)}`}>
                {analysis.overallDifficulty}/10
              </div>
              {analysis.gradeLevel && (
                <div className="text-xs text-gray-500 mt-1">{analysis.gradeLevel}</div>
              )}
            </div>

            {/* Key & Time */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                <Music className="h-4 w-4" />
                Key / Time
              </div>
              <div className="text-xl font-bold text-blue-700 dark:text-blue-400">
                {analysis.keySignature}
              </div>
              <div className="text-sm text-gray-500">
                {analysis.timeSignature} - {analysis.tempo || '?'} BPM
              </div>
            </div>

            {/* Measures */}
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                <Layers className="h-4 w-4" />
                Structure
              </div>
              <div className="text-xl font-bold text-purple-700 dark:text-purple-400">
                {analysis.totalMeasures} measures
              </div>
              <div className="text-sm text-gray-500">
                {analysis.structure.length} sections
              </div>
            </div>

            {/* Practice Time */}
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                <Clock className="h-4 w-4" />
                Est. Practice
              </div>
              <div className="text-xl font-bold text-green-700 dark:text-green-400">
                {stats.totalEstimatedTime} min
              </div>
              <div className="text-sm text-gray-500">
                {stats.totalChallenges} challenges
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main content tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sections">Difficult Sections</TabsTrigger>
          <TabsTrigger value="technique">Technique</TabsTrigger>
          <TabsTrigger value="practice">Practice Plan</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Sheet Music Preview */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Sheet Music</CardTitle>
              </CardHeader>
              <CardContent>
                {analysis.musicXML ? (
                  <div className="h-64 overflow-hidden">
                    <SheetMusicDisplay 
                      musicXML={analysis.musicXML}
                      highlightErrors={selectedSection ? 
                        Array.from({ length: selectedSection.measureRange.end - selectedSection.measureRange.start + 1 }, 
                          (_, i) => selectedSection.measureRange.start + i - 1
                        ) : undefined
                      }
                    />
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <p>Sheet music preview not available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Challenges */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Top Challenges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {sortedSections.slice(0, 4).map((section) => (
                      <div 
                        key={section.id}
                        className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => handleSectionSelect(section)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSectionSelect(section);
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">
                            m. {section.measureRange.start}-{section.measureRange.end}
                          </span>
                          <Badge className={getDifficultyBgColor(section.difficultyScore)}>
                            {section.difficultyScore}/10
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {section.challenges.slice(0, 2).map((c, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {c.type.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Piece Structure */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Piece Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {analysis.structure.map((section, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="font-medium">{section.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        (m. {section.measureRange.start}-{section.measureRange.end})
                      </span>
                    </div>
                    {section.keySignature && section.keySignature !== analysis.keySignature && (
                      <Badge variant="outline" className="text-xs">
                        {section.keySignature}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Difficult Sections Tab */}
        <TabsContent value="sections" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {analysis.difficultSections.length} challenging sections identified
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Sort by:</span>
              <Badge variant="outline">Difficulty</Badge>
            </div>
          </div>
          
          <div className="grid gap-4">
            {sortedSections.map((section) => (
              <DifficultSectionCard
                key={section.id}
                section={section}
                pieceId={analysis.id}
                isSelected={selectedSection?.id === section.id}
                onSelect={handleSectionSelect}
                onPractice={handlePracticeSection}
              />
            ))}
          </div>
        </TabsContent>

        {/* Technique Tab */}
        <TabsContent value="technique" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Positions Required */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Positions Required</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.techniqueSummary.positions.map((pos) => (
                    <Badge 
                      key={pos} 
                      variant={pos === analysis.techniqueSummary.highestPosition ? "default" : "outline"}
                      className="text-lg px-3 py-1"
                    >
                      {pos === 1 ? '1st' : pos === 2 ? '2nd' : pos === 3 ? '3rd' : `${pos}th`}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  Highest position: {analysis.techniqueSummary.highestPosition}
                  {analysis.techniqueSummary.highestPosition === 1 ? 'st' : 
                   analysis.techniqueSummary.highestPosition === 2 ? 'nd' :
                   analysis.techniqueSummary.highestPosition === 3 ? 'rd' : 'th'}
                </p>
              </CardContent>
            </Card>

            {/* Strings Used */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Strings Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {['G', 'D', 'A', 'E'].map((string) => (
                    <div 
                      key={string}
                      className={`
                        w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
                        ${analysis.techniqueSummary.stringsCovered.includes(string as 'G' | 'D' | 'A' | 'E')
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                        }
                      `}
                    >
                      {string}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Left Hand Techniques */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Left Hand Techniques</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.techniqueSummary.requiredTechniques.length > 0 ? (
                    analysis.techniqueSummary.requiredTechniques.map((tech, idx) => (
                      <Badge key={idx} variant="secondary" className="capitalize">
                        {tech.replace(/_/g, ' ')}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No special techniques required</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Bowing Techniques */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Bowing Techniques</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.techniqueSummary.bowingTechniques.length > 0 ? (
                    analysis.techniqueSummary.bowingTechniques.map((tech, idx) => (
                      <Badge key={idx} variant="secondary" className="capitalize">
                        {tech.replace(/_/g, ' ')}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Standard bowing</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Range */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Dynamic Range</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-lg">
                    {analysis.techniqueSummary.dynamicRange.min}
                  </Badge>
                  <div className="flex-1 h-2 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 rounded-full" />
                  <Badge variant="outline" className="text-lg">
                    {analysis.techniqueSummary.dynamicRange.max}
                  </Badge>
                </div>
                <div className="flex gap-4 mt-4 text-sm text-gray-500">
                  {analysis.techniqueSummary.tempoChanges && (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Tempo changes
                    </span>
                  )}
                  {analysis.techniqueSummary.keyChanges && (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Key changes
                    </span>
                  )}
                  {analysis.techniqueSummary.meterChanges && (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Meter changes
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Practice Plan Tab */}
        <TabsContent value="practice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Recommended Practice Plan
              </CardTitle>
              <CardDescription>
                Estimated total time: {analysis.practicePlan.totalEstimatedTime} minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Warm-up suggestions */}
              <div className="mb-6">
                <h4 className="font-medium mb-2">Warm-up Suggestions</h4>
                <ul className="space-y-1">
                  {analysis.practicePlan.warmUpSuggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-blue-500 mt-1">-</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Practice items */}
              <div className="space-y-3">
                {analysis.practicePlan.items.map((item, idx) => (
                  <div 
                    key={item.id}
                    className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600">
                          {idx + 1}
                        </span>
                        <div>
                          <h5 className="font-medium">{item.description}</h5>
                          <p className="text-sm text-gray-500">
                            {item.duration} minutes - Priority: {item.priority}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={
                          item.priority === 'high' ? 'destructive' :
                          item.priority === 'medium' ? 'default' : 'secondary'
                        }
                      >
                        {item.priority}
                      </Badge>
                    </div>
                    
                    {item.focusAreas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.focusAreas.map((area, i) => (
                          <Badge key={i} variant="outline" className="text-xs capitalize">
                            {area.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {item.tips.length > 0 && (
                      <ul className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {item.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-yellow-500">-</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PieceAnalysisResults;

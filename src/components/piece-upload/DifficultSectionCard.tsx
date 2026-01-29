'use client';

import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Music, 
  Target, 
  Lightbulb, 
  Play,
  CheckCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePieceAnalysisStore } from '@/stores/piece-analysis-store';
import type { DifficultSection, Challenge, ChallengeSeverity } from '@/types/piece-analysis';

interface DifficultSectionCardProps {
  section: DifficultSection;
  pieceId?: string;
  isSelected?: boolean;
  onSelect?: (section: DifficultSection) => void;
  onPractice?: (section: DifficultSection) => void;
}

const getSeverityColor = (severity: ChallengeSeverity): string => {
  switch (severity) {
    case 'significant':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'moderate':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'minor':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  }
};

const getSeverityIcon = (severity: ChallengeSeverity) => {
  switch (severity) {
    case 'significant':
      return <AlertCircle className="h-3 w-3" />;
    case 'moderate':
      return <AlertTriangle className="h-3 w-3" />;
    case 'minor':
      return <Info className="h-3 w-3" />;
    default:
      return null;
  }
};

const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'technique':
      return 'bg-purple-500';
    case 'intonation':
      return 'bg-blue-500';
    case 'bowing':
      return 'bg-orange-500';
    case 'rhythm':
      return 'bg-green-500';
    case 'mixed':
    default:
      return 'bg-gray-500';
  }
};

const getCategoryLabel = (category: string): string => {
  switch (category) {
    case 'technique':
      return 'Technique';
    case 'intonation':
      return 'Intonation';
    case 'bowing':
      return 'Bowing';
    case 'rhythm':
      return 'Rhythm';
    case 'mixed':
    default:
      return 'Mixed';
  }
};

const getDifficultyLabel = (score: number): string => {
  if (score <= 3) return 'Moderate';
  if (score <= 5) return 'Challenging';
  if (score <= 7) return 'Difficult';
  return 'Very Difficult';
};

const getDifficultyColor = (score: number): string => {
  if (score <= 3) return 'text-green-500';
  if (score <= 5) return 'text-yellow-500';
  if (score <= 7) return 'text-orange-500';
  return 'text-red-500';
};

export const DifficultSectionCard = ({
  section,
  pieceId,
  isSelected = false,
  onSelect,
  onPractice,
}: DifficultSectionCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGeneratingExercise, setIsGeneratingExercise] = useState(false);
  
  const { generateExerciseForSection, getSectionExercise, markSectionPracticed, savedPieces } = usePieceAnalysisStore();

  // Check if this section has been practiced
  const savedPiece = pieceId ? savedPieces.find(p => p.id === pieceId) : null;
  const practiceHistory = savedPiece?.practicedSections.filter(ps => ps.sectionId === section.id) || [];
  const totalPracticeTime = practiceHistory.reduce((sum, ps) => sum + ps.duration, 0);
  const lastPracticed = practiceHistory.length > 0 
    ? Math.max(...practiceHistory.map(ps => ps.practicedAt))
    : null;

  const cachedExercise = getSectionExercise(section.id);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleSelect = () => {
    if (onSelect) {
      onSelect(section);
    }
  };

  const handleGenerateExercise = async () => {
    setIsGeneratingExercise(true);
    try {
      const exercise = await generateExerciseForSection(section);
      if (exercise && onPractice) {
        onPractice(section);
      }
    } finally {
      setIsGeneratingExercise(false);
    }
  };

  const handlePractice = () => {
    if (onPractice) {
      onPractice(section);
    }
  };

  return (
    <Card 
      className={`
        transition-all duration-200 cursor-pointer
        ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}
      `}
      onClick={handleSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect();
        }
      }}
      aria-label={`Section measures ${section.measureRange.start}-${section.measureRange.end}, ${getCategoryLabel(section.category)}, difficulty ${section.difficultyScore} out of 10`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-12 rounded-full ${getCategoryColor(section.category)}`} />
            <div>
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-gray-500" />
                <span className="font-semibold">
                  Measures {section.measureRange.start}-{section.measureRange.end}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {getCategoryLabel(section.category)}
                </Badge>
                <span className={`text-sm font-medium ${getDifficultyColor(section.difficultyScore)}`}>
                  {getDifficultyLabel(section.difficultyScore)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className={`text-2xl font-bold ${getDifficultyColor(section.difficultyScore)}`}>
                {section.difficultyScore}
              </div>
              <div className="text-xs text-gray-500">/10</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpand();
              }}
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Progress bar for difficulty */}
        <Progress 
          value={section.difficultyScore * 10} 
          className="h-1.5 mt-3"
        />
      </CardHeader>

      <CardContent className="pt-0">
        {/* Practice stats */}
        {totalPracticeTime > 0 && (
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{totalPracticeTime} min practiced</span>
            </div>
            {lastPracticed && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Last: {new Date(lastPracticed).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Challenges preview (always visible) */}
        <div className="flex flex-wrap gap-1 mb-3">
          {section.challenges.slice(0, 3).map((challenge, idx) => (
            <Badge 
              key={idx} 
              variant="secondary"
              className={`text-xs ${getSeverityColor(challenge.severity)}`}
            >
              {getSeverityIcon(challenge.severity)}
              <span className="ml-1">{challenge.type.replace(/_/g, ' ')}</span>
            </Badge>
          ))}
          {section.challenges.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{section.challenges.length - 3} more
            </Badge>
          )}
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="space-y-4 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
            {/* All challenges */}
            <div>
              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-orange-500" />
                Challenges
              </h4>
              <ul className="space-y-2">
                {section.challenges.map((challenge, idx) => (
                  <li key={idx} className="text-sm">
                    <div className="flex items-start gap-2">
                      <Badge className={`text-xs shrink-0 ${getSeverityColor(challenge.severity)}`}>
                        {challenge.severity}
                      </Badge>
                      <div>
                        <span className="font-medium capitalize">
                          {challenge.type.replace(/_/g, ' ')}
                        </span>
                        <p className="text-gray-600 dark:text-gray-400">
                          {challenge.description}
                        </p>
                        {challenge.measureNumbers.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Measures: {challenge.measureNumbers.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suggestions */}
            {section.suggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Practice Suggestions
                </h4>
                <ul className="space-y-1">
                  {section.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-yellow-500 mt-1">-</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              {cachedExercise ? (
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handlePractice}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Practice Exercise
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={handleGenerateExercise}
                  disabled={isGeneratingExercise}
                >
                  {isGeneratingExercise ? (
                    <>
                      <span className="animate-spin mr-2">...</span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Music className="h-4 w-4 mr-2" />
                      Generate Practice Exercise
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DifficultSectionCard;

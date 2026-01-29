'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
  Music,
  BookOpen,
  Target,
  Star,
  Clock,
  ExternalLink,
  Play,
  ChevronRight,
  Sparkles,
  Filter,
  Search,
  GraduationCap,
  TrendingUp,
  CheckCircle2,
  Circle,
  Loader2,
} from 'lucide-react';
import { useRepertoireStore } from '@/stores/repertoire-store';
import {
  PieceMetadata,
  RepertoireRecommendation,
  LearningPath,
  getAllTechniques,
  getAllEras,
  getAllStyles,
  PIECE_DATABASE,
} from '@/lib/ai/repertoire-agent';

// Piece card component
const PieceCard = ({
  piece,
  recommendation,
  onSelect,
  progress,
}: {
  piece: PieceMetadata;
  recommendation?: RepertoireRecommendation;
  onSelect: () => void;
  progress?: { status: string; practiceTime: number };
}) => {
  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'bg-green-500';
    if (difficulty <= 4) return 'bg-blue-500';
    if (difficulty <= 6) return 'bg-yellow-500';
    if (difficulty <= 8) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'mastered':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'polishing':
      case 'practicing':
      case 'learning':
        return <Circle className="h-4 w-4 text-blue-500 fill-blue-200" />;
      default:
        return null;
    }
  };

  return (
    <Card
      className="cursor-pointer hover:border-primary transition-colors"
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium line-clamp-1">{piece.title}</h4>
              {progress && getStatusIcon(progress.status)}
            </div>
            <p className="text-sm text-muted-foreground">{piece.composer}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className={`w-6 h-6 rounded-full ${getDifficultyColor(piece.difficulty)} flex items-center justify-center text-white text-xs font-bold`}>
              {piece.difficulty}
            </div>
            {piece.abrsm && (
              <span className="text-xs text-muted-foreground">Gr. {piece.abrsm}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-2">
          <Badge variant="outline" className="text-xs capitalize">
            {piece.era}
          </Badge>
          {piece.style && (
            <Badge variant="outline" className="text-xs capitalize">
              {piece.style}
            </Badge>
          )}
          {piece.duration && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {piece.duration} min
            </Badge>
          )}
        </div>

        {recommendation && (
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Match</span>
              <span className="text-xs font-medium">{recommendation.matchScore}%</span>
            </div>
            <Progress value={recommendation.matchScore} className="h-1" />
            {recommendation.reasons.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {recommendation.reasons[0]}
              </p>
            )}
          </div>
        )}

        {progress && progress.practiceTime > 0 && (
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {Math.round(progress.practiceTime / 60)}h {progress.practiceTime % 60}m practiced
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Piece detail modal content
const PieceDetail = ({
  piece,
  onClose,
  onStart,
}: {
  piece: PieceMetadata;
  onClose: () => void;
  onStart: () => void;
}) => {
  const { pieceProgress, setPieceStatus, setPieceNotes } = useRepertoireStore();
  const progress = pieceProgress[piece.id];
  const [notes, setNotes] = useState(progress?.notes || '');

  const handleSaveNotes = () => {
    setPieceNotes(piece.id, notes);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">{piece.title}</h2>
          <p className="text-muted-foreground">{piece.composer}</p>
        </div>
        <Badge className="text-lg px-3 py-1">Level {piece.difficulty}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Era</p>
          <p className="font-medium capitalize">{piece.era}</p>
        </div>
        {piece.key && (
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Key</p>
            <p className="font-medium">{piece.key}</p>
          </div>
        )}
        {piece.duration && (
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="font-medium">{piece.duration} min</p>
          </div>
        )}
        <div className="text-center p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Movements</p>
          <p className="font-medium">{piece.movements}</p>
        </div>
      </div>

      {piece.description && (
        <div>
          <h3 className="font-medium mb-1">Description</h3>
          <p className="text-sm text-muted-foreground">{piece.description}</p>
        </div>
      )}

      <div>
        <h3 className="font-medium mb-2">Techniques Required</h3>
        <div className="flex flex-wrap gap-1">
          {piece.techniques.map((technique) => (
            <Badge key={technique} variant="secondary" className="capitalize">
              {technique.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>
      </div>

      {progress && (
        <div>
          <h3 className="font-medium mb-2">Your Progress</h3>
          <div className="flex gap-2 mb-2">
            {(['not_started', 'learning', 'practicing', 'polishing', 'mastered'] as const).map((status) => (
              <Button
                key={status}
                size="sm"
                variant={progress.status === status ? 'default' : 'outline'}
                onClick={() => setPieceStatus(piece.id, status)}
                className="capitalize text-xs"
              >
                {status.replace(/_/g, ' ')}
              </Button>
            ))}
          </div>
          <textarea
            className="w-full p-2 border rounded-md text-sm"
            rows={3}
            placeholder="Add notes about this piece..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
          />
        </div>
      )}

      <div className="flex gap-2 pt-4">
        {!progress && (
          <Button onClick={onStart} className="flex-1">
            <Play className="h-4 w-4 mr-2" />
            Start Learning
          </Button>
        )}
        {piece.imslpUrl && (
          <Button variant="outline" asChild>
            <a href={piece.imslpUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              IMSLP
            </a>
          </Button>
        )}
        {piece.youtubeUrl && (
          <Button variant="outline" asChild>
            <a href={piece.youtubeUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              YouTube
            </a>
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

// Learning path card
const LearningPathCard = ({
  path,
  onRemove,
}: {
  path: LearningPath;
  onRemove: () => void;
}) => {
  const { pieceProgress } = useRepertoireStore();
  
  const completedCount = path.pieces.filter(
    p => pieceProgress[p.id]?.status === 'mastered'
  ).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{path.name}</CardTitle>
            <CardDescription>{path.description}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progress</span>
            <span>{completedCount} / {path.pieces.length} pieces</span>
          </div>
          <Progress value={(completedCount / path.pieces.length) * 100} />
          
          <div className="flex flex-wrap gap-1 mt-2">
            {path.focusAreas.slice(0, 4).map((area) => (
              <Badge key={area} variant="outline" className="text-xs capitalize">
                {area.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>

          <div className="text-xs text-muted-foreground mt-2">
            Estimated: ~{path.totalDuration} weeks
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main component
export const RepertoireTab = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('recommendations');
  const [showFilters, setShowFilters] = useState(false);
  
  const {
    skillProfile,
    pieceProgress,
    recommendations,
    learningPaths,
    selectedPiece,
    searchFilters,
    searchResults,
    updateSkillProfile,
    refreshRecommendations,
    selectPiece,
    startPiece,
    setSearchFilters,
    search,
    createLearningPath,
    removeLearningPath,
    getStats,
  } = useRepertoireStore();

  useEffect(() => {
    setIsMounted(true);
    // Load initial recommendations
    if (recommendations.length === 0) {
      refreshRecommendations({ count: 6 });
    }
  }, []);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = getStats();
  const inProgressPieces = Object.entries(pieceProgress)
    .filter(([_, p]) => ['learning', 'practicing', 'polishing'].includes(p.status))
    .map(([id]) => PIECE_DATABASE.find(p => p.id === id))
    .filter(Boolean) as PieceMetadata[];

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <GraduationCap className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{skillProfile.level}</p>
            <p className="text-xs text-muted-foreground">Current Level</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Music className="h-6 w-6 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{stats.inProgress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
            <p className="text-2xl font-bold">{stats.mastered}</p>
            <p className="text-xs text-muted-foreground">Mastered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{Math.round(stats.totalPracticeTime / 60)}h</p>
            <p className="text-xs text-muted-foreground">Practice Time</p>
          </CardContent>
        </Card>
      </div>

      {/* Skill Level Slider */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Your Skill Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Slider
              value={[skillProfile.level]}
              onValueChange={([value]) => updateSkillProfile({ level: value })}
              min={1}
              max={10}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Beginner</span>
              <span>Level {skillProfile.level}</span>
              <span>Advanced</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommendations">
            <Sparkles className="h-4 w-4 mr-2" />
            For You
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            <Play className="h-4 w-4 mr-2" />
            In Progress
          </TabsTrigger>
          <TabsTrigger value="browse">
            <Search className="h-4 w-4 mr-2" />
            Browse
          </TabsTrigger>
          <TabsTrigger value="paths">
            <Target className="h-4 w-4 mr-2" />
            Paths
          </TabsTrigger>
        </TabsList>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Recommended for You</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshRecommendations({ count: 6 })}
            >
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((rec) => (
              <PieceCard
                key={rec.piece.id}
                piece={rec.piece}
                recommendation={rec}
                onSelect={() => selectPiece(rec.piece)}
                progress={pieceProgress[rec.piece.id]}
              />
            ))}
          </div>

          {recommendations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No recommendations yet. Adjust your skill level to get started!</p>
            </div>
          )}
        </TabsContent>

        {/* In Progress Tab */}
        <TabsContent value="in-progress" className="space-y-4">
          <h3 className="font-medium">Currently Learning</h3>

          {inProgressPieces.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgressPieces.map((piece) => (
                <PieceCard
                  key={piece.id}
                  piece={piece}
                  onSelect={() => selectPiece(piece)}
                  progress={pieceProgress[piece.id]}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No pieces in progress. Start learning something from the recommendations!</p>
            </div>
          )}
        </TabsContent>

        {/* Browse Tab */}
        <TabsContent value="browse" className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={search}
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {showFilters && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">Difficulty Range</label>
                  <div className="flex items-center gap-4 mt-1">
                    <Slider
                      value={[searchFilters.difficulty?.min || 1, searchFilters.difficulty?.max || 10]}
                      onValueChange={([min, max]) => 
                        setSearchFilters({ ...searchFilters, difficulty: { min, max } })
                      }
                      min={1}
                      max={10}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground w-16">
                      {searchFilters.difficulty?.min || 1} - {searchFilters.difficulty?.max || 10}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Era</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {getAllEras().map((era) => (
                      <Badge
                        key={era}
                        variant={searchFilters.era?.includes(era) ? 'default' : 'outline'}
                        className="cursor-pointer capitalize"
                        onClick={() => {
                          const current = searchFilters.era || [];
                          const updated = current.includes(era)
                            ? current.filter(e => e !== era)
                            : [...current, era];
                          setSearchFilters({ ...searchFilters, era: updated });
                        }}
                      >
                        {era}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Style</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {getAllStyles().map((style) => (
                      <Badge
                        key={style}
                        variant={searchFilters.style?.includes(style) ? 'default' : 'outline'}
                        className="cursor-pointer capitalize"
                        onClick={() => {
                          const current = searchFilters.style || [];
                          const updated = current.includes(style)
                            ? current.filter(s => s !== style)
                            : [...current, style];
                          setSearchFilters({ ...searchFilters, style: updated });
                        }}
                      >
                        {style}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(searchResults.length > 0 ? searchResults : PIECE_DATABASE).map((piece) => (
              <PieceCard
                key={piece.id}
                piece={piece}
                onSelect={() => selectPiece(piece)}
                progress={pieceProgress[piece.id]}
              />
            ))}
          </div>
        </TabsContent>

        {/* Learning Paths Tab */}
        <TabsContent value="paths" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Your Learning Paths</h3>
            <Button
              size="sm"
              onClick={() => createLearningPath({ targetLevel: skillProfile.level + 2 })}
            >
              <Target className="h-4 w-4 mr-2" />
              Create Path
            </Button>
          </div>

          {learningPaths.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {learningPaths.map((path, index) => (
                <LearningPathCard
                  key={index}
                  path={path}
                  onRemove={() => removeLearningPath(index)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No learning paths yet. Create one to track your journey!</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Piece Detail Modal */}
      {selectedPiece && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <PieceDetail
                piece={selectedPiece}
                onClose={() => selectPiece(null)}
                onStart={() => {
                  startPiece(selectedPiece.id);
                  selectPiece(null);
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RepertoireTab;

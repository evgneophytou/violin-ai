'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Mic,
  Square,
  Loader2,
  Lightbulb,
  Music2,
  Heart,
} from 'lucide-react';
import { analyzeExpression, type ExpressionAnalysis } from '@/lib/audio/dynamics-analyzer';

interface ExpressionPanelProps {
  className?: string;
}

const CHARACTER_EMOJIS: Record<string, string> = {
  intense: '🔥',
  powerful: '💪',
  gentle: '🌸',
  melancholic: '🌧️',
  joyful: '☀️',
  neutral: '🎵',
};

const DynamicsCurve = ({
  data,
  crescendos,
  diminuendos,
}: {
  data: { time: number; amplitude: number }[];
  crescendos: { start: number; end: number }[];
  diminuendos: { start: number; end: number }[];
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate time scale
    const maxTime = data[data.length - 1].time;
    const timeToX = (time: number) => (time / maxTime) * width;
    const amplitudeToY = (amp: number) => height - (amp / 100) * (height - 10);

    // Draw crescendo regions
    ctx.fillStyle = 'rgba(34, 197, 94, 0.1)'; // green
    crescendos.forEach(({ start, end }) => {
      const x1 = timeToX(start);
      const x2 = timeToX(end);
      ctx.fillRect(x1, 0, x2 - x1, height);
    });

    // Draw diminuendo regions
    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)'; // red
    diminuendos.forEach(({ start, end }) => {
      const x1 = timeToX(start);
      const x2 = timeToX(end);
      ctx.fillRect(x1, 0, x2 - x1, height);
    });

    // Draw amplitude curve
    ctx.strokeStyle = 'hsl(var(--primary))';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, i) => {
      const x = timeToX(point.time);
      const y = amplitudeToY(point.amplitude);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Fill under curve
    ctx.lineTo(timeToX(data[data.length - 1].time), height);
    ctx.lineTo(timeToX(data[0].time), height);
    ctx.closePath();
    ctx.fillStyle = 'hsl(var(--primary) / 0.1)';
    ctx.fill();
  }, [data, crescendos, diminuendos]);

  return <canvas ref={canvasRef} className="w-full h-32" />;
};

export const ExpressionPanel = ({ className }: ExpressionPanelProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ExpressionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        stream.getTracks().forEach((track) => track.stop());

        setIsAnalyzing(true);
        try {
          const result = await analyzeExpression(blob);
          setAnalysis(result);
        } catch (err) {
          setError('Failed to analyze audio');
          console.error(err);
        } finally {
          setIsAnalyzing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setRecordingDuration(elapsed);
      }, 100);
    } catch (err) {
      setError('Failed to access microphone');
      console.error(err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={className}>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <span>Expression Coach</span>
          </div>
          {analysis && (
            <Badge variant="secondary" className="gap-1">
              {CHARACTER_EMOJIS[analysis.interpretation.detected]}
              {analysis.interpretation.detected}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-4 py-2">
          {isRecording ? (
            <>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                <span className="font-mono">{formatTime(recordingDuration)}</span>
              </div>
              <Button variant="destructive" onClick={stopRecording} className="gap-2">
                <Square className="h-4 w-4" />
                Stop & Analyze
              </Button>
            </>
          ) : (
            <Button onClick={startRecording} disabled={isAnalyzing} className="gap-2">
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Record for Analysis
                </>
              )}
            </Button>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {/* Analysis Results */}
        {analysis && (
          <>
            <Separator />

            {/* Dynamics Curve */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Dynamics Curve
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500/30 rounded" />
                    Crescendo
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500/30 rounded" />
                    Diminuendo
                  </span>
                </div>
              </div>
              <DynamicsCurve
                data={analysis.dynamics.amplitudeEnvelope}
                crescendos={analysis.dynamics.crescendos}
                diminuendos={analysis.dynamics.diminuendos}
              />
            </div>

            <Separator />

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium">Dynamic Range</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Soft</span>
                  <Progress
                    value={analysis.dynamics.dynamicRange.max - analysis.dynamics.dynamicRange.min}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground">Loud</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(analysis.dynamics.dynamicRange.min)}-
                  {Math.round(analysis.dynamics.dynamicRange.max)} dB
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Dynamic Variety</span>
                <Progress value={analysis.dynamics.dynamicVariety} />
                <p className="text-xs text-muted-foreground">
                  {analysis.dynamics.dynamicVariety}% variety
                </p>
              </div>
            </div>

            {/* Phrasing Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <TrendingUp className="h-5 w-5 mx-auto text-green-500" />
                <p className="text-lg font-bold">{analysis.dynamics.crescendos.length}</p>
                <p className="text-xs text-muted-foreground">Crescendos</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <TrendingDown className="h-5 w-5 mx-auto text-red-500" />
                <p className="text-lg font-bold">{analysis.dynamics.diminuendos.length}</p>
                <p className="text-xs text-muted-foreground">Diminuendos</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <Music2 className="h-5 w-5 mx-auto text-primary" />
                <p className="text-lg font-bold">{analysis.phrasing.musicality}</p>
                <p className="text-xs text-muted-foreground">Musicality</p>
              </div>
            </div>

            <Separator />

            {/* Suggestions */}
            <div className="space-y-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Suggestions
              </span>
              <ul className="space-y-2">
                {analysis.interpretation.suggestions.map((suggestion, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Heart className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Empty State */}
        {!analysis && !isRecording && !isAnalyzing && (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4" />
            <p>Record a passage to analyze your expression</p>
            <p className="text-sm mt-1">
              Get feedback on dynamics, phrasing, and musicality
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

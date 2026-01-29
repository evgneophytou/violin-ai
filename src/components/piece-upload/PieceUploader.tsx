'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, FileMusic, FileImage, File, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { usePieceAnalysisStore } from '@/stores/piece-analysis-store';
import { FEATURES, EVENTS, trackEvent } from '@/lib/analytics/tracking';
import type { UploadStatus } from '@/types/piece-analysis';

const ACCEPTED_FILE_TYPES = {
  'application/xml': ['.xml'],
  'text/xml': ['.xml'],
  'application/vnd.recordare.musicxml+xml': ['.musicxml'],
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface PieceUploaderProps {
  onAnalysisComplete?: () => void;
}

export const PieceUploader = ({ onAnalysisComplete }: PieceUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadedFile, uploadStatus, setUploadedFile, uploadAndAnalyzePiece, reset } = usePieceAnalysisStore();

  const getFileIcon = (file: File) => {
    if (file.type.includes('xml') || file.name.endsWith('.xml') || file.name.endsWith('.musicxml')) {
      return <FileMusic className="h-8 w-8 text-blue-500" />;
    }
    if (file.type.includes('image')) {
      return <FileImage className="h-8 w-8 text-green-500" />;
    }
    if (file.type === 'application/pdf') {
      return <File className="h-8 w-8 text-red-500" />;
    }
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const getFileTypeLabel = (file: File): string => {
    if (file.type.includes('xml') || file.name.endsWith('.xml') || file.name.endsWith('.musicxml')) {
      return 'MusicXML';
    }
    if (file.type.includes('image')) {
      return 'Image';
    }
    if (file.type === 'application/pdf') {
      return 'PDF';
    }
    return 'Unknown';
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }

    // Check file type
    const fileType = getFileTypeLabel(file);
    if (fileType === 'Unknown') {
      return 'Invalid file type. Please upload MusicXML, PDF, or image files.';
    }

    return null;
  };

  const handleFile = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      usePieceAnalysisStore.setState({
        uploadStatus: {
          state: 'error',
          progress: 0,
          message: 'Invalid file',
          error,
        },
      });
      return;
    }

    // Track piece upload
    trackEvent(EVENTS.PIECE_UPLOADED, FEATURES.MY_PIECES, {
      file_type: getFileTypeLabel(file),
      file_size: file.size,
    });

    setUploadedFile(file);
    const analysis = await uploadAndAnalyzePiece(file);
    
    if (analysis) {
      // Track analysis completion
      trackEvent(EVENTS.PIECE_ANALYSIS_COMPLETED, FEATURES.MY_PIECES, {
        file_type: getFileTypeLabel(file),
        success: true,
      });
      
      if (onAnalysisComplete) {
        onAnalysisComplete();
      }
    }
  }, [setUploadedFile, uploadAndAnalyzePiece, onAnalysisComplete]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleFile]);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearFile = () => {
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusIcon = (status: UploadStatus) => {
    switch (status.state) {
      case 'uploading':
      case 'processing':
      case 'analyzing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: UploadStatus): string => {
    switch (status.state) {
      case 'complete':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const isProcessing = ['uploading', 'processing', 'analyzing'].includes(uploadStatus.state);

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,.musicxml,.pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Upload sheet music file"
        />

        {/* Drop zone */}
        {!uploadedFile && uploadStatus.state === 'idle' && (
          <div
            role="button"
            tabIndex={0}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragging 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600'
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleBrowseClick();
              }
            }}
            aria-label="Drop zone for uploading sheet music"
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              Drop your sheet music here
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              or click to browse
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded">MusicXML</span>
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded">PDF</span>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded">JPG/PNG</span>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Maximum file size: 10MB
            </p>
          </div>
        )}

        {/* File selected / Processing state */}
        {(uploadedFile || uploadStatus.state !== 'idle') && (
          <div className="space-y-4">
            {/* File info */}
            {uploadedFile && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {getFileIcon(uploadedFile)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {getFileTypeLabel(uploadedFile)} - {(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                {!isProcessing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearFile}
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Progress */}
            {uploadStatus.state !== 'idle' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(uploadStatus)}
                  <span className="text-sm font-medium">{uploadStatus.message}</span>
                </div>
                
                {isProcessing && (
                  <Progress 
                    value={uploadStatus.progress} 
                    className="h-2"
                  />
                )}

                {uploadStatus.state === 'error' && uploadStatus.error && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {uploadStatus.error}
                  </p>
                )}

                {uploadStatus.state === 'complete' && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Your piece has been analyzed! View the results below.
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            {(uploadStatus.state === 'error' || uploadStatus.state === 'complete') && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleClearFile}
                  className="flex-1"
                >
                  Upload Another
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PieceUploader;

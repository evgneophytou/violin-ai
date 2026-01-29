import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

// Stem separation API route
// This is a placeholder for integration with external services like:
// - Replicate.com (Demucs model)
// - LALAL.AI
// - Spleeter (self-hosted)

export interface StemSeparationResult {
  violin: string;       // Base64 audio data
  accompaniment: string; // Base64 audio data
  other?: string;       // Base64 audio data
  status: 'completed' | 'processing' | 'failed';
  message?: string;
}

// Constants for validation
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max

// Exact MIME type matching (no partial matching)
const ALLOWED_AUDIO_TYPES = new Set([
  'audio/webm',
  'audio/mp3',
  'audio/mpeg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/flac',
  'audio/x-flac',
]);

// Magic bytes for audio file validation
const AUDIO_MAGIC_BYTES: Record<string, number[][]> = {
  // MP3: ID3 tag or sync word
  mp3: [[0x49, 0x44, 0x33], [0xFF, 0xFB], [0xFF, 0xFA], [0xFF, 0xF3], [0xFF, 0xF2]],
  // WAV: RIFF header
  wav: [[0x52, 0x49, 0x46, 0x46]],
  // OGG: OggS
  ogg: [[0x4F, 0x67, 0x67, 0x53]],
  // FLAC
  flac: [[0x66, 0x4C, 0x61, 0x43]],
  // WebM: EBML header
  webm: [[0x1A, 0x45, 0xDF, 0xA3]],
};

/**
 * Validate audio file magic bytes
 */
const validateAudioMagicBytes = (buffer: ArrayBuffer): boolean => {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  
  for (const patterns of Object.values(AUDIO_MAGIC_BYTES)) {
    for (const pattern of patterns) {
      let matches = true;
      for (let i = 0; i < pattern.length; i++) {
        if (bytes[i] !== pattern[i]) {
          matches = false;
          break;
        }
      }
      if (matches) return true;
    }
  }
  
  return false;
};

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = rateLimit(request, RATE_LIMITS.FILE_PROCESS, 'stem-separation');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Validate MIME type with exact matching (no partial matching)
    const mimeType = audioFile.type || '';
    if (!ALLOWED_AUDIO_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: 'Invalid audio file type. Supported: MP3, WAV, WebM, OGG, FLAC' },
        { status: 400 }
      );
    }

    // Validate magic bytes for additional security
    const fileBuffer = await audioFile.arrayBuffer();
    if (!validateAudioMagicBytes(fileBuffer)) {
      return NextResponse.json(
        { error: 'Invalid audio file format. File content does not match expected audio format.' },
        { status: 400 }
      );
    }

    // Check for API key
    const replicateApiKey = process.env.REPLICATE_API_TOKEN;
    
    if (!replicateApiKey) {
      // Return mock/demo response when no API key is available
      if (process.env.NODE_ENV !== 'production') {
        console.log('No Replicate API key, returning demo response');
      }
      
      // Convert audio to base64 for demo (reuse fileBuffer from validation)
      const base64Audio = Buffer.from(fileBuffer).toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Audio}`;
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return NextResponse.json<StemSeparationResult>({
        violin: dataUrl,
        accompaniment: dataUrl,
        status: 'completed',
        message: 'Demo mode: Actual stem separation requires a Replicate API key',
      });
    }

    // Real implementation with Replicate API
    try {
      // Convert audio to base64 for API (reuse fileBuffer from validation)
      const base64Audio = Buffer.from(fileBuffer).toString('base64');
      
      // Call Replicate API with Demucs model
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${replicateApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Use the Demucs model for stem separation
          version: 'cdf0ec4a42d4e17faa5a16a66c7de1b5fdb58eb0d315bd31bb5c8fc4c33ce30d',
          input: {
            audio: `data:${mimeType};base64,${base64Audio}`,
            stems: 'all', // Separate all stems
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Replicate API error: ${response.statusText}`);
      }

      const prediction = await response.json();

      // Poll for completion
      let result = prediction;
      while (result.status !== 'succeeded' && result.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await fetch(
          `https://api.replicate.com/v1/predictions/${result.id}`,
          {
            headers: {
              'Authorization': `Token ${replicateApiKey}`,
            },
          }
        );
        
        result = await statusResponse.json();
      }

      if (result.status === 'failed') {
        throw new Error('Stem separation failed');
      }

      // Extract stems from result
      const output = result.output;
      
      return NextResponse.json<StemSeparationResult>({
        violin: output.vocals || output.other || '', // Violin often detected as vocals/other
        accompaniment: output.accompaniment || output.other || '',
        other: output.drums || '', // Optional drums stem
        status: 'completed',
      });
    } catch (apiError) {
      const apiMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
      console.error('[stem-separation/API]', apiMessage);
      
      // Fallback to demo mode (reuse fileBuffer from validation)
      const fallbackBase64 = Buffer.from(fileBuffer).toString('base64');
      const dataUrl = `data:${mimeType};base64,${fallbackBase64}`;
      
      return NextResponse.json<StemSeparationResult>({
        violin: dataUrl,
        accompaniment: dataUrl,
        status: 'completed',
        message: 'API error, falling back to demo mode',
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[stem-separation]', message);
    return NextResponse.json(
      { 
        error: 'Failed to process audio',
        status: 'failed' as const,
      },
      { status: 500 }
    );
  }
}

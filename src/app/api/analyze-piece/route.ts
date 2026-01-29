import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  generatePieceAnalysisPrompt,
  parsePieceAnalysisResponse,
  generateLocalPieceAnalysis,
  generateVisionExtractionPrompt,
  parseVisionExtractionResponse,
  convertExtractedDataToMusicXML,
} from '@/lib/ai/piece-analysis-agent';
import {
  generateTechniqueAnalysisPrompt,
  parseTechniqueAnalysisResponse,
  generateLocalTechniqueAnalysis,
} from '@/lib/ai/technique-analysis-agent';
import {
  generateBowingAnalysisPrompt,
  parseBowingAnalysisResponse,
  generateLocalBowingAnalysis,
  generateRightHandChallenges,
  generateBowingRecommendations,
} from '@/lib/ai/bowing-analysis-agent';
import { parseMusicXMLNotes, extractMetadataFromMusicXML } from '@/lib/music/musicxml-utils';
import { createErrorResponse, LIMITS, logError } from '@/lib/validation';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import type { PieceAnalysis, AnalyzePieceResponse, ExtractedMusicData } from '@/types/piece-analysis';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// Allowed file types
const ALLOWED_MUSICXML_TYPES = [
  'application/xml',
  'text/xml',
  'application/vnd.recordare.musicxml+xml',
  'application/vnd.recordare.musicxml',
];

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const ALLOWED_PDF_TYPES = [
  'application/pdf',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Helper to check file extension
const getFileType = (fileName: string, mimeType: string): 'musicxml' | 'image' | 'pdf' | 'unknown' => {
  const ext = fileName.toLowerCase().split('.').pop();
  
  if (ext === 'xml' || ext === 'musicxml' || ALLOWED_MUSICXML_TYPES.includes(mimeType)) {
    return 'musicxml';
  }
  if (ext === 'pdf' || ALLOWED_PDF_TYPES.includes(mimeType)) {
    return 'pdf';
  }
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '') || ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return 'image';
  }
  return 'unknown';
};

// Process MusicXML file
const processMusicXML = async (content: string): Promise<{
  musicXML: string;
  notes: ReturnType<typeof parseMusicXMLNotes>;
  metadata: ReturnType<typeof extractMetadataFromMusicXML>;
}> => {
  const notes = parseMusicXMLNotes(content);
  const metadata = extractMetadataFromMusicXML(content);
  
  return {
    musicXML: content,
    notes,
    metadata,
  };
};

// Process image/PDF using Gemini Vision
const processImageOrPDF = async (
  fileBuffer: ArrayBuffer,
  mimeType: string,
  model: ReturnType<typeof genAI.getGenerativeModel>
): Promise<ExtractedMusicData | null> => {
  try {
    const base64Data = Buffer.from(fileBuffer).toString('base64');
    
    const prompt = generateVisionExtractionPrompt();
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          { text: prompt },
        ],
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8000,
      },
    });

    const responseText = result.response.text();
    return parseVisionExtractionResponse(responseText);
  } catch (error) {
    logError('analyze-piece/vision', error);
    return null;
  }
};

// Run full AI analysis pipeline
const runAIAnalysisPipeline = async (
  musicData: ExtractedMusicData | string,
  isRawMusicXML: boolean,
  originalMusicXML?: string
): Promise<PieceAnalysis | null> => {
  if (!process.env.GOOGLE_AI_API_KEY) {
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });

    // Step 1: Get main piece analysis
    const piecePrompt = generatePieceAnalysisPrompt(musicData, isRawMusicXML);
    const pieceResult = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: piecePrompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8000,
      },
    });

    const pieceResponseText = pieceResult.response.text();
    const pieceAnalysis = parsePieceAnalysisResponse(pieceResponseText, originalMusicXML);

    if (!pieceAnalysis) {
      return null;
    }

    // Step 2: Get technique analysis
    const techPrompt = generateTechniqueAnalysisPrompt(musicData, isRawMusicXML);
    const techResult = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: techPrompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4000,
      },
    });

    const techResponseText = techResult.response.text();
    const techAnalysis = parseTechniqueAnalysisResponse(techResponseText);

    // Step 3: Get bowing analysis
    const bowingPrompt = generateBowingAnalysisPrompt(musicData, isRawMusicXML);
    const bowingResult = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: bowingPrompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4000,
      },
    });

    const bowingResponseText = bowingResult.response.text();
    const bowingAnalysis = parseBowingAnalysisResponse(bowingResponseText);

    // Merge technique and bowing analysis into piece analysis
    if (techAnalysis) {
      // Add technique challenges to difficult sections
      const allTechniques = [
        ...pieceAnalysis.techniqueSummary.requiredTechniques,
        ...techAnalysis.leftHandChallenges.map(c => c.type),
      ];
      pieceAnalysis.techniqueSummary.requiredTechniques = [...new Set(allTechniques)] as typeof pieceAnalysis.techniqueSummary.requiredTechniques;

      // Add recommendations to practice plan
      techAnalysis.recommendations.forEach(rec => {
        if (!pieceAnalysis.practicePlan.warmUpSuggestions.includes(rec)) {
          pieceAnalysis.practicePlan.warmUpSuggestions.push(rec);
        }
      });
    }

    if (bowingAnalysis) {
      // Add bowing techniques
      const allBowingTech = [
        ...pieceAnalysis.techniqueSummary.bowingTechniques,
        ...bowingAnalysis.bowStrokes.map(bs => bs.type),
      ];
      pieceAnalysis.techniqueSummary.bowingTechniques = [...new Set(allBowingTech)] as typeof pieceAnalysis.techniqueSummary.bowingTechniques;

      // Add bowing recommendations
      const bowingRecs = generateBowingRecommendations(bowingAnalysis);
      bowingRecs.forEach(rec => {
        if (!pieceAnalysis.practicePlan.warmUpSuggestions.includes(rec)) {
          pieceAnalysis.practicePlan.warmUpSuggestions.push(rec);
        }
      });

      // Add right-hand challenges to difficult sections
      const rightHandChallenges = generateRightHandChallenges(bowingAnalysis);
      for (const section of pieceAnalysis.difficultSections) {
        const relevantChallenges = rightHandChallenges.filter(c =>
          c.measureNumbers.some(m =>
            m >= section.measureRange.start && m <= section.measureRange.end
          )
        );
        section.challenges.push(...relevantChallenges);
      }
    }

    return pieceAnalysis;
  } catch (error) {
    logError('analyze-piece/pipeline', error);
    return null;
  }
};

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = rateLimit(request, RATE_LIMITS.AI_ANALYZE, 'analyze-piece');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return createErrorResponse('No file provided', 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return createErrorResponse(
        `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        400
      );
    }

    // Determine file type
    const fileType = getFileType(file.name, file.type);
    
    if (fileType === 'unknown') {
      return createErrorResponse(
        'Invalid file type. Please upload MusicXML (.xml, .musicxml), PDF, or image (JPG, PNG) files',
        400
      );
    }

    let analysis: PieceAnalysis | null = null;

    if (fileType === 'musicxml') {
      // Process MusicXML directly
      const content = await file.text();
      
      // Validate XML structure (basic security check)
      const maxXMLSize = 5 * 1024 * 1024; // 5MB max for XML
      if (content.length > maxXMLSize) {
        return createErrorResponse(
          'MusicXML file too large. Maximum size is 5MB.',
          400
        );
      }
      
      // Check for basic MusicXML structure
      if (!content.includes('<?xml') || !content.includes('score-partwise')) {
        return createErrorResponse(
          'Invalid MusicXML format. File must be a valid MusicXML document.',
          400
        );
      }
      
      // Check for potentially malicious XML patterns (XXE prevention)
      const dangerousPatterns = [
        /<!ENTITY[^>]+SYSTEM/i,
        /<!DOCTYPE[^>]+\[/i,
        /<!ENTITY[^>]+%/,
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(content)) {
          return createErrorResponse(
            'Invalid XML content detected.',
            400
          );
        }
      }

      const { musicXML, notes, metadata } = await processMusicXML(content);

      if (notes.length === 0) {
        return createErrorResponse(
          'Could not parse notes from MusicXML. Please check the file format.',
          400
        );
      }

      // Try AI analysis first
      analysis = await runAIAnalysisPipeline(musicXML, true, musicXML);

      // Fallback to local analysis if AI fails
      if (!analysis) {
        analysis = generateLocalPieceAnalysis(musicXML, notes, {
          title: metadata.title,
          keySignature: metadata.key,
          timeSignature: metadata.timeSignature,
          tempo: metadata.tempo,
          measures: metadata.measures,
        });
      }
    } else if (fileType === 'image' || fileType === 'pdf') {
      // Process image/PDF with Vision API
      if (!process.env.GOOGLE_AI_API_KEY) {
        return createErrorResponse(
          'Image and PDF analysis requires AI API key. Please upload a MusicXML file instead.',
          400
        );
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });
      const fileBuffer = await file.arrayBuffer();
      
      // For PDFs, we need to use the correct MIME type
      const mimeType = fileType === 'pdf' ? 'application/pdf' : file.type;
      
      const extractedData = await processImageOrPDF(fileBuffer, mimeType, model);

      if (!extractedData || extractedData.measures.length === 0) {
        return createErrorResponse(
          'Could not extract music notation from the file. Please try a clearer image or upload a MusicXML file.',
          400
        );
      }

      // Convert extracted data to MusicXML for display
      const generatedMusicXML = convertExtractedDataToMusicXML(extractedData);
      const notes = parseMusicXMLNotes(generatedMusicXML);

      // Run AI analysis
      analysis = await runAIAnalysisPipeline(extractedData, false, generatedMusicXML);

      // Fallback to local analysis
      if (!analysis) {
        analysis = generateLocalPieceAnalysis(generatedMusicXML, notes, {
          title: extractedData.title,
          keySignature: extractedData.keySignature,
          timeSignature: extractedData.timeSignature,
          tempo: extractedData.tempo,
          measures: extractedData.measures.length,
        });
      }
    }

    if (!analysis) {
      return createErrorResponse('Failed to analyze the piece', 500);
    }

    return NextResponse.json<AnalyzePieceResponse>({ analysis });
  } catch (error) {
    logError('analyze-piece', error);
    return createErrorResponse('Failed to analyze piece', 500, error);
  }
}

// GET endpoint to retrieve a saved analysis (placeholder for future database integration)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const analysisId = searchParams.get('id');

  if (!analysisId) {
    return createErrorResponse('Analysis ID required', 400);
  }

  // Placeholder - in a full implementation, this would fetch from database
  return createErrorResponse('Analysis retrieval not yet implemented', 501);
}

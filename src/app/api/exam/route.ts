import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultUser } from '@/lib/db';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

// Input validation
const MAX_GRADE = 8;
const MIN_GRADE = 0;

const validateExamInput = (data: {
  grade?: number;
}): { valid: boolean; error?: string } => {
  if (data.grade !== undefined) {
    if (typeof data.grade !== 'number' || data.grade < MIN_GRADE || data.grade > MAX_GRADE) {
      return { valid: false, error: `Grade must be between ${MIN_GRADE} and ${MAX_GRADE}` };
    }
  }

  return { valid: true };
};

// GET - Fetch exams for the authenticated user or a specific exam
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = rateLimit(request, RATE_LIMITS.STANDARD, 'exam-get');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get authenticated user (server-side only)
    const user = await getOrCreateDefaultUser();
    const userId = user.id;

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('id');

    if (examId) {
      // Fetch specific exam with ownership check
      const exam = await prisma.exam.findUnique({
        where: { id: examId },
        include: {
          components: true,
          certificate: true,
        },
      });

      if (!exam) {
        return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
      }

      // Verify ownership
      if (exam.userId !== userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      return NextResponse.json(exam);
    }

    // Fetch all exams for authenticated user
    const exams = await prisma.exam.findMany({
      where: { userId },
      include: {
        components: true,
        certificate: true,
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(exams);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[exam/GET]', message);
    return NextResponse.json(
      { error: 'Failed to fetch exams' },
      { status: 500 }
    );
  }
}

// POST - Create a new exam for the authenticated user
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = rateLimit(request, RATE_LIMITS.STANDARD, 'exam-post');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get authenticated user (server-side only)
    const user = await getOrCreateDefaultUser();
    const userId = user.id;

    const body = await request.json();
    const { grade, components } = body;

    const validation = validateExamInput({ grade });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Create exam with components for authenticated user
    const exam = await prisma.exam.create({
      data: {
        userId,
        grade,
        status: 'in_progress',
        maxScore: components?.reduce((sum: number, c: { maxScore: number }) => sum + c.maxScore, 0) || 100,
        components: {
          create: components?.map((c: {
            type: string;
            title: string;
            maxScore: number;
          }) => ({
            type: c.type,
            title: c.title,
            maxScore: c.maxScore,
          })) || [],
        },
      },
      include: {
        components: true,
      },
    });

    return NextResponse.json(exam, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[exam/POST]', message);
    return NextResponse.json(
      { error: 'Failed to create exam' },
      { status: 500 }
    );
  }
}

// PUT - Update exam (submit component results, complete exam)
export async function PUT(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = rateLimit(request, RATE_LIMITS.STANDARD, 'exam-put');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get authenticated user (server-side only)
    const user = await getOrCreateDefaultUser();
    const userId = user.id;

    const body = await request.json();
    const { examId, componentId, componentResult, completeExam } = body;

    if (!examId) {
      return NextResponse.json({ error: 'Exam ID required' }, { status: 400 });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { components: true },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Verify ownership
    if (exam.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update a component result
    if (componentId && componentResult) {
      await prisma.examComponent.update({
        where: { id: componentId },
        data: {
          score: componentResult.score,
          feedback: componentResult.feedback,
          analysis: componentResult.analysis ? JSON.stringify(componentResult.analysis) : null,
          audioData: componentResult.audioData,
          videoData: componentResult.videoData,
          completedAt: new Date(),
        },
      });
    }

    // Complete the exam
    if (completeExam) {
      const { totalScore, result, feedback } = completeExam;

      const updatedExam = await prisma.exam.update({
        where: { id: examId },
        data: {
          status: 'graded',
          totalScore,
          result,
          feedback,
          completedAt: new Date(),
          gradedAt: new Date(),
        },
        include: {
          components: true,
        },
      });

      // Create certificate if passed
      if (result !== 'fail') {
        const verificationCode = `VLN-${generateRandomString(4)}-${generateRandomString(4)}`;
        
        await prisma.certificate.create({
          data: {
            examId,
            grade: exam.grade,
            result,
            score: totalScore,
            verificationCode,
          },
        });
      }

      return NextResponse.json(updatedExam);
    }

    // Return updated exam
    const updatedExam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        components: true,
        certificate: true,
      },
    });

    return NextResponse.json(updatedExam);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[exam/PUT]', message);
    return NextResponse.json(
      { error: 'Failed to update exam' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an exam (only owner can delete)
export async function DELETE(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = rateLimit(request, RATE_LIMITS.STANDARD, 'exam-delete');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get authenticated user (server-side only)
    const user = await getOrCreateDefaultUser();
    const userId = user.id;

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('id');

    if (!examId) {
      return NextResponse.json({ error: 'Exam ID required' }, { status: 400 });
    }

    // Verify ownership before delete
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (exam.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await prisma.exam.delete({
      where: { id: examId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[exam/DELETE]', message);
    return NextResponse.json(
      { error: 'Failed to delete exam' },
      { status: 500 }
    );
  }
}

// Helper function to generate random string
const generateRandomString = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

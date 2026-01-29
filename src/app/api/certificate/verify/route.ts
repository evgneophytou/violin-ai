import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GRADE_NAMES } from '@/lib/ai/exam-grader-agent';
import { logError } from '@/lib/validation';

// GET - Verify a certificate by verification code
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code required' },
        { status: 400 }
      );
    }

    // Sanitize and validate code format
    const sanitizedCode = code.trim().toUpperCase();
    const codePattern = /^VLN-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

    if (!codePattern.test(sanitizedCode)) {
      return NextResponse.json(
        { valid: false, error: 'Invalid verification code format' },
        { status: 400 }
      );
    }

    // Look up certificate
    const certificate = await prisma.certificate.findUnique({
      where: { verificationCode: sanitizedCode },
      include: {
        exam: {
          include: {
            components: true,
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json({
        valid: false,
        message: 'Certificate not found',
      });
    }

    // Return verified certificate data
    return NextResponse.json({
      valid: true,
      certificate: {
        recipientName: certificate.recipientName || 'Name not provided',
        grade: GRADE_NAMES[certificate.grade as keyof typeof GRADE_NAMES] || `Grade ${certificate.grade}`,
        result: certificate.result,
        score: certificate.score,
        issuedAt: certificate.issuedAt.toISOString(),
        verificationCode: certificate.verificationCode,
        examDetails: {
          completedAt: certificate.exam.completedAt?.toISOString(),
          components: certificate.exam.components.map((c: { type: string; title: string | null; score: number | null; maxScore: number }) => ({
            type: c.type,
            title: c.title,
            score: c.score,
            maxScore: c.maxScore,
          })),
        },
      },
    });
  } catch (error) {
    logError('certificate/verify', error);
    return NextResponse.json(
      { error: 'Failed to verify certificate' },
      { status: 500 }
    );
  }
}

// POST - Update certificate with recipient name (when generating PDF)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { verificationCode, recipientName } = body;

    if (!verificationCode || !recipientName) {
      return NextResponse.json(
        { error: 'Verification code and recipient name required' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedCode = verificationCode.trim().toUpperCase();
    const sanitizedName = recipientName.trim().slice(0, 100);

    if (sanitizedName.length < 2) {
      return NextResponse.json(
        { error: 'Recipient name must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Update certificate
    const certificate = await prisma.certificate.update({
      where: { verificationCode: sanitizedCode },
      data: { recipientName: sanitizedName },
    });

    return NextResponse.json({
      success: true,
      certificate: {
        verificationCode: certificate.verificationCode,
        recipientName: certificate.recipientName,
      },
    });
  } catch (error) {
    logError('certificate/update', error);
    return NextResponse.json(
      { error: 'Failed to update certificate' },
      { status: 500 }
    );
  }
}

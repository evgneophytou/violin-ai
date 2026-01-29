'use client';

import { useState, useCallback } from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  Font,
} from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Download, Award, Share2, CheckCircle } from 'lucide-react';
import { GRADE_NAMES, type ExamGrade, type ExamResult } from '@/lib/ai/exam-grader-agent';

interface CertificateData {
  recipientName: string;
  grade: ExamGrade;
  result: ExamResult;
  score: number;
  maxScore: number;
  date: Date;
  verificationCode: string;
}

interface CertificateProps {
  examData: {
    grade: ExamGrade;
    result: ExamResult;
    score: number;
    maxScore: number;
    completedAt?: Date;
  };
  onGenerate?: (data: CertificateData) => void;
}

// Generate verification code
const generateVerificationCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'VLN-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i === 3) code += '-';
  }
  return code;
};

// PDF styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  border: {
    border: '3pt solid #1a365d',
    padding: 30,
    height: '100%',
  },
  innerBorder: {
    border: '1pt solid #c5a572',
    padding: 25,
    height: '100%',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
  },
  logo: {
    fontSize: 36,
    color: '#1a365d',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#4a5568',
    letterSpacing: 2,
  },
  title: {
    textAlign: 'center',
    marginVertical: 30,
  },
  certificateTitle: {
    fontSize: 28,
    color: '#1a365d',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  decorativeLine: {
    borderBottom: '2pt solid #c5a572',
    width: '50%',
    alignSelf: 'center',
    marginVertical: 15,
  },
  mainContent: {
    textAlign: 'center',
    marginVertical: 20,
  },
  presentedTo: {
    fontSize: 12,
    color: '#4a5568',
    marginBottom: 10,
  },
  recipientName: {
    fontSize: 32,
    color: '#1a365d',
    fontWeight: 'bold',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  achievement: {
    fontSize: 14,
    color: '#2d3748',
    lineHeight: 1.6,
    marginBottom: 10,
  },
  gradeBox: {
    backgroundColor: '#f7fafc',
    border: '1pt solid #e2e8f0',
    borderRadius: 4,
    padding: 15,
    marginVertical: 20,
    alignSelf: 'center',
    width: '60%',
  },
  gradeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a365d',
    textAlign: 'center',
  },
  resultBadge: {
    fontSize: 14,
    color: '#c5a572',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 5,
    textAlign: 'center',
  },
  scoreText: {
    fontSize: 12,
    color: '#4a5568',
    marginTop: 10,
    textAlign: 'center',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  dateSection: {
    width: '30%',
  },
  signatureSection: {
    width: '30%',
    textAlign: 'center',
  },
  verificationSection: {
    width: '30%',
    textAlign: 'right',
  },
  footerLabel: {
    fontSize: 8,
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footerValue: {
    fontSize: 11,
    color: '#2d3748',
    marginTop: 3,
  },
  signatureLine: {
    borderBottom: '1pt solid #2d3748',
    width: '100%',
    marginBottom: 5,
  },
  verificationCode: {
    fontSize: 9,
    color: '#718096',
    fontFamily: 'Courier',
    marginTop: 5,
  },
  verifyUrl: {
    fontSize: 7,
    color: '#a0aec0',
    marginTop: 2,
  },
});

// Certificate PDF Document
const CertificateDocument = ({ data }: { data: CertificateData }) => {
  const resultText = {
    distinction: 'with Distinction',
    merit: 'with Merit',
    pass: '',
    fail: '',
  };

  const percentage = Math.round((data.score / data.maxScore) * 100);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.border}>
          <View style={styles.innerBorder}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.logo}>🎻 Violin AI</Text>
              <Text style={styles.subtitle}>MUSIC EDUCATION PLATFORM</Text>
            </View>

            {/* Title */}
            <View style={styles.title}>
              <Text style={styles.certificateTitle}>Certificate of Achievement</Text>
              <View style={styles.decorativeLine} />
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
              <Text style={styles.presentedTo}>This is to certify that</Text>
              <Text style={styles.recipientName}>{data.recipientName}</Text>
              <Text style={styles.achievement}>
                has successfully completed the examination requirements for
              </Text>
            </View>

            {/* Grade Box */}
            <View style={styles.gradeBox}>
              <Text style={styles.gradeName}>{GRADE_NAMES[data.grade]}</Text>
              {resultText[data.result] && (
                <Text style={styles.resultBadge}>{resultText[data.result]}</Text>
              )}
              <Text style={styles.scoreText}>
                Score: {data.score}/{data.maxScore} ({percentage}%)
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.footerRow}>
                <View style={styles.dateSection}>
                  <Text style={styles.footerLabel}>Date Issued</Text>
                  <Text style={styles.footerValue}>
                    {formatDate(data.date)}
                  </Text>
                </View>

                <View style={styles.signatureSection}>
                  <View style={styles.signatureLine} />
                  <Text style={styles.footerLabel}>Director of Examinations</Text>
                </View>

                <View style={styles.verificationSection}>
                  <Text style={styles.footerLabel}>Verification Code</Text>
                  <Text style={styles.verificationCode}>{data.verificationCode}</Text>
                  <Text style={styles.verifyUrl}>verify at: violin-ai.app/verify</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// Format date for certificate
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Main Certificate component
export const Certificate = ({ examData, onGenerate }: CertificateProps) => {
  const [recipientName, setRecipientName] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);

  const handleGenerate = useCallback(() => {
    if (!recipientName.trim()) return;

    const data: CertificateData = {
      recipientName: recipientName.trim(),
      grade: examData.grade,
      result: examData.result,
      score: examData.score,
      maxScore: examData.maxScore,
      date: examData.completedAt || new Date(),
      verificationCode: generateVerificationCode(),
    };

    setCertificateData(data);
    setIsGenerated(true);
    onGenerate?.(data);
  }, [recipientName, examData, onGenerate]);

  const handleReset = useCallback(() => {
    setIsGenerated(false);
    setCertificateData(null);
    setRecipientName('');
  }, []);

  if (examData.result === 'fail') {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">
            Certificates are only issued for passing grades.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Your Certificate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isGenerated ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="recipientName">Name on Certificate</Label>
              <Input
                id="recipientName"
                placeholder="Enter your full name"
                value={recipientName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipientName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This name will appear on your certificate
              </p>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!recipientName.trim()}
              className="w-full gap-2"
            >
              <Award className="h-4 w-4" />
              Generate Certificate
            </Button>
          </>
        ) : certificateData ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-600">Certificate Generated!</p>
                <p className="text-sm text-muted-foreground">
                  Verification code: {certificateData.verificationCode}
                </p>
              </div>
            </div>

            {/* Certificate Preview (simplified) */}
            <div className="border rounded-lg p-6 bg-gradient-to-br from-slate-50 to-slate-100 text-center space-y-3">
              <div className="text-2xl">🎻</div>
              <h3 className="font-bold text-lg">Certificate of Achievement</h3>
              <p className="text-sm text-muted-foreground">Presented to</p>
              <p className="text-xl font-semibold italic">{certificateData.recipientName}</p>
              <p className="text-sm">for completing</p>
              <p className="font-bold">{GRADE_NAMES[certificateData.grade]}</p>
              {certificateData.result !== 'pass' && (
                <p className="text-sm capitalize text-amber-600">
                  with {certificateData.result}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <PDFDownloadLink
                document={<CertificateDocument data={certificateData} />}
                fileName={`violin-ai-certificate-${certificateData.verificationCode}.pdf`}
              >
                {({ loading }) => (
                  <Button disabled={loading} className="gap-2">
                    <Download className="h-4 w-4" />
                    {loading ? 'Generating PDF...' : 'Download PDF'}
                  </Button>
                )}
              </PDFDownloadLink>

              <Button variant="outline" className="gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>

              <Button variant="ghost" onClick={handleReset}>
                Edit Name
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

// API endpoint types for certificate verification
export interface CertificateVerificationRequest {
  code: string;
}

export interface CertificateVerificationResponse {
  valid: boolean;
  certificate?: {
    recipientName: string;
    grade: string;
    result: string;
    score: number;
    issuedAt: string;
  };
}

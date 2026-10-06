import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge as BadgeUI } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2, Share2, Download, ExternalLink } from 'lucide-react';

export const Route = createFileRoute('/verify/badge/$badgeCode')({
  component: BadgeVerificationPage,
});

interface VerifiableBadge {
  id: string;
  badgeCode: string;
  earnerName: string;
  competencyTitle: string;
  competencyDescription: string;
  dateEarned: Date;
  issuer: string;
  issuerLogo: string;
  relatedJobTitles: string[];
  projectEvidenceUrl?: string;
  projectTitle?: string;
  projectGrade?: number;
  verificationLevel: 'verified' | 'unverified' | 'expired';
}

function BadgeVerificationPage() {
  const { badgeCode } = Route.useParams();
  const [badge, setBadge] = useState<VerifiableBadge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Mock: Fetch badge verification data
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      // Mock lookup
      if (badgeCode === 'APIDEV-2026-ABC123' || badgeCode) {
        setBadge({
          id: 'badge-1',
          badgeCode,
          earnerName: 'Jane Smith',
          competencyTitle: 'API Design & Development',
          competencyDescription: 'Demonstrates proficiency in designing, building, and deploying RESTful APIs with proper authentication, error handling, and documentation.',
          dateEarned: new Date('2026-09-15'),
          issuer: 'Arcane',
          issuerLogo: '/arcane-logo.png',
          relatedJobTitles: ['Junior Backend Developer', 'API Developer', 'Full Stack Engineer'],
          projectEvidenceUrl: 'https://github.com/janesmith/api-capstone',
          projectTitle: 'E-commerce Product API',
          projectGrade: 88,
          verificationLevel: 'verified',
        });
      } else {
        setNotFound(true);
      }
      setIsLoading(false);
    }, 500);
  }, [badgeCode]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (notFound || !badge) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Badge Not Found</h1>
            <p className="text-gray-600">
              The badge code "{badgeCode}" could not be verified. Please check the code and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Verification Status */}
        {badge.verificationLevel === 'verified' && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ✓ This badge has been verified as authentic and current as of {new Date().toLocaleDateString()}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Badge Card */}
        <Card className="overflow-hidden shadow-xl mb-6">
          <CardContent className="p-8 space-y-6">
            {/* Header with Badge Image */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
                <div className="text-center">
                  <div className="text-5xl">🏆</div>
                </div>
              </div>

              <h1 className="text-3xl font-bold mb-2">{badge.competencyTitle}</h1>
              <p className="text-gray-600">Digital Credential</p>
            </div>

            {/* Badge Metadata */}
            <div className="grid grid-cols-2 gap-4 text-center py-4 border-t border-b">
              <div>
                <div className="text-sm text-gray-600">Earner</div>
                <div className="font-bold text-lg">{badge.earnerName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Issued</div>
                <div className="font-bold text-lg">{badge.dateEarned.toLocaleDateString()}</div>
              </div>
            </div>

            {/* Issuer Info */}
            <div className="flex items-center justify-center gap-2">
              <div className="text-sm text-gray-600">Verified by</div>
              <BadgeUI className="bg-blue-600">
                <span className="font-bold">{badge.issuer}</span>
              </BadgeUI>
            </div>

            {/* Description */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Competency Definition</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {badge.competencyDescription}
              </p>
            </div>

            {/* Job Titles */}
            <div>
              <h3 className="font-semibold mb-3">Related Career Paths</h3>
              <div className="flex flex-wrap gap-2">
                {badge.relatedJobTitles.map((title, idx) => (
                  <BadgeUI key={idx} variant="secondary" className="text-sm">
                    {title}
                  </BadgeUI>
                ))}
              </div>
            </div>

            {/* Project Evidence */}
            {badge.projectEvidenceUrl && badge.projectTitle && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Project Evidence</h3>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-gray-600">Project Title</div>
                    <div className="font-medium">{badge.projectTitle}</div>
                  </div>
                  {badge.projectGrade && (
                    <div>
                      <div className="text-sm text-gray-600">Grade</div>
                      <div className="font-bold text-lg text-green-600">{badge.projectGrade}%</div>
                    </div>
                  )}
                  <a
                    href={badge.projectEvidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:underline mt-3"
                  >
                    View Project Evidence <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            )}

            {/* Badge Code */}
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Badge Code</div>
              <div className="font-mono text-sm break-all font-semibold">
                {badge.badgeCode}
              </div>
            </div>

            {/* Share Options */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600 font-medium mb-2">Share This Badge</div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share on LinkedIn
                </Button>
                <Button variant="outline" className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share on Twitter
                </Button>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Badge
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                  }}
                >
                  Copy Link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Verification Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Badge Code</span>
              <span className="font-mono">{badge.badgeCode}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-gray-600">Issued By</span>
              <span className="font-medium">{badge.issuer}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-gray-600">Issue Date</span>
              <span>{badge.dateEarned.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-gray-600">Status</span>
              <BadgeUI className="bg-green-600 text-white">
                {badge.verificationLevel === 'verified' ? '✓ Verified' : 'Unverified'}
              </BadgeUI>
            </div>
            <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded border-t pt-3">
              This badge represents verified mastery demonstrated through both a comprehensive assessment and practical project submission.
            </div>
          </CardContent>
        </Card>

        {/* Back to Profile */}
        <div className="text-center mt-8">
          <a href="/certificates/competency-profile" className="text-blue-600 hover:underline">
            ← Back to Competency Profile
          </a>
        </div>
      </div>
    </div>
  );
}

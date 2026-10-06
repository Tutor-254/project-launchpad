import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Download, Share2, Trophy, Calendar, Award, ExternalLink } from 'lucide-react';

export const Route = createFileRoute('/certificates/competency-profile')({
  component: CompetencyProfilePage,
});

interface Badge {
  id: string;
  competencyTitle: string;
  competencyId: string;
  badgeCode: string;
  dateEarned: Date;
  assessmentPassedAt: Date;
  projectPassedAt: Date;
  badgeImageUrl: string;
  verificationUrl: string;
  relatedJobTitles: string[];
}

function CompetencyProfilePage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'link'>('pdf');
  const [publicShareText, setPublicShareText] = useState('');
  const [shareableLink, setShareableLink] = useState<string | null>(null);

  // Mock: Load user's earned badges
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      setBadges([
        {
          id: 'badge-1',
          competencyTitle: 'API Design & Development',
          competencyId: 'comp-1',
          badgeCode: 'APIDEV-2026-ABC123',
          dateEarned: new Date('2026-09-15'),
          assessmentPassedAt: new Date('2026-09-10'),
          projectPassedAt: new Date('2026-09-15'),
          badgeImageUrl: '/badges/api-design.png',
          verificationUrl: '/verify/badge/APIDEV-2026-ABC123',
          relatedJobTitles: ['Junior Backend Developer', 'API Developer', 'Full Stack Engineer'],
        },
        {
          id: 'badge-2',
          competencyTitle: 'Cloud Deployment',
          competencyId: 'comp-3',
          badgeCode: 'CLOUDDEP-2026-XYZ789',
          dateEarned: new Date('2026-09-22'),
          assessmentPassedAt: new Date('2026-09-18'),
          projectPassedAt: new Date('2026-09-22'),
          badgeImageUrl: '/badges/cloud-deployment.png',
          verificationUrl: '/verify/badge/CLOUDDEP-2026-XYZ789',
          relatedJobTitles: ['DevOps Engineer', 'Cloud Architect', 'Solutions Engineer'],
        },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  const handleExportPDF = () => {
    // Mock PDF export
    const content = `
COMPETENCY PROFILE - SKILLS CERTIFICATE

Learner: John Doe
Generated: ${new Date().toLocaleDateString()}

BADGES EARNED
${badges
  .map(
    (badge) => `
${badge.competencyTitle}
Earned: ${badge.dateEarned.toLocaleDateString()}
Verification: ${badge.verificationUrl}
Related Roles: ${badge.relatedJobTitles.join(', ')}
`
  )
  .join('\n')}

Recommendation: ${badges.length} professional competencies demonstrated.
    `.trim();

    const element = document.createElement('a');
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`);
    element.setAttribute('download', `competency-profile-${new Date().toISOString().split('T')[0]}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCreatePublicLink = () => {
    const link = `${window.location.origin}/public/competency-profile/${Math.random().toString(36).substring(7)}`;
    setShareableLink(link);
  };

  const handleCopyLink = () => {
    if (shareableLink) {
      navigator.clipboard.writeText(shareableLink);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Your Competency Profile</h1>
          <p className="text-gray-600">Professional skills verified through mastery-based assessment</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-3xl font-bold">{badges.length}</div>
              <div className="text-sm text-gray-600">Badges Earned</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Award className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-3xl font-bold">
                {Array.from(new Set(badges.flatMap((b) => b.relatedJobTitles))).length}
              </div>
              <div className="text-sm text-gray-600">Career Opportunities</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-sm text-gray-600">Last Badge</div>
              <div className="text-lg font-bold">
                {badges.length > 0 ? badges[badges.length - 1].dateEarned.toLocaleDateString() : 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="mb-8 flex flex-wrap gap-3">
          <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Download className="h-4 w-4" />
                Export Skills
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Your Skills Profile</DialogTitle>
                <DialogDescription>
                  Download your competency profile in your preferred format
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Button
                  onClick={handleExportPDF}
                  variant="outline"
                  className="w-full justify-start text-left"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download as PDF
                </Button>
                <Button
                  onClick={handleCreatePublicLink}
                  variant="outline"
                  className="w-full justify-start text-left"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Create Shareable Link
                </Button>
                {shareableLink && (
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                    <p className="text-sm text-gray-600">Your public link:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={shareableLink}
                        readOnly
                        className="flex-1 px-3 py-2 border rounded text-sm"
                      />
                      <Button
                        onClick={handleCopyLink}
                        size="sm"
                        variant="outline"
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share on LinkedIn
          </Button>

          <Button variant="outline" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share on Twitter
          </Button>
        </div>

        {/* Badges Grid */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Badges Earned</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {badges.map((badge) => (
              <Card key={badge.id} className="overflow-hidden hover:shadow-lg transition">
                <CardContent className="p-6 space-y-4">
                  {/* Badge Image */}
                  <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center">
                    <div className="text-center">
                      <Award className="h-16 w-16 text-yellow-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Badge Image</p>
                    </div>
                  </div>

                  {/* Badge Info */}
                  <div>
                    <h3 className="font-semibold text-lg">{badge.competencyTitle}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Earned {badge.dateEarned.toLocaleDateString()}
                    </p>
                  </div>

                  {/* Timeline */}
                  <div className="text-xs space-y-2 p-3 bg-gray-50 rounded">
                    <div className="flex justify-between">
                      <span>Assessment Passed:</span>
                      <span>{badge.assessmentPassedAt.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Project Submitted:</span>
                      <span>{badge.projectPassedAt.toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Job Titles */}
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">Related Career Paths:</p>
                    <div className="flex flex-wrap gap-2">
                      {badge.relatedJobTitles.map((title, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {title}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Verification Link */}
                  <a
                    href={badge.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                  >
                    Verify Badge <ExternalLink className="h-3 w-3" />
                  </a>

                  {/* Badge Code */}
                  <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded font-mono break-all">
                    {badge.badgeCode}
                  </div>

                  {/* Share Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    Share This Badge
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Career Recommendations */}
        {badges.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Recommended Career Paths</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from(new Set(badges.flatMap((b) => b.relatedJobTitles))).map((title, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{title}</span>
                    <Button variant="outline" size="sm">
                      Learn More
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

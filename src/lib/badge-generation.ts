import { v4 as uuidv4 } from 'uuid';

/**
 * Task 33.2: Badge generation and storage utilities
 * 
 * Provides functions for:
 * - Generating unique badge codes
 * - Creating badge images/SVG
 * - Uploading to storage
 */

/**
 * 33.2c: Generate unique badge code for verification
 * Format: BADGE-{UUID_SHORT}-{TIMESTAMP}
 * Example: BADGE-a1b2c3d4-1672531200
 */
export function generateBadgeCode(): string {
  const uuid = uuidv4().split('-')[0]; // Take first 8 chars
  const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp
  return `BADGE-${uuid.toUpperCase()}-${timestamp}`;
}

/**
 * 33.2a: Generate badge image as SVG string
 * Creates a visual badge design with competency title, earner name, and date
 */
export function generateBadgeSvg(
  competencyTitle: string,
  earnerName: string,
  dateEarned: Date
): string {
  const formattedDate = dateEarned.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // SVG template for badge design
  // Star-shaped badge with competency info
  const svg = `
    <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
      <defs>
        <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
        </linearGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Star background (badges are often star-shaped) -->
      <circle cx="150" cy="150" r="140" fill="url(#badgeGradient)" filter="url(#shadow)"/>
      
      <!-- Badge circle highlight -->
      <circle cx="150" cy="150" r="135" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
      
      <!-- Competency title -->
      <text 
        x="150" 
        y="120" 
        font-size="20" 
        font-weight="bold" 
        text-anchor="middle" 
        fill="white"
        font-family="Arial, sans-serif"
      >
        ${truncateText(competencyTitle, 20)}
      </text>
      
      <!-- "Mastery Badge" label -->
      <text 
        x="150" 
        y="145" 
        font-size="14" 
        text-anchor="middle" 
        fill="rgba(255,255,255,0.9)"
        font-family="Arial, sans-serif"
      >
        Mastery Badge
      </text>
      
      <!-- Earner name -->
      <text 
        x="150" 
        y="170" 
        font-size="12" 
        text-anchor="middle" 
        fill="rgba(255,255,255,0.8)"
        font-family="Arial, sans-serif"
      >
        Earned by: ${truncateText(earnerName, 25)}
      </text>
      
      <!-- Date earned -->
      <text 
        x="150" 
        y="195" 
        font-size="11" 
        text-anchor="middle" 
        fill="rgba(255,255,255,0.7)"
        font-family="Arial, sans-serif"
      >
        ${formattedDate}
      </text>
      
      <!-- Checkmark or certificate icon -->
      <text 
        x="150" 
        y="230" 
        font-size="24" 
        text-anchor="middle" 
        fill="rgba(255,255,255,0.9)"
        font-family="Arial, sans-serif"
      >
        ✓
      </text>
    </svg>
  `;

  return svg.trim();
}

/**
 * Helper: Truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * 33.2a: Generate badge image as PNG buffer (using SVG-to-PNG conversion)
 * In production, this would use a library like 'sharp' or 'canvas'
 * 
 * For now, we return the SVG string which can be rendered client-side
 * or converted using an external service
 */
export async function generateBadgeImage(
  competencyTitle: string,
  earnerName: string,
  dateEarned: Date
): Promise<string> {
  try {
    // Generate SVG badge
    const svg = generateBadgeSvg(competencyTitle, earnerName, dateEarned);

    // In production, convert SVG to PNG buffer using sharp or canvas
    // For now, return SVG as data URL that can be used in browser
    const svgBuffer = Buffer.from(svg, 'utf-8');
    const dataUrl = `data:image/svg+xml;base64,${svgBuffer.toString('base64')}`;

    // TODO: Use sharp or canvas library to convert to PNG for server-side generation
    // const canvas = await svg2png(svg);
    // return canvas;

    return dataUrl;
  } catch (error) {
    console.error('Error generating badge image:', error);
    throw new Error(`Failed to generate badge image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 33.2b: Upload badge image to storage
 * Returns signed URL for the uploaded badge image
 * 
 * TODO: Implement with actual Supabase storage calls
 */
export async function uploadBadgeImage(
  badgeCode: string,
  imageBuffer: Buffer | string
): Promise<string> {
  try {
    // TODO: Implement with real Supabase storage calls
    // 1. Upload to supabase-storage/badge-images/{badgeCode}.png
    // 2. Set public access or generate signed URL
    // 3. Return URL

    // Mock implementation - return a placeholder URL
    // In production, this would upload to Supabase Storage and return a signed URL
    const mockStorageUrl = `https://storage.example.com/badge-images/${badgeCode}.png`;

    return mockStorageUrl;
  } catch (error) {
    console.error('Error uploading badge image:', error);
    throw new Error(`Failed to upload badge image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate badge metadata object
 */
export interface BadgeMetadata {
  badgeCode: string;
  competencyTitle: string;
  earnerName: string;
  earnerEmail?: string;
  dateEarned: Date;
  issuer: string;
  description: string;
  imageUrl: string;
  verificationUrl: string;
}

export async function generateBadgeMetadata(
  competencyTitle: string,
  earnerName: string,
  earnerEmail: string | undefined,
  competencyId: string,
  issuer: string = 'Arcane'
): Promise<BadgeMetadata> {
  const badgeCode = generateBadgeCode();
  const dateEarned = new Date();

  // TODO: Generate and upload badge image
  // const imageBuffer = await generateBadgeImage(competencyTitle, earnerName, dateEarned);
  // const imageUrl = await uploadBadgeImage(badgeCode, imageBuffer);

  // Mock implementation
  const imageUrl = await generateBadgeImage(competencyTitle, earnerName, dateEarned);

  return {
    badgeCode,
    competencyTitle,
    earnerName,
    earnerEmail,
    dateEarned,
    issuer,
    description: `${earnerName} has demonstrated mastery of ${competencyTitle}`,
    imageUrl,
    verificationUrl: `https://arcane.example.com/verify/badge/${badgeCode}`,
  };
}

/**
 * Format badge for sharing on social media
 */
export function formatBadgeForSharing(
  badge: BadgeMetadata,
  platform: 'linkedin' | 'twitter' | 'email'
): { title: string; description: string; url: string } {
  const verificationUrl = badge.verificationUrl;

  switch (platform) {
    case 'linkedin':
      return {
        title: `${badge.earnerName} earned ${badge.competencyTitle} Mastery Badge`,
        description: `I just earned the ${badge.competencyTitle} Mastery Badge from ${badge.issuer}! ${badge.description}. Verify my badge: ${verificationUrl}`,
        url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verificationUrl)}`,
      };

    case 'twitter':
      return {
        title: `Badge: ${badge.competencyTitle}`,
        description: `I just earned the ${badge.competencyTitle} Mastery Badge from ${badge.issuer}! Verify: ${verificationUrl}`,
        url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just earned the ${badge.competencyTitle} Mastery Badge! ${verificationUrl}`)}`,
      };

    case 'email':
      return {
        title: `Check out my ${badge.competencyTitle} Mastery Badge!`,
        description: `${badge.description}\n\nVerify my badge: ${verificationUrl}`,
        url: `mailto:?subject=${encodeURIComponent(`Check out my ${badge.competencyTitle} Mastery Badge!`)}&body=${encodeURIComponent(badge.description + '\n\n' + verificationUrl)}`,
      };

    default:
      return {
        title: badge.competencyTitle,
        description: badge.description,
        url: verificationUrl,
      };
  }
}

/**
 * Check if badge code is valid format
 */
export function isValidBadgeCode(badgeCode: string): boolean {
  // Badge code format: BADGE-{UUID_SHORT}-{TIMESTAMP}
  const badgeCodePattern = /^BADGE-[A-F0-9]{8}-\d{10}$/;
  return badgeCodePattern.test(badgeCode);
}

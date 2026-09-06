import { SERVER_URL } from '../services/socket';

/**
 * Extracts Google Drive File ID from various link formats:
 * - https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I/view?usp=sharing
 * - https://drive.google.com/open?id=1A2B3C4D5E6F7G8H9I
 * - https://drive.google.com/uc?id=1A2B3C4D5E6F7G8H9I
 */
export function extractGoogleDriveId(url) {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  // Pattern 1: /file/d/FILE_ID/
  const fileDPattern = /\/file\/d\/([a-zA-Z0-9_-]+)/;
  const matchD = trimmed.match(fileDPattern);
  if (matchD && matchD[1]) return matchD[1];

  // Pattern 2: id=FILE_ID
  const idParamPattern = /[?&]id=([a-zA-Z0-9_-]+)/;
  const matchId = trimmed.match(idParamPattern);
  if (matchId && matchId[1]) return matchId[1];

  return null;
}

/**
 * Converts a Google Drive link or direct video URL into a direct stream URL.
 */
export function parseVideoUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') return null;

  const url = inputUrl.trim();
  const driveId = extractGoogleDriveId(url);

  if (driveId) {
    return {
      isGoogleDrive: true,
      driveId,
      // Express proxy route handles CORS, Range requests, and Google Drive 302 redirects seamlessly
      streamUrl: `${SERVER_URL}/api/videos/drive-proxy/${driveId}`,
      fallbackUrl: `https://drive.google.com/uc?export=download&id=${driveId}`
    };
  }

  // Regular direct video URL (e.g. .mp4, .webm, .mkv, .mov)
  if (url.match(/^https?:\/\/.+/i)) {
    return {
      isGoogleDrive: false,
      driveId: null,
      streamUrl: url,
      fallbackUrl: url
    };
  }

  return null;
}

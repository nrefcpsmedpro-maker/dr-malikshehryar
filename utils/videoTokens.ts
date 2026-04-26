import { createHash, createHmac, timingSafeEqual } from 'crypto';

type VideoPlaybackPayload = {
  userId: string;
  courseId: string;
  lessonId: string;
  youtubeId: string;
  userAgentHash: string;
  exp: number;
};

type VideoPlaybackClaims = Omit<VideoPlaybackPayload, 'exp'>;

const DEV_FALLBACK_SECRET = 'local-dev-video-secret-change-me';

function getPlaybackSecret() {
  return process.env.VIDEO_PLAYBACK_SECRET || process.env.NEXTAUTH_SECRET || DEV_FALLBACK_SECRET;
}

function signPayload(encodedPayload: string) {
  return createHmac('sha256', getPlaybackSecret())
    .update(encodedPayload)
    .digest('base64url');
}

export function hashUserAgent(userAgent: string | null | undefined) {
  if (!userAgent) {
    return 'unknown';
  }

  return createHash('sha256')
    .update(userAgent)
    .digest('hex')
    .slice(0, 32);
}

export function createVideoPlaybackToken(claims: VideoPlaybackClaims, ttlSeconds = 120) {
  const payload: VideoPlaybackPayload = {
    ...claims,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyVideoPlaybackToken(token: string) {
  const [encodedPayload, signature] = token.split('.');

  if (!encodedPayload || !signature) {
    return { isValid: false as const, reason: 'Malformed token' };
  }

  const expectedSignature = signPayload(encodedPayload);

  if (signature.length !== expectedSignature.length) {
    return { isValid: false as const, reason: 'Invalid signature' };
  }

  const isValidSignature = timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );

  if (!isValidSignature) {
    return { isValid: false as const, reason: 'Invalid signature' };
  }

  let payload: VideoPlaybackPayload;

  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return { isValid: false as const, reason: 'Invalid payload' };
  }

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return { isValid: false as const, reason: 'Expired token' };
  }

  return { isValid: true as const, payload };
}

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { hashUserAgent, verifyVideoPlaybackToken } from '@/utils/videoTokens';

type LessonAccess = {
  course_id: string;
  youtube_id: string;
  is_locked: boolean;
  subjects: { is_locked: boolean } | null;
};

export const dynamic = 'force-dynamic';

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (origin && origin !== url.origin) {
    return jsonError('Invalid origin', 403);
  }

  if (referer && !referer.startsWith(url.origin)) {
    return jsonError('Invalid referer', 403);
  }

  if (!token) {
    return jsonError('Missing playback token', 400);
  }

  const verification = verifyVideoPlaybackToken(token);

  if (!verification.isValid) {
    return jsonError(verification.reason, 401);
  }

  const cookieStore = await cookies();
  const headerStore = await headers();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError('Unauthorized', 401);
  }

  const currentUserAgentHash = hashUserAgent(headerStore.get('user-agent'));
  const { payload } = verification;

  if (payload.userId !== user.id || payload.userAgentHash !== currentUserAgentHash) {
    return jsonError('Token context mismatch', 401);
  }

  const [{ data: lesson, error: lessonError }, { data: profile }] = await Promise.all([
    supabase
      .from('lessons')
      .select('course_id, youtube_id, is_locked, subjects(is_locked)')
      .eq('id', payload.lessonId)
      .single(),
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single(),
  ]);

  if (lessonError || !lesson) {
    return jsonError('Lesson not found', 404);
  }

  const lessonData = lesson as unknown as LessonAccess;

  if (lessonData.course_id !== payload.courseId || lessonData.youtube_id !== payload.youtubeId) {
    return jsonError('Token does not match lesson', 401);
  }

  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
    const isLocked = lessonData.is_locked || lessonData.subjects?.is_locked;

    if (isLocked) {
      return jsonError('Lesson is locked', 403);
    }

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('course_id', lessonData.course_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!enrollment) {
      return jsonError('Enrollment required', 403);
    }
  }

  return NextResponse.json(
    {
      videoId: lessonData.youtube_id,
      expiresAt: payload.exp,
    },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    },
  );
}

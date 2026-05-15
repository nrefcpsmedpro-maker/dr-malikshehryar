'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

async function getAdminSupabaseClient() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  return supabase;
}

// == INITIALIZATION ==
export async function createCourseAction(formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const thumbnail_url = formData.get('thumbnail_url') as string;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from('courses')
    .insert([{ title, description, thumbnail_url: thumbnail_url || null }])
    .select()
    .single();

  if (error || !data) {
    console.error("Error creating course", error);
    redirect('/admin/courses?error=Failed to create course');
  }

  revalidatePath('/admin/courses');
  // No longer redirecting to the builder page, instead reload index
  redirect('/admin/courses');
}

export async function updateCourseAction(formData: FormData) {
  const courseId = formData.get('courseId') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const thumbnail_url = formData.get('thumbnail_url') as string;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  await supabase
    .from('courses')
    .update({ title, description, thumbnail_url: thumbnail_url || null })
    .eq('id', courseId);

  revalidatePath('/admin/courses');
}

export async function deleteCourseAction(formData: FormData) {
  const courseId = formData.get('courseId') as string;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);

  revalidatePath('/admin/courses');
}

// == FETCH CURRENT DATA ==
export async function getCourseData(courseId: string) {
  const supabase = await getAdminSupabaseClient();
  
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      subjects (
         *,
         lessons (*)
      ),
      mock_tests (*),
      enrollments (
         id, created_at, profiles(email, full_name, is_approved)
      )
    `)
    .eq('id', courseId)
    .single();

  if (error) {
    console.error(error);
    return null;
  }
  return data;
}

export async function getManageStudentsData(courseId: string) {
  const supabase = await getAdminSupabaseClient();

  const [{ data: course, error: courseError }, { data: students, error: studentsError }] = await Promise.all([
    supabase
      .from('courses')
      .select(`
        id,
        title,
        enrollments (
          id,
          user_id,
          created_at,
          profiles(email, full_name, is_approved)
        )
      `)
      .eq('id', courseId)
      .single(),
    supabase
      .from('profiles')
      .select('id, email, full_name, is_approved')
      .eq('role', 'student')
      .order('email', { ascending: true }),
  ]);

  if (courseError || studentsError) {
    console.error(courseError || studentsError);
    return null;
  }

  return {
    course,
    students: students ?? [],
  };
}

// == CURRICULUM ==
export async function addSubjectAction(courseId: string, formData: FormData) {
  const title = formData.get('title') as string;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  await supabase
    .from('subjects')
    .insert([{ course_id: courseId, title }]);
  
  revalidatePath(`/admin/courses`);
}

export async function updateSubjectAction(courseId: string, formData: FormData) {
  const subjectId = formData.get('subjectId') as string;
  const title = formData.get('title') as string;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  await supabase.from('subjects').update({ title }).eq('id', subjectId);
  revalidatePath(`/admin/courses`);
}

export async function removeSubjectAction(courseId: string, formData: FormData) {
  const subjectId = formData.get('subjectId') as string;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.from('subjects').delete().eq('id', subjectId);
  revalidatePath(`/admin/courses`);
}

export async function addLessonAction(courseId: string, formData: FormData) {
  const title = formData.get('title') as string;
  const youtube_id = formData.get('youtube_id') as string;
  const subject_id = formData.get('subject_id') as string;

  const cleanId = youtube_id.includes('v=') ? youtube_id.split('v=')[1].split('&')[0] : youtube_id.split('/').pop() || youtube_id;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  await supabase
    .from('lessons')
    .insert([{ course_id: courseId, subject_id, title, youtube_id: cleanId }]);
  
  revalidatePath(`/admin/courses`);
}

export async function updateLessonAction(courseId: string, formData: FormData) {
  const lessonId = formData.get('lessonId') as string;
  const title = formData.get('title') as string;
  let youtube_id = formData.get('youtube_id') as string;

  if (youtube_id.includes('v=')) {
     youtube_id = youtube_id.split('v=')[1].split('&')[0];
  } else if (youtube_id.includes('/')) {
     youtube_id = youtube_id.split('/').pop() || youtube_id;
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  await supabase.from('lessons').update({ title, youtube_id }).eq('id', lessonId);
  revalidatePath(`/admin/courses`);
}

export async function removeLessonAction(courseId: string, formData: FormData) {
  const lessonId = formData.get('lessonId') as string;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.from('lessons').delete().eq('id', lessonId);
  revalidatePath(`/admin/courses`);
}

// == STUDENTS ==
export async function enrollStudentAction(courseId: string, formData: FormData) {
  const userId = formData.get('userId');

  if (typeof userId !== 'string' || !userId) {
    console.error('Student selection is required');
    return;
  }

  const supabase = await getAdminSupabaseClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .eq('role', 'student')
    .maybeSingle();

  if (profile) {
     const { error } = await supabase
       .from('enrollments')
       .insert([{ user_id: profile.id, course_id: courseId }]);

     if (error && error.code !== '23505') {
       console.error('Error enrolling student', error);
       return;
     }

     revalidatePath(`/admin/courses`);
     revalidatePath('/admin/users');
     revalidatePath('/dashboard');
  } else {
     console.error('Student not found');
  }
}

export async function unenrollStudentAction(courseId: string, formData: FormData) {
  const enrollmentId = formData.get('enrollmentId');

  if (typeof enrollmentId !== 'string' || !enrollmentId) {
    console.error('Enrollment selection is required');
    return;
  }

  const supabase = await getAdminSupabaseClient();
  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('id', enrollmentId)
    .eq('course_id', courseId);

  if (error) {
    console.error('Error removing enrollment', error);
    return;
  }

  revalidatePath('/admin/courses');
  revalidatePath('/admin/users');
  revalidatePath('/dashboard');
}

export async function toggleSubjectLockAction(courseId: string, formData: FormData) {
  const subjectId = formData.get('subjectId');
  const isLocked = formData.get('isLocked') === 'true';

  if (typeof subjectId !== 'string' || !subjectId) {
    console.error('Subject selection is required');
    return;
  }

  const supabase = await getAdminSupabaseClient();
  const { error } = await supabase
    .from('subjects')
    .update({ is_locked: !isLocked })
    .eq('id', subjectId)
    .eq('course_id', courseId);

  if (error) {
    console.error('Error toggling subject lock', error);
    return;
  }

  revalidatePath('/admin/courses');
  revalidatePath(`/dashboard/courses/${courseId}`);
}

export async function toggleLessonLockAction(courseId: string, formData: FormData) {
  const lessonId = formData.get('lessonId');
  const isLocked = formData.get('isLocked') === 'true';

  if (typeof lessonId !== 'string' || !lessonId) {
    console.error('Lesson selection is required');
    return;
  }

  const supabase = await getAdminSupabaseClient();
  const { error } = await supabase
    .from('lessons')
    .update({ is_locked: !isLocked })
    .eq('id', lessonId)
    .eq('course_id', courseId);

  if (error) {
    console.error('Error toggling lesson lock', error);
    return;
  }

  revalidatePath('/admin/courses');
  revalidatePath(`/dashboard/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`);
}

// == TESTS ==
export async function addTestAction(courseId: string, formData: FormData) {
  const title = formData.get('title') as string;
  const time_limit = parseInt(formData.get('time_limit') as string) || 30;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.from('mock_tests').insert([{ course_id: courseId, title, time_limit_minutes: time_limit }]);
  revalidatePath(`/admin/courses`);
}

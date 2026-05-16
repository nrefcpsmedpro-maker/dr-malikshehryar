'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

export type BulkImportStatus = 'created' | 'skipped' | 'failed';

export type ImportStudentRowInput = {
  rowNumber: number;
  full_name: string;
  email: string;
  mobile_number: string;
  cnic_number: string;
};

export type BulkImportPayload = {
  courseIds: string[];
  rows: ImportStudentRowInput[];
};

export type BulkImportResultRow = ImportStudentRowInput & {
  password: string;
  status: BulkImportStatus;
  reason: string;
};

export type BulkImportResult = {
  created: number;
  skipped: number;
  failed: number;
  rows: BulkImportResultRow[];
};

type NormalizedStudentRow = ImportStudentRowInput & {
  normalizedEmail: string;
  normalizedCnic: string;
};

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || profile?.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  return user;
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeCnic(cnic: string) {
  return cnic.replace(/\D/g, '');
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function createTemporaryPassword() {
  return `MedPro-${randomBytes(9).toString('base64url')}-7A!`;
}

function emptyResultRow(row: ImportStudentRowInput, status: BulkImportStatus, reason: string): BulkImportResultRow {
  return {
    rowNumber: row.rowNumber,
    full_name: row.full_name.trim(),
    email: normalizeEmail(row.email),
    mobile_number: row.mobile_number.trim(),
    cnic_number: normalizeCnic(row.cnic_number),
    password: '',
    status,
    reason,
  };
}

function validateStudentRow(row: ImportStudentRowInput): NormalizedStudentRow | string {
  const fullName = row.full_name.trim();
  const email = normalizeEmail(row.email);
  const mobileNumber = row.mobile_number.trim();
  const cnicNumber = normalizeCnic(row.cnic_number);

  if (!fullName || !email || !mobileNumber || !cnicNumber) {
    return 'Missing full name, email, mobile number, or CNIC';
  }

  if (!isEmail(email)) {
    return 'Invalid email address';
  }

  if (cnicNumber.length !== 13) {
    return 'CNIC must contain exactly 13 digits';
  }

  return {
    rowNumber: row.rowNumber,
    full_name: fullName,
    email,
    mobile_number: mobileNumber,
    cnic_number: cnicNumber,
    normalizedEmail: email,
    normalizedCnic: cnicNumber,
  };
}

async function enrollStudentInCourses(adminClient: ReturnType<typeof createAdminClient>, userId: string, courseIds: string[]) {
  if (courseIds.length === 0) {
    return;
  }

  const rows = courseIds.map((courseId) => ({
    user_id: userId,
    course_id: courseId,
  }));

  const { error } = await adminClient
    .from('enrollments')
    .upsert(rows, { onConflict: 'user_id,course_id', ignoreDuplicates: true });

  if (error) {
    throw new Error(error.message);
  }
}

function revalidateUserAdminViews() {
  revalidatePath('/admin/users');
  revalidatePath('/admin/courses');
  revalidatePath('/dashboard');
}

export async function toggleApproval(formData: FormData) {
  await requireAdmin();

  const userId = readString(formData, 'userId');
  const isApproved = formData.get('currentStatus') === 'true';

  if (!userId) {
    throw new Error('Student is required');
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('profiles')
    .update({ is_approved: !isApproved })
    .eq('id', userId);

  if (error) {
    console.error('Error toggling approval:', error.message);
    throw new Error('Failed to update approval');
  }

  revalidatePath('/admin/users');
}

export async function generateUser(formData: FormData) {
  await requireAdmin();

  const email = normalizeEmail(readString(formData, 'email'));
  const password = readString(formData, 'password');
  const fullName = readString(formData, 'fullName');
  const mobileNumber = readString(formData, 'mobileNumber');
  const cnicNumber = normalizeCnic(readString(formData, 'cnicNumber'));

  if (!email || !password || !fullName || !mobileNumber || !cnicNumber) {
    throw new Error('Full name, email, mobile number, CNIC, and password are required');
  }

  if (!isEmail(email)) {
    throw new Error('A valid email address is required');
  }

  if (cnicNumber.length !== 13) {
    throw new Error('CNIC must contain exactly 13 digits');
  }

  const adminClient = createAdminClient();
  const [{ data: emailMatch }, { data: cnicMatch }] = await Promise.all([
    adminClient.from('profiles').select('id').eq('email', email).maybeSingle(),
    adminClient.from('profiles').select('id').eq('cnic_number', cnicNumber).maybeSingle(),
  ]);

  if (emailMatch || cnicMatch) {
    throw new Error('A student with this email or CNIC already exists');
  }

  const { data: newUser, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      mobile_number: mobileNumber,
      cnic_number: cnicNumber,
    },
  });

  if (error) {
    console.error('Error creating user:', error.message);
    throw new Error('Failed to create user');
  }

  if (newUser.user?.id) {
    const { error: approvalError } = await adminClient
      .from('profiles')
      .update({
        full_name: fullName,
        mobile_number: mobileNumber,
        cnic_number: cnicNumber,
        is_approved: true,
      })
      .eq('id', newUser.user.id);

    if (approvalError) {
      console.error('Error approving generated user:', approvalError.message);
      throw new Error('Failed to approve generated user');
    }
  }

  revalidatePath('/admin/users');
}

export async function enrollUserInCourse(formData: FormData) {
  await requireAdmin();

  const userId = readString(formData, 'userId');
  const courseId = readString(formData, 'courseId');

  if (!userId || !courseId) {
    throw new Error('Student and course are required');
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data: student, error: studentError }, { data: course, error: courseError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .eq('role', 'student')
      .maybeSingle(),
    supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .maybeSingle(),
  ]);

  if (studentError || !student) {
    throw new Error('Student not found');
  }

  if (courseError || !course) {
    throw new Error('Course not found');
  }

  const { error } = await supabase
    .from('enrollments')
    .insert([{ user_id: student.id, course_id: course.id }]);

  if (error && error.code !== '23505') {
    console.error('Error enrolling student in course:', error.message);
    throw new Error('Failed to enroll student');
  }

  revalidateUserAdminViews();
}

export async function unenrollUserFromCourse(formData: FormData) {
  await requireAdmin();

  const userId = readString(formData, 'userId');
  const courseId = readString(formData, 'courseId');

  if (!userId || !courseId) {
    throw new Error('Student and course are required');
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('user_id', userId)
    .eq('course_id', courseId);

  if (error) {
    console.error('Error removing student from course:', error.message);
    throw new Error('Failed to remove student from course');
  }

  revalidateUserAdminViews();
}

export async function bulkImportStudents(payload: BulkImportPayload): Promise<BulkImportResult> {
  await requireAdmin();

  const courseIds = [...new Set(payload.courseIds.map((courseId) => courseId.trim()).filter(Boolean))];
  const incomingRows = payload.rows.slice(0, 500);
  const results: BulkImportResultRow[] = [];

  if (courseIds.length === 0) {
    throw new Error('Select at least one course before importing students');
  }

  if (payload.rows.length > 500) {
    throw new Error('Import limit is 500 students at a time');
  }

  if (incomingRows.length === 0) {
    throw new Error('Add at least one student row before importing');
  }

  const adminClient = createAdminClient();
  const { data: selectedCourses, error: coursesError } = await adminClient
    .from('courses')
    .select('id')
    .in('id', courseIds);

  if (coursesError) {
    throw new Error('Could not verify selected courses');
  }

  const selectedCourseIds = new Set((selectedCourses ?? []).map((course) => course.id));
  const missingCourse = courseIds.find((courseId) => !selectedCourseIds.has(courseId));

  if (missingCourse) {
    throw new Error('One or more selected courses no longer exist');
  }

  const normalizedRows: NormalizedStudentRow[] = [];
  const seenEmails = new Set<string>();
  const seenCnics = new Set<string>();

  for (const row of incomingRows) {
    const validated = validateStudentRow(row);

    if (typeof validated === 'string') {
      results.push(emptyResultRow(row, 'failed', validated));
      continue;
    }

    if (seenEmails.has(validated.normalizedEmail) || seenCnics.has(validated.normalizedCnic)) {
      results.push(emptyResultRow(validated, 'skipped', 'Duplicate email or CNIC inside import file'));
      continue;
    }

    seenEmails.add(validated.normalizedEmail);
    seenCnics.add(validated.normalizedCnic);
    normalizedRows.push(validated);
  }

  const emails = normalizedRows.map((row) => row.normalizedEmail);
  const cnics = normalizedRows.map((row) => row.normalizedCnic);
  const existingEmails = new Set<string>();
  const existingCnics = new Set<string>();

  if (emails.length > 0) {
    const { data, error } = await adminClient
      .from('profiles')
      .select('email')
      .in('email', emails);

    if (error) {
      throw new Error('Could not check existing student emails');
    }

    (data ?? []).forEach((profile) => {
      if (profile.email) {
        existingEmails.add(normalizeEmail(profile.email));
      }
    });
  }

  if (cnics.length > 0) {
    const { data, error } = await adminClient
      .from('profiles')
      .select('cnic_number')
      .in('cnic_number', cnics);

    if (error) {
      throw new Error('Could not check existing student CNIC records');
    }

    (data ?? []).forEach((profile) => {
      if (profile.cnic_number) {
        existingCnics.add(normalizeCnic(profile.cnic_number));
      }
    });
  }

  for (const row of normalizedRows) {
    if (existingEmails.has(row.normalizedEmail)) {
      results.push(emptyResultRow(row, 'skipped', 'Existing user with this email'));
      continue;
    }

    if (existingCnics.has(row.normalizedCnic)) {
      results.push(emptyResultRow(row, 'skipped', 'Existing user with this CNIC'));
      continue;
    }

    const password = createTemporaryPassword();

    try {
      const { data: newUser, error } = await adminClient.auth.admin.createUser({
        email: row.normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: row.full_name,
          mobile_number: row.mobile_number,
          cnic_number: row.normalizedCnic,
        },
      });

      if (error) {
        const reason = /already|registered|exists/i.test(error.message)
          ? 'Existing auth user with this email'
          : error.message;
        results.push(emptyResultRow(row, reason.startsWith('Existing') ? 'skipped' : 'failed', reason));
        continue;
      }

      if (!newUser.user?.id) {
        results.push(emptyResultRow(row, 'failed', 'Supabase did not return a created user id'));
        continue;
      }

      const { error: profileError } = await adminClient
        .from('profiles')
        .update({
          full_name: row.full_name,
          mobile_number: row.mobile_number,
          cnic_number: row.normalizedCnic,
          is_approved: true,
        })
        .eq('id', newUser.user.id);

      if (profileError) {
        results.push(emptyResultRow(row, 'failed', profileError.message));
        continue;
      }

      await enrollStudentInCourses(adminClient, newUser.user.id, courseIds);

      results.push({
        rowNumber: row.rowNumber,
        full_name: row.full_name,
        email: row.normalizedEmail,
        mobile_number: row.mobile_number,
        cnic_number: row.normalizedCnic,
        password,
        status: 'created',
        reason: `Approved and enrolled in ${courseIds.length} course${courseIds.length === 1 ? '' : 's'}`,
      });

      existingEmails.add(row.normalizedEmail);
      existingCnics.add(row.normalizedCnic);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unexpected import error';
      results.push(emptyResultRow(row, 'failed', reason));
    }
  }

  revalidateUserAdminViews();

  return {
    created: results.filter((row) => row.status === 'created').length,
    skipped: results.filter((row) => row.status === 'skipped').length,
    failed: results.filter((row) => row.status === 'failed').length,
    rows: results.sort((a, b) => a.rowNumber - b.rowNumber),
  };
}

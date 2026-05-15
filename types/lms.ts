export type UserRole = "admin" | "student";

export type CountAggregate = {
  count: number | null;
};

export type Course = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  created_at: string;
};

export type CourseWithCounts = Course & {
  lessons?: CountAggregate[] | null;
  enrollments?: CountAggregate[] | null;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  mobile_number: string | null;
  cnic_number: string | null;
  role: UserRole;
  is_approved: boolean;
  created_at: string;
};

export type EnrollmentWithCourse = {
  id: string;
  user_id: string;
  course_id: string;
  created_at: string;
  courses: (Course & {
    lessons?: CountAggregate[] | null;
  }) | null;
};

export type Subject = {
  id: string;
  course_id?: string;
  title: string;
  order_index: number;
  is_locked: boolean;
};

export type Lesson = {
  id: string;
  course_id?: string;
  subject_id?: string | null;
  title: string;
  youtube_id?: string;
  order_index: number;
  is_locked: boolean;
  created_at?: string;
};

export type SubjectWithLessons = Subject & {
  lessons: Lesson[] | null;
};

export type LessonProgress = {
  user_id: string;
  course_id: string;
  lesson_id: string;
  last_position_seconds: number | null;
  duration_seconds: number | null;
  completed_at: string | null;
  updated_at: string;
};

export type MockQuestion = {
  id: string;
  test_id?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  created_at: string;
};

export type MockTest = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number;
  created_at: string;
};

export type MockTestWithQuestions = MockTest & {
  questions: MockQuestion[] | null;
};

export type MockResult = {
  id: string;
  user_id: string;
  test_id: string;
  score: number;
  total_questions: number;
  created_at: string;
};

export type ExamQuestion = {
  id: string;
  subject_id?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  created_at: string;
};

export type ExamSubject = {
  id: string;
  exam_id?: string;
  title: string;
  order_index: number;
  time_limit_minutes: number | null;
  created_at?: string;
  questions: ExamQuestion[] | CountAggregate[] | null;
};

export type ExamAttemptMode = "full_exam" | "subject_wise";
export type ExamTimeMode = "total" | "per_subject";
export type ExamQuestionOrder = "mixed" | "by_subject";

export type MockExam = {
  id: string;
  title: string;
  description: string | null;
  time_mode: ExamTimeMode;
  total_time_minutes: number;
  question_order: ExamQuestionOrder;
  attempt_mode: ExamAttemptMode;
  created_at: string;
};

export type MockExamWithSubjects = MockExam & {
  subjects: ExamSubject[] | null;
};

export type SubjectScore = {
  subject_id: string;
  subject_title: string;
  score: number;
  total: number;
  order_index: number;
};

export type ExamResult = {
  id: string;
  user_id?: string;
  exam_id?: string;
  subject_id?: string | null;
  total_score: number;
  total_questions: number;
  subject_scores: SubjectScore[];
  created_at: string;
};

export type Certificate = {
  id: string;
  user_id: string;
  course_id: string;
  certificate_code: string;
  final_score: number | null;
  issued_at: string;
  courses?: Pick<Course, "id" | "title" | "description"> | null;
};

export type MarketingLead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  goal: string;
  message: string | null;
  created_at: string;
};

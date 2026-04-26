-- Migration: Add Standalone Mock Exams System
-- Adds exam_subjects, exam_questions, exam_results tables for standalone exams like "NRE 1 Mock Exam"

-- ============================================
-- MOCK EXAMS TABLE (Standalone exams, not tied to courses)
-- ============================================
create table if not exists mock_exams (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    description text,
    time_mode text not null check (time_mode in ('total', 'per_subject')) default 'total',
    total_time_minutes integer not null default 60,
    question_order text not null check (question_order in ('mixed', 'by_subject')) default 'mixed',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table mock_exams enable row level security;

create policy "Mock exams viewable by all authenticated users."
    on mock_exams for select using (true);

create policy "Mock exams can be created by admins."
    on mock_exams for insert with check (
        exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    );

create policy "Mock exams can be updated by admins."
    on mock_exams for update using (
        exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    );

create policy "Mock exams can be deleted by admins."
    on mock_exams for delete using (
        exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    );

-- ============================================
-- EXAM SUBJECTS TABLE (Subjects within an exam)
-- ============================================
create table if not exists exam_subjects (
    id uuid default uuid_generate_v4() primary key,
    exam_id uuid references mock_exams on delete cascade not null,
    title text not null,
    order_index integer not null default 0,
    time_limit_minutes integer, -- null unless time_mode = 'per_subject'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table exam_subjects enable row level security;

create policy "Exam subjects viewable by all authenticated users."
    on exam_subjects for select using (true);

create policy "Exam subjects can be created by admins."
    on exam_subjects for insert with check (
        exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    );

create policy "Exam subjects can be updated by admins."
    on exam_subjects for update using (
        exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    );

create policy "Exam subjects can be deleted by admins."
    on exam_subjects for delete using (
        exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    );

-- ============================================
-- EXAM QUESTIONS TABLE (Questions within a subject)
-- ============================================
create table if not exists exam_questions (
    id uuid default uuid_generate_v4() primary key,
    subject_id uuid references exam_subjects on delete cascade not null,
    question_text text not null,
    option_a text not null,
    option_b text not null,
    option_c text not null,
    option_d text not null,
    correct_option text not null check (correct_option in ('A', 'B', 'C', 'D')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table exam_questions enable row level security;

create policy "Exam questions viewable by all authenticated users."
    on exam_questions for select using (true);

create policy "Exam questions can be created by admins."
    on exam_questions for insert with check (
        exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    );

create policy "Exam questions can be updated by admins."
    on exam_questions for update using (
        exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    );

create policy "Exam questions can be deleted by admins."
    on exam_questions for delete using (
        exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    );

-- ============================================
-- EXAM RESULTS TABLE (with per-subject breakdown)
-- ============================================
create table if not exists exam_results (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references profiles on delete cascade not null,
    exam_id uuid references mock_exams on delete cascade not null,
    total_score integer not null,
    total_questions integer not null,
    subject_scores jsonb not null default '[]', -- [{subject_id, subject_title, score, total, order_index}]
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table exam_results enable row level security;

create policy "Users can view own exam results."
    on exam_results for select using (auth.uid() = user_id);

create policy "Admins can view all exam results."
    on exam_results for select using (
        exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    );

create policy "Users can insert own exam results."
    on exam_results for insert with check (auth.uid() = user_id);

create policy "Users can delete own exam results (for retake)."
    on exam_results for delete using (auth.uid() = user_id);
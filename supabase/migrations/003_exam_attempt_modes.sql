-- Migration: Exam attempt format options (full exam vs subject-wise)

alter table mock_exams
    add column if not exists attempt_mode text not null
    check (attempt_mode in ('full_exam', 'subject_wise'))
    default 'full_exam';

alter table exam_results
    add column if not exists subject_id uuid references exam_subjects on delete set null;

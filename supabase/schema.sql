-- Create an ENUM type for roles to enable a dropdown in the Supabase Dashboard
create type user_role as enum ('admin', 'student');

-- Create a table for public profiles
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  full_name text,
  mobile_number text,
  cnic_number text check (cnic_number is null or cnic_number ~ '^[0-9]{13}$'),
  role user_role default 'student',
  is_approved boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create unique index profiles_cnic_number_unique
  on profiles (cnic_number)
  where cnic_number is not null and cnic_number <> '';

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

create policy "Admins can update all profiles." on profiles
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- This trigger automatically creates a profile entry when a new user signs up via Supabase Auth.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, full_name, mobile_number, cnic_number, is_approved)
  values (
    new.id,
    new.email,
    'student',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'mobile_number',
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'cnic_number', ''), '\D', '', 'g'), ''),
    false
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Courses Table
create table courses (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  thumbnail_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table courses enable row level security;
create policy "Courses are viewable by everyone." on courses for select using (true);
create policy "Courses can be created by admins." on courses for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Courses can be updated by admins." on courses for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Courses can be deleted by admins." on courses for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Lessons Table
create table lessons (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references courses on delete cascade not null,
  title text not null,
  youtube_id text not null, -- Store YouTube Video ID (e.g., dQw4w9WgXcQ)
  order_index integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table lessons enable row level security;

-- Only enrolled students or admins can view lessons
create policy "Lessons viewable by admins." on lessons for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
-- Need an enrollment check for students. For now, simple RLS assuming they own enrollments.

create policy "Lessons can be managed by admins." on lessons for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Enrollments Table
create table enrollments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles on delete cascade not null,
  course_id uuid references courses on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, course_id)
);

alter table enrollments enable row level security;
create policy "Users can view their own enrollments." on enrollments for select using (auth.uid() = user_id);
create policy "Admins can view all enrollments." on enrollments for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can create enrollments." on enrollments for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can delete enrollments." on enrollments for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Update Lesson viewing policy for enrolled students
create policy "Lessons viewable by enrolled students." on lessons for select using (
  exists (
    select 1 from enrollments 
    where user_id = auth.uid() and course_id = lessons.course_id
  )
);

-- Mock Tests System

create table mock_tests (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references courses on delete cascade not null,
  title text not null,
  description text,
  time_limit_minutes integer not null default 30,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table mock_questions (
  id uuid default uuid_generate_v4() primary key,
  test_id uuid references mock_tests on delete cascade not null,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('A', 'B', 'C', 'D')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table mock_results (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles on delete cascade not null,
  test_id uuid references mock_tests on delete cascade not null,
  score integer not null,
  total_questions integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Mock Tests RLS Policies
alter table mock_tests enable row level security;
alter table mock_questions enable row level security;
alter table mock_results enable row level security;

-- Tests are viewable by enrolled students and admins
create policy "Mock Tests viewable by enrolled students" on mock_tests for select using (
  exists (select 1 from enrollments where user_id = auth.uid() and course_id = mock_tests.course_id)
);
create policy "Mock Tests manageable by admins" on mock_tests for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin'::user_role)
);

-- Questions are viewable by enrolled students and admins
create policy "Questions viewable by enrolled students" on mock_questions for select using (
  exists (
    select 1 from mock_tests mt 
    join enrollments e on e.course_id = mt.course_id
    where mt.id = mock_questions.test_id and e.user_id = auth.uid()
  )
);
create policy "Questions manageable by admins" on mock_questions for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin'::user_role)
);

-- Results can be inserted and viewed by the student who took it, and viewed by admins
create policy "Users can view own test results" on mock_results for select using (auth.uid() = user_id);
create policy "Admins can view all test results" on mock_results for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin'::user_role)
);
create policy "Users can insert own test results" on mock_results for insert with check (auth.uid() = user_id);

alter table public.profiles
  add column if not exists mobile_number text,
  add column if not exists cnic_number text;

comment on column public.profiles.mobile_number is 'Student mobile number collected during account registration.';
comment on column public.profiles.cnic_number is 'Student CNIC number collected during account registration.';

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    email,
    role,
    full_name,
    mobile_number,
    cnic_number,
    is_approved
  )
  values (
    new.id,
    new.email,
    'student',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'mobile_number',
    new.raw_user_meta_data->>'cnic_number',
    false
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

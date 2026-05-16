with normalized_profiles as (
  select
    id,
    regexp_replace(coalesce(cnic_number, ''), '\D', '', 'g') as normalized_cnic
  from public.profiles
)
update public.profiles
set cnic_number = case
  when length(normalized_profiles.normalized_cnic) = 13 then normalized_profiles.normalized_cnic
  else null
end
from normalized_profiles
where public.profiles.id = normalized_profiles.id;

with duplicate_cnics as (
  select
    id,
    row_number() over (partition by cnic_number order by created_at asc, id asc) as duplicate_rank
  from public.profiles
  where cnic_number is not null and cnic_number <> ''
)
update public.profiles
set cnic_number = null
from duplicate_cnics
where public.profiles.id = duplicate_cnics.id
  and duplicate_cnics.duplicate_rank > 1;

alter table public.profiles
  drop constraint if exists profiles_cnic_number_format;

alter table public.profiles
  add constraint profiles_cnic_number_format
  check (cnic_number is null or cnic_number ~ '^[0-9]{13}$');

create unique index if not exists profiles_cnic_number_unique
  on public.profiles (cnic_number)
  where cnic_number is not null and cnic_number <> '';

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
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'cnic_number', ''), '\D', '', 'g'), ''),
    false
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

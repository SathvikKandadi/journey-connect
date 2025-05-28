-- Enable RLS on users table
alter table public.users enable row level security;

-- Drop existing policies if any
drop policy if exists "Allow public profiles" on public.users;
drop policy if exists "Users can create their profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;

-- Allow anyone to create a profile (needed for signup)
create policy "Users can create their profile"
  on public.users for insert
  with check (auth.uid() = id or auth.uid() is null);

-- Allow users to read their own profile
create policy "Allow public profiles"
  on public.users for select
  using (true);  -- Making profiles publicly readable for now, adjust if needed

-- Allow users to update their own profile
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Verify table structure
do $$ 
begin
  if not exists (
    select from information_schema.columns 
    where table_name = 'users' 
    and column_name = 'id'
  ) then
    raise exception 'users table is missing required columns';
  end if;
end $$; 
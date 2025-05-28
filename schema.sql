-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth)
create table public.users (
  id uuid references auth.users on delete cascade,
  email text,
  full_name text,
  phone_number text,
  gender text check (gender in ('Male', 'Female', 'Other')),
  rides_given integer default 0,
  rides_taken integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

-- Vehicle types table
create table public.vehicle_types (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  total_seats integer not null check (total_seats > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default vehicle types
insert into public.vehicle_types (name, total_seats) values
  ('Hatchback', 3),
  ('Sedan', 4),
  ('SUV', 7),
  ('Van', 8);

-- Rides table
create table public.rides (
  id uuid default uuid_generate_v4() primary key,
  driver_id uuid references public.users not null,
  source jsonb not null check (
    source ? 'latitude' and 
    source ? 'longitude' and 
    (source->>'latitude')::float is not null and 
    (source->>'longitude')::float is not null
  ),
  destination jsonb not null check (
    destination ? 'latitude' and 
    destination ? 'longitude' and 
    (destination->>'latitude')::float is not null and 
    (destination->>'longitude')::float is not null
  ),
  vehicle_type_id uuid references public.vehicle_types not null,
  available_seats integer not null check (available_seats > 0),
  fare numeric not null check (fare > 0),
  female_only boolean default false,
  status text default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  intermediate_points jsonb not null default '[]'::jsonb,
  constraint rides_intermediate_points_check
    check (
      jsonb_typeof(intermediate_points) = 'array' and
      (
        select bool_and(
          (point ? 'latitude') and (point ? 'longitude') and
          ((point->>'latitude')::float is not null) and
          ((point->>'longitude')::float is not null)
        )
        from jsonb_array_elements(intermediate_points) as point
      )
    )
);

-- Bookings table
create table public.bookings (
  id uuid default uuid_generate_v4() primary key,
  ride_id uuid references public.rides not null,
  passenger_id uuid references public.users not null,
  seats_booked integer not null default 1 check (seats_booked > 0),
  status text default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  drop_point jsonb
);

-- Add check constraint for drop_point
alter table public.bookings add constraint if not exists bookings_drop_point_check
  check (
    drop_point is null or (
      drop_point ? 'latitude' and drop_point ? 'longitude' and
      (drop_point->>'latitude')::float is not null and
      (drop_point->>'longitude')::float is not null
    )
  );

-- Create indexes for better query performance
create index rides_driver_id_idx on public.rides(driver_id);
create index rides_vehicle_type_id_idx on public.rides(vehicle_type_id);
create index rides_status_idx on public.rides(status);
create index bookings_ride_id_idx on public.bookings(ride_id);
create index bookings_passenger_id_idx on public.bookings(passenger_id);
create index bookings_status_idx on public.bookings(status);

-- Create RLS (Row Level Security) policies
alter table public.users enable row level security;
alter table public.vehicle_types enable row level security;
alter table public.rides enable row level security;
alter table public.bookings enable row level security;

-- Users policies
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can view driver profiles of active rides"
  on public.users for select
  using (id in (
    select driver_id from public.rides where status = 'active'
  ));

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- Vehicle types policies
create policy "Anyone can view vehicle types"
  on public.vehicle_types for select
  using (true);

-- Add a policy for authenticated users to view all vehicle types
create policy "Authenticated users can view all vehicle types"
  on public.vehicle_types for select
  to authenticated
  using (true);

-- Rides policies
create policy "Anyone can view active rides"
  on public.rides for select
  to authenticated
  using (status = 'active');

create policy "Drivers can view their own rides"
  on public.rides for select
  using (auth.uid() = driver_id);

create policy "Drivers can create rides"
  on public.rides for insert
  to authenticated
  with check (auth.uid() = driver_id);

-- Bookings policies
create policy "Users can view their own bookings"
  on public.bookings for select
  using (auth.uid() = passenger_id);

create policy "Users can create bookings"
  on public.bookings for insert
  to authenticated
  with check (
    auth.uid() = passenger_id and
    pickup_point is not null and
    pickup_point ? 'latitude' and
    pickup_point ? 'longitude' and
    (pickup_point->>'latitude')::float is not null and
    (pickup_point->>'longitude')::float is not null
  );

create policy "Users can update their own bookings"
  on public.bookings for update
  using (auth.uid() = passenger_id);

create policy "Users can delete their own bookings"
  on public.bookings for delete
  using (auth.uid() = passenger_id);

-- Allow passengers to update rides when booking
create policy "Passengers can update rides when booking"
  on public.rides for update
  using (id in (
    select ride_id from public.bookings 
    where passenger_id = auth.uid() and status = 'pending'
  ));

-- Create function to update ride statistics
create or replace function update_ride_statistics()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.users
    set rides_taken = rides_taken + 1
    where id = NEW.passenger_id;
    
    update public.users
    set rides_given = rides_given + 1
    where id = (select driver_id from public.rides where id = NEW.ride_id);
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

-- Create trigger for ride statistics
create trigger on_booking_created
  after insert on public.bookings
  for each row
  execute function update_ride_statistics(); 
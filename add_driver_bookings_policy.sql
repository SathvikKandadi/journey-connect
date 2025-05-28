-- Drop existing policies if they exist
drop policy if exists "Drivers can view bookings for their rides" on public.bookings;
drop policy if exists "Drivers can view passenger information for their rides" on public.users;
drop policy if exists "Drivers can delete bookings for their rides" on public.bookings;
drop policy if exists "Drivers can delete their own rides" on public.rides;

-- Create new policy for drivers to view bookings
create policy "Drivers can view bookings for their rides"
  on public.bookings for select
  using (
    exists (
      select 1 from public.rides
      where rides.id = bookings.ride_id
      and rides.driver_id = auth.uid()
      and rides.status = 'active'
    )
  );

-- Also allow drivers to view passenger information for their rides
create policy "Drivers can view passenger information for their rides"
  on public.users for select
  using (
    exists (
      select 1 from public.bookings
      join public.rides on rides.id = bookings.ride_id
      where bookings.passenger_id = users.id
      and rides.driver_id = auth.uid()
      and rides.status = 'active'
    )
  );

-- Allow drivers to delete bookings for their rides
create policy "Drivers can delete bookings for their rides"
  on public.bookings for delete
  using (
    exists (
      select 1 from public.rides
      where rides.id = bookings.ride_id
      and rides.driver_id = auth.uid()
    )
  );

-- Allow drivers to delete their own rides
create policy "Drivers can delete their own rides"
  on public.rides for delete
  using (auth.uid() = driver_id); 
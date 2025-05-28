-- Drop existing policies
drop policy if exists "Users can view their own bookings" on public.bookings;
drop policy if exists "Users can create bookings" on public.bookings;
drop policy if exists "Users can update their own bookings" on public.bookings;
drop policy if exists "Users can delete their own bookings" on public.bookings;
drop policy if exists "Passengers can update rides when booking" on public.rides;

-- Create updated policies
create policy "Users can view their own bookings"
  on public.bookings for select
  using (auth.uid() = passenger_id);

create policy "Users can create bookings"
  on public.bookings for insert
  to authenticated
  with check (auth.uid() = passenger_id);

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
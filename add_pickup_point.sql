-- Add pickup_point column to bookings table
alter table public.bookings 
add column pickup_point jsonb not null check (
  pickup_point ? 'latitude' and 
  pickup_point ? 'longitude' and 
  (pickup_point->>'latitude')::float is not null and 
  (pickup_point->>'longitude')::float is not null
); 
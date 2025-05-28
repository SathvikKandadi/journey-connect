import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Ride } from '../types';

export function useRides() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRides = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'active')
        .execute();

      if (error) throw error;
      setRides(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching rides');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRides();
    const interval = setInterval(fetchRides, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [fetchRides]);

  const createRide = async (ride: Omit<Ride, 'id' | 'driver_id' | 'created_at' | 'status'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('rides')
        .insert({
          ...ride,
          driver_id: user.id,
          status: 'active',
        });

      if (error) throw error;
      await fetchRides();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Error creating ride');
    }
  };

  const bookRide = async (rideId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('bookings')
        .insert({
          ride_id: rideId,
          passenger_id: user.id,
          seats_booked: 1,
          status: 'pending',
        });

      if (error) throw error;
      await fetchRides();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Error booking ride');
    }
  };

  return {
    rides,
    loading,
    error,
    createRide,
    bookRide,
  };
} 
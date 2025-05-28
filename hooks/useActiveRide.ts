import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface Ride {
  id: string;
  from_location: string;
  to_location: string;
  ride_date: string;
  ride_time: string;
  status: string;
  available_seats?: number;
  source?: { latitude: number; longitude: number };
  destination?: { latitude: number; longitude: number };
  driver_id: string;
  fare: number;
  female_only: boolean;
  vehicle_type_id: string;
  created_at: string;
}

interface Booking {
  id: string;
  ride_id: string;
  passenger_id: string;
  status: string;
  rides: Ride;
}

export function useActiveRide() {
  const { user } = useAuth();
  const [hasActiveRide, setHasActiveRide] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);

  useEffect(() => {
    if (!user) {
      setHasActiveRide(false);
      setLoading(false);
      setError(null);
      return;
    }

    const checkActiveRides = async () => {
      try {
        setError(null);
        console.log('Checking active rides for user:', user.id);
        
        // Check if user is giving a ride
        console.log('Checking giving rides...');
        const givingResult = await supabase
          .from('rides')
          .select('*')
          .eq('driver_id', user.id)
          .eq('status', 'active')
          .execute();

        console.log('Giving rides result:', givingResult);

        if (givingResult.error) {
          console.error('Error checking giving rides:', givingResult.error);
          throw givingResult.error;
        }

        // Check if user is taking a ride
        console.log('Checking taking rides...');
        const takingResult = await supabase
          .from('bookings')
          .select('*, rides(*)')
          .eq('passenger_id', user.id)
          .eq('status', 'active')
          .execute();

        console.log('Taking rides result:', takingResult);

        if (takingResult.error) {
          console.error('Error checking taking rides:', takingResult.error);
          throw takingResult.error;
        }

        const givingRide = givingResult.data?.[0];
        const takingRide = takingResult.data?.[0] as Booking | undefined;
        const hasRide = !!(givingRide || takingRide);
        
        console.log('Active ride status:', {
          hasRide,
          givingRide,
          takingRide
        });

        setHasActiveRide(hasRide);

        if (hasRide) {
          if (givingRide) {
            setActiveRide(givingRide);
          } else if (takingRide?.rides) {
            setActiveRide(takingRide.rides);
          }
        } else {
          setActiveRide(null);
        }
      } catch (error) {
        console.error('Error checking active rides:', error);
        setError(error instanceof Error ? error.message : 'Failed to check active rides');
      } finally {
        setLoading(false);
      }
    };

    checkActiveRides();
  }, [user]);

  return { hasActiveRide, loading, error, activeRide };
} 
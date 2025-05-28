import { SUPABASE_URL } from '@env';
import { Button, Card, Text } from '@rneui/themed';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useActiveRide } from '../../hooks/useActiveRide';
import { getAddressFromCoordinates } from '../../lib/geocoding';
import { getHeaders } from '../../lib/supabase';

// Extend Ride type locally to include intermediate_points
interface RideWithIntermediates {
  id: string;
  driver_id: string;
  source: { latitude: number; longitude: number };
  intermediate_points: { latitude: number; longitude: number }[];
  destination: { latitude: number; longitude: number };
  vehicle_type_id: string;
  available_seats: number;
  fare: number;
  female_only: boolean;
  status: string;
  created_at: string;
}

export default function ActiveRideScreen() {
  const router = useRouter();
  const { activeRide, loading, error } = useActiveRide() as { activeRide: RideWithIntermediates | null, loading: boolean, error: string | null };
  const [sourceAddress, setSourceAddress] = useState<string>('Loading...');
  const [destinationAddress, setDestinationAddress] = useState<string>('Loading...');
  const [intermediateAddresses, setIntermediateAddresses] = useState<string[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  useEffect(() => {
    const loadAddresses = async () => {
      if (activeRide?.source) {
        const address = await getAddressFromCoordinates(activeRide.source);
        setSourceAddress(address);
      }
      if (activeRide?.destination) {
        const address = await getAddressFromCoordinates(activeRide.destination);
        setDestinationAddress(address);
      }
      if (activeRide?.intermediate_points && Array.isArray(activeRide.intermediate_points)) {
        const addresses = await Promise.all(
          activeRide.intermediate_points.map((pt: any) => getAddressFromCoordinates(pt))
        );
        setIntermediateAddresses(addresses);
      } else {
        setIntermediateAddresses([]);
      }
    };

    loadAddresses();
  }, [activeRide]);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!activeRide) return;
      setBookingsLoading(true);
      setBookingsError(null);
      try {
        const headers = await getHeaders();
        // Updated query to include all necessary fields and proper joins
        const url = `${SUPABASE_URL}/rest/v1/bookings?select=id,status,seats_booked,pickup_point,drop_point,created_at,passenger:passenger_id(id,full_name,email,phone_number)&ride_id=eq.${activeRide.id}&order=created_at.desc`;
        console.log('Fetching bookings with URL:', url);
        
        const supabaseKey = process.env.SUPABASE_ANON_KEY;
        if (!supabaseKey) {
          throw new Error('Supabase API key is not configured');
        }

        const response = await fetch(url, { 
          headers: {
            ...headers,
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          } as HeadersInit
        });
        
        const responseText = await response.text();
        
        if (!response.ok) {
          console.error('Error response:', responseText);
          throw new Error(responseText || 'Failed to load bookings');
        }
        
        const data = JSON.parse(responseText);
        console.log('Fetched bookings:', data);
        setBookings(data || []);
      } catch (err: any) {
        console.error('Error fetching bookings:', err);
        setBookingsError(err.message || 'Failed to load bookings');
      } finally {
        setBookingsLoading(false);
      }
    };
    fetchBookings();
  }, [activeRide]);

  const handleEndRide = async () => {
    if (!activeRide) return;
    try {
      console.log('Attempting to delete ride with ID:', activeRide.id);
      
      // First delete all bookings associated with this ride
      const headers = await getHeaders();
      const bookingsUrl = `${SUPABASE_URL}/rest/v1/bookings?ride_id=eq.${activeRide.id}`;
      console.log('Deleting bookings with URL:', bookingsUrl);
      
      const bookingsResponse = await fetch(bookingsUrl, {
        method: 'DELETE',
        headers: {
          ...headers,
          'Prefer': 'return=minimal'
        }
      });

      if (!bookingsResponse.ok) {
        const errorText = await bookingsResponse.text();
        console.error('Error deleting bookings:', errorText);
        throw new Error(`Failed to delete bookings: ${errorText}`);
      }
      console.log('Bookings deleted successfully');

      // Then delete the ride
      const rideUrl = `${SUPABASE_URL}/rest/v1/rides?id=eq.${activeRide.id}`;
      console.log('Deleting ride with URL:', rideUrl);
      
      const rideResponse = await fetch(rideUrl, {
        method: 'DELETE',
        headers: {
          ...headers,
          'Prefer': 'return=minimal'
        }
      });

      if (!rideResponse.ok) {
        const errorText = await rideResponse.text();
        console.error('Error deleting ride:', errorText);
        throw new Error(`Failed to delete ride: ${errorText}`);
      }
      console.log('Ride deleted successfully');

      // Redirect to home screen
      console.log('Redirecting to home screen...');
      router.replace('/');
    } catch (err: any) {
      console.error('Failed to delete ride:', err);
      alert(`Failed to delete ride: ${err.message || 'Unknown error'}. Please try again.`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Card>
          <Card.Title>Error</Card.Title>
          <Card.Divider />
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Try Again"
            onPress={() => router.replace('/')}
            containerStyle={styles.buttonContainer}
          />
        </Card>
      </View>
    );
  }

  if (!activeRide) {
    return (
      <View style={styles.container}>
        <Card>
          <Card.Title>No Active Ride</Card.Title>
          <Card.Divider />
          <Text style={styles.message}>You don't have any active rides at the moment.</Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            containerStyle={styles.buttonContainer}
          />
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card>
        <Card.Title>Active Ride Details</Card.Title>
        <Card.Divider />
        <View style={styles.rideDetails}>
          <Text style={styles.rideInfo}>
            <Text style={styles.label}>From:</Text> {sourceAddress}
          </Text>
          {intermediateAddresses.map((addr, idx) => (
            <Text style={styles.rideInfo} key={idx}>
              <Text style={styles.label}>Intermediate Stop {idx + 1}:</Text> {addr}
            </Text>
          ))}
          <Text style={styles.rideInfo}>
            <Text style={styles.label}>To:</Text> {destinationAddress}
          </Text>
          <Text style={styles.rideInfo}>
            <Text style={styles.label}>Date:</Text> {new Date(activeRide.created_at).toLocaleDateString()}
          </Text>
          <Text style={styles.rideInfo}>
            <Text style={styles.label}>Status:</Text> {activeRide.status}
          </Text>
          {activeRide.available_seats && (
            <Text style={styles.rideInfo}>
              <Text style={styles.label}>Available Seats:</Text> {activeRide.available_seats}
            </Text>
          )}
          <Text style={styles.rideInfo}>
            <Text style={styles.label}>Fare:</Text> ${activeRide.fare}
          </Text>
          <Text style={styles.rideInfo}>
            <Text style={styles.label}>Female Only:</Text> {activeRide.female_only ? 'Yes' : 'No'}
          </Text>
        </View>
        {/* Bookings Section */}
        <Card.Divider />
        {/* <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Booked Passengers</Text>
        {bookingsLoading ? (
          <Text>Loading bookings...</Text>
        ) : bookingsError ? (
          <Text style={{ color: 'red' }}>{bookingsError}</Text>
        ) : bookings.length === 0 ? (
          <Text>No passengers have booked this ride yet.</Text>
        ) : (
          bookings.map((booking, idx) => (
            <View key={booking.id || idx} style={styles.bookingItem}>
              <Text style={styles.bookingName}>
                {booking.passenger?.full_name || 'Unknown'} ({booking.passenger?.email || 'No email'})
              </Text>
              <Text style={styles.bookingDetails}>
                Status: {booking.status}
                {booking.seats_booked > 1 && ` • ${booking.seats_booked} seats`}
              </Text>
              {booking.pickup_point && (
                <Text style={styles.bookingDetails}>
                  Pickup: {booking.pickup_point.label || 'Custom location'}
                </Text>
              )}
              {booking.drop_point && (
                <Text style={styles.bookingDetails}>
                  Drop: {booking.drop_point.label || 'Custom location'}
                </Text>
              )}
            </View>
          ))
        )} */}
        {/* <Button
          title="End Ride"
          onPress={handleEndRide}
          containerStyle={styles.buttonContainer}
          buttonStyle={{ backgroundColor: '#ff3b30' }}
        /> */}
        <Button
          title="Go Back"
          onPress={() => router.back()}
          containerStyle={styles.buttonContainer}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  rideDetails: {
    padding: 10,
  },
  rideInfo: {
    fontSize: 16,
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
    color: '#2089dc',
  },
  errorText: {
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 20,
  },
  message: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  buttonContainer: {
    marginVertical: 8,
  },
  bookingItem: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
  },
  bookingName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  bookingDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
});
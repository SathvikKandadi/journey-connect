import { SUPABASE_URL } from '@env';
import { Button, Card, Text } from '@rneui/themed';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { getAddressFromCoordinates } from '../../lib/geocoding';
import { getHeaders } from '../../lib/supabase';

interface Ride {
  id: string;
  driver_id: string;
  source: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  intermediate_points: { latitude: number; longitude: number }[];
  vehicle_type_id: string;
  available_seats: number;
  fare: number;
  female_only: boolean;
  status: string;
  created_at: string;
  drivers?: { full_name: string };
  vehicle_types?: { name: string };
  sourceAddress?: string;
  destinationAddress?: string;
}

interface Booking {
  id: string;
  ride_id: string;
  passenger_id: string;
  status: string;
  seats_booked: number;
  pickup_point: { latitude: number; longitude: number; label: string };
  drop_point: { latitude: number; longitude: number; label: string };
  created_at: string;
  ride?: Ride;
}

export default function MyRidesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingRideId, setCompletingRideId] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCompleteRide = async (bookingId: string) => {
    setCompletingRideId(bookingId);
    try {
      const headers = await getHeaders();
      const url = `${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`;
      console.log('Attempting to update booking with URL:', url);
      console.log('Request headers:', headers);
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          status: 'confirmed'
        })
      });

      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);

      if (!response.ok) {
        throw new Error(responseText || 'Failed to complete ride');
      }

      // Navigate to payment screen
      router.push('/payment');
    } catch (err: any) {
      console.error('Error completing ride:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      setError(err.message || 'Failed to complete ride');
    } finally {
      setCompletingRideId(null);
    }
  };

  const fetchBookings = async () => {
    if (!user) {
      setError('Please sign in to view your rides');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const headers = await getHeaders();
      const url = `${SUPABASE_URL}/rest/v1/bookings?select=*,ride:ride_id(*,drivers:driver_id(full_name),vehicle_types(*))&passenger_id=eq.${user.id}&order=created_at.desc`;
      const response = await fetch(url, { headers });
      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(responseText || 'Failed to fetch bookings');
      }
      
      const data = JSON.parse(responseText);
      
      // Fetch addresses for all rides
      const bookingsWithAddresses = await Promise.all(
        data.map(async (booking: Booking) => {
          if (booking.ride) {
            const sourceAddress = await getAddressFromCoordinates(booking.ride.source);
            const destAddress = await getAddressFromCoordinates(booking.ride.destination);
            return {
              ...booking,
              ride: {
                ...booking.ride,
                sourceAddress,
                destinationAddress: destAddress
              }
            };
          }
          return booking;
        })
      );
      
      setBookings(bookingsWithAddresses);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
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
            onPress={fetchBookings}
            containerStyle={styles.buttonContainer}
          />
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card>
        <Card.Title>My Booked Rides</Card.Title>
        <Card.Divider />
        
        {bookings.length === 0 ? (
          <Text style={styles.message}>You haven't booked any rides yet.</Text>
        ) : (
          bookings.map((booking) => (
            <Card key={booking.id}>
              <Card.Title>Ride Details</Card.Title>
              <Card.Divider />
              {booking.ride && (
                <>
                  <Text style={styles.rideInfo}>
                    <Text style={styles.label}>Driver:</Text> {booking.ride.drivers?.full_name}
                  </Text>
                  <Text style={styles.rideInfo}>
                    <Text style={styles.label}>Vehicle:</Text> {booking.ride.vehicle_types?.name}
                  </Text>
                  <Text style={styles.rideInfo}>
                    <Text style={styles.label}>From:</Text> {booking.ride.sourceAddress}
                  </Text>
                  <Text style={styles.rideInfo}>
                    <Text style={styles.label}>To:</Text> {booking.ride.destinationAddress}
                  </Text>
                  <Text style={styles.rideInfo}>
                    <Text style={styles.label}>Fare:</Text> ${booking.ride.fare}
                  </Text>
                  <Text style={styles.rideInfo}>
                    <Text style={styles.label}>Female Only:</Text> {booking.ride.female_only ? 'Yes' : 'No'}
                  </Text>
                  <Text style={styles.rideInfo}>
                    <Text style={styles.label}>Booking Status:</Text> {booking.status}
                  </Text>
                  <Text style={styles.rideInfo}>
                    <Text style={styles.label}>Seats Booked:</Text> {booking.seats_booked}
                  </Text>
                  <Text style={styles.rideInfo}>
                    <Text style={styles.label}>Booked On:</Text> {new Date(booking.created_at).toLocaleDateString()}
                  </Text>
                  
                  {booking.status === 'pending' && (
                    <Button
                      title="Complete Ride"
                      onPress={() => handleCompleteRide(booking.id)}
                      loading={completingRideId === booking.id}
                      containerStyle={styles.buttonContainer}
                    />
                  )}
                </>
              )}
            </Card>
          ))
        )}
        
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
}); 
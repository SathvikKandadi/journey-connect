import { SUPABASE_URL } from '@env';
import { Button, Card, Text } from '@rneui/themed';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
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

interface Point {
  latitude: number;
  longitude: number;
  label: string;
  type: 'start' | 'intermediate' | 'end';
  address?: string;
}

// Add these constants at the top of the file after imports
const TELANGANA_BOUNDS = {
  north: 19.5,  // Northern boundary
  south: 16.5,  // Southern boundary
  east: 81.5,   // Eastern boundary
  west: 77.5    // Western boundary
};

const TELANGANA_CENTER = {
  latitude: 18.1124,
  longitude: 79.0193,
  latitudeDelta: 2.5,
  longitudeDelta: 2.5
};

export default function TakeRideScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rides, setRides] = useState<Ride[]>([]);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [pickupPoint, setPickupPoint] = useState<Point | null>(null);
  const [dropPoint, setDropPoint] = useState<Point | null>(null);
  const [addresses, setAddresses] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchRides();
  }, []);

  const fetchRides = async () => {
    if (!user) {
      setError('Please sign in to view rides');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const headers = await getHeaders();
      const url = `${SUPABASE_URL}/rest/v1/rides?select=*,drivers:driver_id(full_name),vehicle_types(*)&status=eq.active`;
      const response = await fetch(url, { headers });
      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(responseText || 'Failed to fetch rides');
      }
      
      const data = JSON.parse(responseText);
      // Fetch addresses for all rides
      const ridesWithAddresses = await Promise.all(
        data.map(async (ride: Ride) => {
          const sourceAddress = await getAddressFromCoordinates(ride.source);
          const destAddress = await getAddressFromCoordinates(ride.destination);
          return {
            ...ride,
            sourceAddress,
            destinationAddress: destAddress
          };
        })
      );
      setRides(ridesWithAddresses || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rides');
    } finally {
      setLoading(false);
    }
  };

  const getAllPoints = (ride: Ride): Point[] => {
    const points: Point[] = [
      { ...ride.source, label: 'Starting Point', type: 'start' as const },
      ...(ride.intermediate_points || []).map((pt, idx) => ({
        ...pt,
        label: `Stop ${idx + 1}`,
        type: 'intermediate' as const
      })),
      { ...ride.destination, label: 'Final Destination', type: 'end' as const }
    ];
    return points;
  };

  const getMarkerColor = (point: Point) => {
    switch (point.type) {
      case 'start':
        return '#4CAF50'; // Green
      case 'intermediate':
        // Use different colors for intermediate points
        const index = point.label.split(' ')[1]; // Get the number from "Stop X"
        return index === '1' ? '#FF9800' : '#FFC107'; // Orange for Stop 1, Yellow for Stop 2
      case 'end':
        return '#F44336'; // Red
      default:
        return '#2196F3'; // Blue
    }
  };

  const handleViewRoute = (ride: Ride) => {
    setSelectedRide(ride);
    setShowMap(true);
    setPickupPoint(null);
    setDropPoint(null);
  };

  const handlePointSelection = (point: Point, isPickup: boolean) => {
    if (isPickup) {
      // Can't select end point as pickup
      if (point.type === 'end') {
        setError('Cannot select final destination as pickup point');
        return;
      }
      setPickupPoint(point);
    } else {
      // Can't select start point as drop
      if (point.type === 'start') {
        setError('Cannot select starting point as drop point');
        return;
      }
      setDropPoint(point);
    }
    setError('');
  };

  const isPointSelected = (point: Point) => {
    if (pickupPoint && point.latitude === pickupPoint.latitude && point.longitude === pickupPoint.longitude) {
      return 'pickup';
    }
    if (dropPoint && point.latitude === dropPoint.latitude && point.longitude === dropPoint.longitude) {
      return 'drop';
    }
    return null;
  };

  const handleBookRide = async (ride: Ride) => {
    if (!user) {
      setError('Please sign in to book a ride');
      return;
    }

    if (!pickupPoint || !dropPoint) {
      setError('Please select both pickup and drop points');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const headers = await getHeaders();
      const url = `${SUPABASE_URL}/rest/v1/bookings`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          ride_id: ride.id,
          passenger_id: user.id,
          status: 'pending',
          seats_booked: 1,
          pickup_point: pickupPoint,
          drop_point: dropPoint
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to book ride');
      }

      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Failed to book ride');
    } finally {
      setLoading(false);
    }
  };

  const renderPointSelection = (ride: Ride) => {
    const points = getAllPoints(ride);
    return (
      <View style={styles.pointSelection}>
        <Text style={styles.sectionTitle}>Select Your Journey Points:</Text>
        {points.map((point, idx) => {
          const selectionType = isPointSelected(point);
          return (
            <View 
              key={idx} 
              style={[
                styles.pointRow,
                selectionType === 'pickup' && styles.selectedPickupRow,
                selectionType === 'drop' && styles.selectedDropRow
              ]}
            >
              <View style={styles.pointHeader}>
                <View style={[
                  styles.colorIndicator,
                  { backgroundColor: getMarkerColor(point) },
                  selectionType === 'pickup' && styles.selectedPickupIndicator,
                  selectionType === 'drop' && styles.selectedDropIndicator
                ]} />
                <Text style={[
                  styles.pointLabel,
                  selectionType === 'pickup' && styles.selectedPickupText,
                  selectionType === 'drop' && styles.selectedDropText
                ]}>{point.label}</Text>
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.pointButton,
                    selectionType === 'pickup' && styles.selectedPickupButton,
                    point.type === 'end' && styles.disabledButton
                  ]}
                  onPress={() => handlePointSelection(point, true)}
                  disabled={point.type === 'end'}
                >
                  <Text style={[
                    styles.pointButtonText,
                    selectionType === 'pickup' && styles.selectedButtonText
                  ]}>Pickup</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.pointButton,
                    selectionType === 'drop' && styles.selectedDropButton,
                    point.type === 'start' && styles.disabledButton
                  ]}
                  onPress={() => handlePointSelection(point, false)}
                  disabled={point.type === 'start'}
                >
                  <Text style={[
                    styles.pointButtonText,
                    selectionType === 'drop' && styles.selectedButtonText
                  ]}>Drop</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Card>
        <Card.Title>Find a Ride</Card.Title>
        <Card.Divider />
        
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {loading ? (
          <Text>Loading...</Text>
        ) : rides.length > 0 ? (
          rides.map(ride => (
            <Card key={ride.id}>
              <Card.Title>Ride Details</Card.Title>
              <Card.Divider />
              <Text style={styles.rideInfo}>Driver: {ride.drivers?.full_name}</Text>
              <Text style={styles.rideInfo}>Vehicle: {ride.vehicle_types?.name}</Text>
              <Text style={styles.rideInfo}>Available Seats: {ride.available_seats}</Text>
              <Text style={styles.rideInfo}>Fare: ${ride.fare}</Text>
              <Text style={styles.rideInfo}>
                <Text style={styles.label}>From:</Text> {ride.sourceAddress}
              </Text>
              <Text style={styles.rideInfo}>
                <Text style={styles.label}>To:</Text> {ride.destinationAddress}
              </Text>
              
              {selectedRide?.id === ride.id && showMap ? (
                <>
                  <View style={styles.mapContainer}>
                    <MapView
                      provider={PROVIDER_GOOGLE}
                      style={styles.map}
                      initialRegion={TELANGANA_CENTER}
                      onRegionChangeComplete={(region) => {
                        // Restrict map to Telangana bounds
                        if (region.latitude > TELANGANA_BOUNDS.north) {
                          region.latitude = TELANGANA_BOUNDS.north;
                        } else if (region.latitude < TELANGANA_BOUNDS.south) {
                          region.latitude = TELANGANA_BOUNDS.south;
                        }
                        if (region.longitude > TELANGANA_BOUNDS.east) {
                          region.longitude = TELANGANA_BOUNDS.east;
                        } else if (region.longitude < TELANGANA_BOUNDS.west) {
                          region.longitude = TELANGANA_BOUNDS.west;
                        }
                      }}
                    >
                      {getAllPoints(ride).map((point, idx) => (
                        <Marker
                          key={idx}
                          coordinate={point}
                          title={point.label}
                          pinColor={getMarkerColor(point)}
                        />
                      ))}
                      <Polyline
                        coordinates={getAllPoints(ride)}
                        strokeColor="#2196F3"
                        strokeWidth={3}
                      />
                    </MapView>
                  </View>
                  {renderPointSelection(ride)}
                  <Button
                    title="Book This Ride"
                    onPress={() => handleBookRide(ride)}
                    containerStyle={styles.buttonContainer}
                    disabled={loading || !pickupPoint || !dropPoint}
                  />
                </>
              ) : (
                <Button
                  title="View Route & Book"
                  onPress={() => handleViewRoute(ride)}
                  containerStyle={styles.buttonContainer}
                />
              )}
            </Card>
          ))
        ) : (
          <Text>No rides found</Text>
        )}
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
  errorText: {
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    marginVertical: 8,
  },
  mapContainer: {
    height: 300,
    marginVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  pointSelection: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  pointRow: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPickupRow: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  selectedDropRow: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  pointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPickupIndicator: {
    borderColor: '#4CAF50',
    transform: [{ scale: 1.2 }],
  },
  selectedDropIndicator: {
    borderColor: '#F44336',
    transform: [{ scale: 1.2 }],
  },
  pointLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedPickupText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  selectedDropText: {
    color: '#F44336',
    fontWeight: '600',
  },
  pointButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedPickupButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#388E3C',
  },
  selectedDropButton: {
    backgroundColor: '#F44336',
    borderColor: '#D32F2F',
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
    opacity: 0.5,
  },
  pointButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  selectedButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  rideInfo: {
    fontSize: 16,
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
    color: '#2089dc',
  },
}); 
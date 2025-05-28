import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface VehicleType {
  id: string;
  name: string;
  total_seats: number;
}

interface Location {
  latitude: number;
  longitude: number;
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

const isWithinTelangana = (latitude: number, longitude: number): boolean => {
  return (
    latitude >= TELANGANA_BOUNDS.south &&
    latitude <= TELANGANA_BOUNDS.north &&
    longitude >= TELANGANA_BOUNDS.west &&
    longitude <= TELANGANA_BOUNDS.east
  );
};

export default function GiveRideScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form states
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [selectedVehicleType, setSelectedVehicleType] = useState('');
  const [availableSeats, setAvailableSeats] = useState('');
  const [fare, setFare] = useState('');
  const [femaleOnly, setFemaleOnly] = useState(false);
  
  // Map states
  const [source, setSource] = useState<Location | null>(null);
  const [intermediate1, setIntermediate1] = useState<Location | null>(null);
  const [intermediate2, setIntermediate2] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [selectingLocation, setSelectingLocation] = useState<'source' | 'intermediate1' | 'intermediate2' | 'destination' | null>(null);

  useEffect(() => {
    fetchVehicleTypes();
  }, []);

  const fetchVehicleTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_types')
        .select('*')
        .execute();

      if (error) throw error;
      console.log('Fetched vehicle types:', data);
      setVehicleTypes(data || []);
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
      setError('Failed to load vehicle types');
    }
  };

  const handleLocationSelect = (location: Location) => {
    if (!isWithinTelangana(location.latitude, location.longitude)) {
      setError('Please select a location within Telangana');
      return;
    }

    if (selectingLocation === 'source') {
      setSource(location);
    } else if (selectingLocation === 'intermediate1') {
      setIntermediate1(location);
    } else if (selectingLocation === 'intermediate2') {
      setIntermediate2(location);
    } else if (selectingLocation === 'destination') {
      setDestination(location);
    }
    setSelectingLocation(null);
    setError('');
  };

  const handleSubmit = async () => {
    // Validate all required fields
    if (!selectedVehicleType || !availableSeats || !fare || !source || !intermediate1 || !intermediate2 || !destination) {
      setError('Please fill in all required fields');
      return;
    }

    if (isNaN(parseFloat(fare)) || parseFloat(fare) <= 0) {
      setError('Please enter a valid fare amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('User context at ride creation:', user);
      const rideData = {
        driver_id: user?.id,
        source: source,
        intermediate_points: [intermediate1, intermediate2],
        destination: destination,
        vehicle_type_id: selectedVehicleType,
        available_seats: parseInt(availableSeats),
        fare: parseFloat(fare),
        female_only: femaleOnly,
        status: 'active',
      };
      console.log('Prepared rideData:', rideData);
      if (!rideData.driver_id) {
        console.error('No driver_id found in user context!');
      }
      const { data, error } = await supabase
        .from('rides')
        .insert(rideData);
      if (error) {
        console.error('Insert error details:', error);
        throw error;
      }
      console.log('Created ride:', data);
      router.replace('/');
    } catch (error) {
      console.error('Error creating ride:', error);
      setError('Failed to create ride');
    } finally {
      setLoading(false);
    }
  };

  if (selectingLocation) {
    return (
      <View style={styles.container}>
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
          onPress={(e) => handleLocationSelect(e.nativeEvent.coordinate)}
        >
          {source && (
            <Marker
              coordinate={source}
              title="Source"
              pinColor="green"
            />
          )}
          {intermediate1 && (
            <Marker
              coordinate={intermediate1}
              title="Intermediate 1"
              pinColor="orange"
            />
          )}
          {intermediate2 && (
            <Marker
              coordinate={intermediate2}
              title="Intermediate 2"
              pinColor="yellow"
            />
          )}
          {destination && (
            <Marker
              coordinate={destination}
              title="Destination"
              pinColor="red"
            />
          )}
        </MapView>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            setSelectingLocation(null);
            setError('');
          }}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 40 }} style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Create a Ride</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle Details</Text>
        <View style={styles.vehicleTypes}>
          {vehicleTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.vehicleTypeButton,
                selectedVehicleType === type.id && styles.selectedVehicleType
              ]}
              onPress={() => setSelectedVehicleType(type.id)}
            >
              <Text style={styles.vehicleTypeText}>{type.name}</Text>
              <Text style={styles.seatsText}>Max {type.total_seats} seats</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Available Seats"
          value={availableSeats}
          onChangeText={setAvailableSeats}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Fare (in Rs.)"
          value={fare}
          onChangeText={setFare}
          keyboardType="numeric"
        />
        <TouchableOpacity
          style={[styles.button, femaleOnly && styles.selectedButton]}
          onPress={() => setFemaleOnly(!femaleOnly)}
        >
          <Text style={styles.buttonText}>Female Passengers Only</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Route</Text>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => setSelectingLocation('source')}
        >
          <Text style={styles.buttonText}>
            {source ? 'Change Source' : 'Select Source'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => setSelectingLocation('intermediate1')}
        >
          <Text style={styles.buttonText}>
            {intermediate1 ? 'Change Intermediate 1' : 'Select Intermediate 1'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => setSelectingLocation('intermediate2')}
        >
          <Text style={styles.buttonText}>
            {intermediate2 ? 'Change Intermediate 2' : 'Select Intermediate 2'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => setSelectingLocation('destination')}
        >
          <Text style={styles.buttonText}>
            {destination ? 'Change Destination' : 'Select Destination'}
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating Ride...' : 'Create Ride'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  vehicleTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  vehicleTypeButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    width: '48%',
  },
  selectedVehicleType: {
    borderColor: '#2089dc',
    backgroundColor: '#f0f9ff',
  },
  vehicleTypeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  seatsText: {
    fontSize: 14,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  selectedButton: {
    backgroundColor: '#2089dc',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationButton: {
    backgroundColor: '#2089dc',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: '#2089dc',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
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
  cancelButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#ff4444',
    padding: 15,
    borderRadius: 8,
    width: '90%',
  },
  errorContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 
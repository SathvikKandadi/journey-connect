import { Button, Card, Text } from '@rneui/themed';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useActiveRide } from '../../../hooks/useActiveRide';
import { useAuth } from '../../../hooks/useAuth';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasActiveRide, loading, error, activeRide } = useActiveRide();

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

  return (
    <View style={styles.container}>
      <Text h4 style={styles.welcome}>
        Welcome, {user?.full_name}!
      </Text>

      {hasActiveRide ? (
        <Card>
          <Card.Title>Active Ride</Card.Title>
          <Card.Divider />
          <Text style={styles.message}>You have an active ride in progress.</Text>
          <Button
            title="View Ride Details"
            onPress={() => router.push('/active-ride')}
            containerStyle={styles.buttonContainer}
          />
        </Card>
      ) : (
        <Card>
          <Card.Title>What would you like to do?</Card.Title>
          <Card.Divider />
          <Button
            title="Give a Ride"
            onPress={() => router.push('/give-ride')}
            containerStyle={styles.buttonContainer}
          />
          <Button
            title="Take a Ride"
            onPress={() => router.push('/take-ride')}
            containerStyle={styles.buttonContainer}
            type="outline"
          />
        </Card>
      )}

      <Card>
        <Card.Title>Your Statistics</Card.Title>
        <Card.Divider />
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text h4>{user?.rides_given || 0}</Text>
            <Text>Rides Given</Text>
          </View>
          <View style={styles.statItem}>
            <Text h4>{user?.rides_taken || 0}</Text>
            <Text>Rides Taken</Text>
          </View>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  welcome: {
    marginBottom: 20,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  errorText: {
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    marginVertical: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
}); 
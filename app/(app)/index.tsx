import { Button, Card, Text } from '@rneui/themed';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useActiveRide } from '../../hooks/useActiveRide';
import { useAuth } from '../../hooks/useAuth';

export default function HomeScreen() {
  const { user } = useAuth();
  const { hasActiveRide, loading } = useActiveRide();

  if (loading) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text h4>Welcome, {user?.full_name}!</Text>
      </View>

      {hasActiveRide ? (
        <Card>
          <Card.Title>Active Ride</Card.Title>
          <Card.Divider />
          <Text style={styles.message}>
            You currently have an active ride. You cannot give or take another ride until this one is completed.
          </Text>
          <Button
            title="View Active Ride"
            onPress={() => router.push('/active-ride')}
            containerStyle={styles.button}
          />
        </Card>
      ) : (
        <View style={styles.options}>
          <Card>
            <Card.Title>What would you like to do?</Card.Title>
            <Card.Divider />
            <Button
              title="Give a Ride"
              onPress={() => router.push('/give-ride')}
              containerStyle={styles.button}
            />
            <Button
              title="Take a Ride"
              onPress={() => router.push('/take-ride')}
              containerStyle={styles.button}
            />
          </Card>
        </View>
      )}

      <Card>
        <Card.Title>Your Statistics</Card.Title>
        <Card.Divider />
        <View style={styles.stats}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  options: {
    padding: 20,
  },
  button: {
    marginVertical: 10,
  },
  message: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
  statItem: {
    alignItems: 'center',
  },
}); 
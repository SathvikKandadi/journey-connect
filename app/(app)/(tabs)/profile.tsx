import { Avatar, Button, ListItem, Text } from '@rneui/themed';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useAuth } from '../../../hooks/useAuth';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar
          size={100}
          rounded
          title={user?.full_name?.charAt(0) || 'U'}
          containerStyle={styles.avatar}
        />
        <Text h4 style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text h4 style={styles.sectionTitle}>Profile Information</Text>
        <ListItem>
          <ListItem.Content>
            <ListItem.Title>Phone Number</ListItem.Title>
            <ListItem.Subtitle>{user?.phone_number || 'Not provided'}</ListItem.Subtitle>
          </ListItem.Content>
        </ListItem>
        <ListItem>
          <ListItem.Content>
            <ListItem.Title>Gender</ListItem.Title>
            <ListItem.Subtitle>{user?.gender || 'Not provided'}</ListItem.Subtitle>
          </ListItem.Content>
        </ListItem>
      </View>

      <View style={styles.section}>
        <Text h4 style={styles.sectionTitle}>Ride Statistics</Text>
        <ListItem>
          <ListItem.Content>
            <ListItem.Title>Rides Given</ListItem.Title>
            <ListItem.Subtitle>{user?.rides_given || 0}</ListItem.Subtitle>
          </ListItem.Content>
        </ListItem>
        <ListItem>
          <ListItem.Content>
            <ListItem.Title>Rides Taken</ListItem.Title>
            <ListItem.Subtitle>{user?.rides_taken || 0}</ListItem.Subtitle>
          </ListItem.Content>
        </ListItem>
      </View>

      <Button
        title="Sign Out"
        onPress={handleSignOut}
        containerStyle={styles.signOutButton}
        buttonStyle={styles.signOutButtonStyle}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  avatar: {
    backgroundColor: '#2089dc',
  },
  name: {
    marginTop: 10,
  },
  email: {
    color: '#666',
    marginTop: 5,
  },
  section: {
    marginTop: 20,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    padding: 15,
    backgroundColor: '#f8f8f8',
  },
  signOutButton: {
    margin: 20,
  },
  signOutButtonStyle: {
    backgroundColor: '#ff3b30',
  },
}); 
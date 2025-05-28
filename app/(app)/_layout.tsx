import { FontAwesome } from '@expo/vector-icons';
import { Redirect, Stack, useRouter } from 'expo-router';
import { TouchableOpacity, useColorScheme, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';

export default function AppLayout() {
  const colorScheme = useColorScheme();
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();

  // Don't redirect while loading
  if (isLoading) {
    return null;
  }

  // If user is not authenticated, redirect to auth
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
        },
        headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
        headerRight: () => (
          <View style={{ flexDirection: 'row', marginRight: 15 }}>
            <TouchableOpacity 
              onPress={() => router.push('/profile')}
              style={{ marginRight: 15 }}
            >
              <FontAwesome 
                name="user" 
                size={24} 
                color={colorScheme === 'dark' ? '#fff' : '#000'} 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout}>
              <FontAwesome 
                name="sign-out" 
                size={24} 
                color={colorScheme === 'dark' ? '#fff' : '#000'} 
              />
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          title: 'Home',
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          headerShown: true,
          title: 'Profile',
        }}
      />
      <Stack.Screen
        name="active-ride"
        options={{
          headerShown: true,
          title: 'Active Ride',
        }}
      />
      <Stack.Screen
        name="give-ride"
        options={{
          headerShown: true,
          title: 'Give a Ride',
        }}
      />
      <Stack.Screen
        name="take-ride"
        options={{
          headerShown: true,
          title: 'Take a Ride',
        }}
      />
    </Stack>
  );
} 
import { Button, Input, Text } from '@rneui/themed';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');

      if (!email || !password) {
        throw new Error('Please fill in all fields');
      }

      if (!email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      console.log('Calling signIn with:', email);
      await signIn(email, password);
      console.log('signIn completed, redirecting to app');
      router.replace('/(app)');
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        // Handle specific error messages
        if (err.message.includes('Invalid login credentials')) {
          setError('Invalid email or password');
        } else if (err.message.includes('Email not confirmed')) {
          setError('Please verify your email before signing in');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text h3 style={styles.title}>Welcome Back</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Input
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        disabled={loading}
        errorMessage={error && error.includes('email') ? error : undefined}
      />

      <Input
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        disabled={loading}
        errorMessage={error && error.includes('password') ? error : undefined}
      />

      <Button
        title={loading ? "Signing In..." : "Sign In"}
        onPress={handleLogin}
        loading={loading}
        disabled={loading}
        containerStyle={styles.button}
      />

      {loading && (
        <View style={{ marginTop: 20 }}>
          <ActivityIndicator size="large" color="#2089dc" />
          <Text style={{ textAlign: 'center', marginTop: 10 }}>Signing in and setting up your profile...</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text>Don't have an account? </Text>
        <Link href="/(auth)/signup" asChild>
          <Text style={styles.link}>Sign Up</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  error: {
    color: '#ff190c',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    marginTop: 15,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  link: {
    color: '#2089dc',
  },
}); 
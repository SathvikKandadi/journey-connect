import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, profile: {
    full_name: string;
    phone_number: string;
    gender: 'Male' | 'Female' | 'Other';
  }) => Promise<{ message: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    auth.getSession().then(async ({ data, error }) => {
      if (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        return;
      }

      if (data?.user) {
        setUser(data.user as User);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);

  // signUp only handles auth signup and email verification
  const signUp = async (email: string, password: string, profile: {
    full_name: string;
    phone_number: string;
    gender: 'Male' | 'Female' | 'Other';
  }) => {
    try {
      // Store profile data for use after email verification
      await AsyncStorage.setItem(
        'pending_profile',
        JSON.stringify({ email, profile })
      );
      const { data, error } = await auth.signUp(email, password);
      if (error) throw error;
      return {
        message: 'Please check your email for a verification link. You will be able to sign in after verifying your email.'
      };
    } catch (error) {
      console.error('Sign up error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred during signup');
    }
  };

  // signIn checks for user profile and creates it if missing (on first login)
  const signIn = async (
    email: string,
    password: string,
    profile?: {
      full_name: string;
      phone_number: string;
      gender: 'Male' | 'Female' | 'Other';
    }
  ) => {
    try {
      const { data, error } = await auth.signIn(email, password);
      if (error) throw error;
      if (!data?.user) throw new Error('No user data returned');

      // Check if profile exists
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()
        .execute();

      if (profileError) throw profileError;

      if (!userProfile) {
        // Try to get pending profile from AsyncStorage
        let pendingProfile = profile;
        if (!pendingProfile) {
          const stored = await AsyncStorage.getItem('pending_profile');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.email === email) {
              pendingProfile = parsed.profile;
            }
          }
        }
        if (!pendingProfile) throw new Error('Profile data required for first login');

        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: email.toLowerCase(),
            full_name: pendingProfile.full_name.trim(),
            phone_number: pendingProfile.phone_number.trim(),
            gender: pendingProfile.gender,
          });
        if (insertError) throw insertError;

        // Remove pending profile from AsyncStorage
        await AsyncStorage.removeItem('pending_profile');
      }

      // Fetch the user profile (now guaranteed to exist)
      const { data: finalProfile, error: finalProfileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()
        .execute();

      if (finalProfileError) throw finalProfileError;
      if (!finalProfile) throw new Error('User profile not found after creation');

      // Combine auth data with profile data
      const fullUser = {
        ...data.user,
        ...finalProfile
      };
      setUser(fullUser as User);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 
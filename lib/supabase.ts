import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// Helper functions
export const getHeaders = async () => {
  const session = await AsyncStorage.getItem('supabase.auth.token');
  console.log('Loaded session from AsyncStorage:', session);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Prefer': 'return=representation',
  };
  
  if (session) {
    try {
      const sessionData = JSON.parse(session);
      console.log('SessionData in getHeaders:', sessionData);
      if (
        sessionData.access_token &&
        sessionData.access_token !== SUPABASE_ANON_KEY
      ) {
        headers['Authorization'] = `Bearer ${sessionData.access_token}`;
        console.log('Using user access token for Authorization header:', sessionData.access_token);
      } else {
        console.log('No valid user access token found, not setting Authorization header');
      }
    } catch (error) {
      console.error('Error parsing session:', error);
    }
  } else {
    console.log('No session found, using anon key');
  }
  
  return headers;
};

// Simple auth functions
export const auth = {
  signIn: async (email: string, password: string) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error_description || 'Sign in failed');
      }

      await AsyncStorage.setItem('supabase.auth.token', JSON.stringify(data));
      return { data, error: null };
    } catch (error) {
      console.error('Error signing in:', error);
      return { data: null, error };
    }
  },

  signUp: async (email: string, password: string) => {
    try {
      console.log('Starting auth signup for email:', email);
      const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('Signup response:', JSON.stringify(data, null, 2));
      
      if (!response.ok) {
        throw new Error(data.error_description || 'Sign up failed');
      }

      // Store the session if we get one
      if (data.session) {
        console.log('Storing session token');
        await AsyncStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error signing up:', error);
      return { data: null, error };
    }
  },

  signOut: async () => {
    try {
      const headers = await getHeaders();
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers,
      });
      await AsyncStorage.removeItem('supabase.auth.token');
      return { error: null };
    } catch (error) {
      console.error('Error signing out:', error);
      return { error };
    }
  },

  getSession: async () => {
    try {
      const session = await AsyncStorage.getItem('supabase.auth.token');
      if (!session) {
        return { data: null, error: null };
      }

      const sessionData = JSON.parse(session);
      if (!sessionData.access_token) {
        return { data: null, error: null };
      }

      // First get the user from auth
      const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${sessionData.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
      });

      const userData = await userResponse.json();
      if (!userResponse.ok) {
        throw new Error(userData.error_description || 'Failed to get user');
      }

      // Then get the user profile
      const headers = {
        'Authorization': `Bearer ${sessionData.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };

      const profileResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/users?id=eq.${userData.id}&select=*`,
        { headers }
      );

      const profileData = await profileResponse.json();
      if (!profileResponse.ok) {
        throw new Error('Failed to get user profile');
      }

      const fullUser = {
        ...userData,
        ...(profileData[0] || {})
      };

      return { 
        data: { 
          session: sessionData,
          user: fullUser
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Error getting session:', error);
      await AsyncStorage.removeItem('supabase.auth.token');
      return { data: null, error };
    }
  },
};

// Simple data functions
export const supabase = {
  from: (table: string) => ({
    select: (columns: string) => {
      let queryParams = new URLSearchParams();
      queryParams.append('select', columns);
      let filters: { type: 'eq' | 'in'; column: string; value: any }[] = [];
      let limit = '';

      const queryBuilder = {
        eq: (column: string, value: any) => {
          filters.push({ type: 'eq', column, value });
          return queryBuilder;
        },
        in: (column: string, values: any[]) => {
          filters.push({ type: 'in', column, value: values });
          return queryBuilder;
        },
        single: () => {
          limit = '&limit=1';
          return queryBuilder;
        },
        execute: async () => {
          try {
            const headers = await getHeaders();
            headers['Accept'] = 'application/json';
            headers['Prefer'] = 'return=representation';
            
            const filterString = filters
              .map(f => {
                if (f.type === 'eq') {
                  return `${f.column}=eq.${f.value}`;
                } else if (f.type === 'in') {
                  return `${f.column}=in.(${(f.value as any[]).join(',')})`;
                }
                return '';
              })
              .filter(Boolean)
              .join('&');
            
            const url = `${SUPABASE_URL}/rest/v1/${table}?${queryParams.toString()}${filterString ? `&${filterString}` : ''}${limit}`;
            
            console.log('Making request to:', url);
            console.log('With headers:', JSON.stringify(headers, null, 2));
            
            const response = await fetch(url, { 
              headers,
              method: 'GET'
            });
            
            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
            if (!response.ok) {
              const errorData = JSON.parse(responseText);
              console.error('Error response:', errorData);
              throw new Error(errorData.message || errorData.error?.message || 'Query failed');
            }
            
            const data = JSON.parse(responseText);
            console.log('Parsed response data:', JSON.stringify(data, null, 2));
            
            if (limit && Array.isArray(data)) {
              return { data: data[0] || null, error: null };
            }
            
            return { data, error: null };
          } catch (error) {
            console.error('Select query error:', error);
            return { data: null, error };
          }
        }
      };

      return queryBuilder;
    },
    insert: async (data: any) => {
      try {
        const headers = await getHeaders();
        const url = `${SUPABASE_URL}/rest/v1/${table}`;
        console.log('Making insert request to:', url);
        console.log('Insert payload:', JSON.stringify(data, null, 2));
        console.log('Request headers:', JSON.stringify(headers, null, 2));
        
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
        });

        const responseText = await response.text();
        console.log('Raw insert response:', responseText);
        console.log('Response status:', response.status);
        console.log('Response headers:', JSON.stringify(Object.fromEntries([...response.headers]), null, 2));
        
        let result = null;
        if (responseText) {
          try {
            result = JSON.parse(responseText);
          } catch (e) {
            console.error('Failed to parse response as JSON:', e);
            throw new Error(`Invalid response: ${responseText}`);
          }
        }

        if (!response.ok) {
          console.error('Insert failed with status:', response.status);
          throw new Error(result?.message || result?.error?.message || 'Insert failed');
        }

        return { data: result, error: null };
      } catch (error) {
        console.error('Error in insert operation:', error);
        return { data: null, error };
      }
    },
    update: (data: any) => {
      let filters: { column: string; value: any }[] = [];

      return {
        eq: (column: string, value: any) => {
          filters.push({ column, value });
          return {
            execute: async () => {
              try {
                const headers = await getHeaders();
                const filterString = filters.map(f => `${f.column}=eq.${f.value}`).join('&');
                const url = `${SUPABASE_URL}/rest/v1/${table}?${filterString}`;
                const response = await fetch(url, {
                  method: 'PATCH',
                  headers,
                  body: JSON.stringify(data),
                });
                const responseText = await response.text();
                let result = null;
                if (responseText) {
                  try {
                    result = JSON.parse(responseText);
                  } catch (e) {
                    console.error('Failed to parse update response as JSON:', e);
                    throw new Error(`Invalid response: ${responseText}`);
                  }
                }
                if (!response.ok) {
                  throw new Error(result?.error?.message || 'Update failed');
                }
                return { data: result, error: null };
              } catch (error) {
                console.error('Error updating data:', error);
                return { data: null, error };
              }
            }
          };
        }
      };
    },
    delete: () => {
      let filters: { column: string; value: any }[] = [];

      const queryBuilder = {
        eq: (column: string, value: any) => {
          filters.push({ column, value });
          return queryBuilder;
        },
        execute: async () => {
          try {
            const headers = await getHeaders();
            const filterString = filters.map(f => `${f.column}=eq.${f.value}`).join('&');
            const url = `${SUPABASE_URL}/rest/v1/${table}?${filterString}`;
            const response = await fetch(url, {
              method: 'DELETE',
              headers,
            });
            const responseText = await response.text();
            let result = null;
            if (responseText) {
              try {
                result = JSON.parse(responseText);
              } catch (e) {
                console.error('Failed to parse delete response as JSON:', e);
                throw new Error(`Invalid response: ${responseText}`);
              }
            }
            if (!response.ok) {
              throw new Error(result?.error?.message || 'Delete failed');
            }
            return { data: result, error: null };
          } catch (error) {
            console.error('Error deleting data:', error);
            return { data: null, error };
          }
        }
      };

      return queryBuilder;
    },
  }),
}; 
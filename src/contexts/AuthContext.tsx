import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import {
  User,
  UserCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  Auth
} from 'firebase/auth';
import { auth as firebaseAuth } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signup: (email: string, password: string, username: string) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  googleSignIn: () => Promise<UserCredential>;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
  auth?: Auth; // Allow custom auth instance for testing
}

export function AuthProvider({ children, auth = firebaseAuth }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Set auth persistence and initialize auth state listener
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Set persistence to LOCAL for persistent sessions
        await setPersistence(auth, browserLocalPersistence);
        
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            // Force token refresh to ensure validity
            const token = await user.getIdToken(true);
            console.debug('Auth state changed - User logged in with token:', token);
          }
          setCurrentUser(user);
          setLoading(false);
        });

        return unsubscribe;
      } catch (err) {
        console.error('Auth initialization error:', err);
        setLoading(false);
      }
    };

    initializeAuth();
  }, [auth]);

  const signup = useCallback(async (email: string, password: string, username: string) => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: username });
      return userCredential;
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account');
      throw error;
    }
  }, [auth]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to login');
      throw error;
    }
  }, [auth]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error(error.message || 'Failed to logout');
      throw error;
    }
  }, [auth]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message || 'Failed to send reset email');
      throw error;
    }
  }, [auth]);

  const updateUserProfile = useCallback(async (displayName: string, photoURL?: string) => {
    if (!auth.currentUser) {
      throw new Error('No user is currently logged in');
    }

    try {
      await updateProfile(auth.currentUser, { displayName, photoURL });
      setCurrentUser({ ...auth.currentUser });
      toast.success('Profile updated!');
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Failed to update profile');
      throw error;
    }
  }, [auth]);

  const googleSignIn = useCallback(async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Force token refresh after sign-in
      await result.user.getIdToken(true);
      return result;
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Sign in popup was closed');
      } else {
        toast.error(error.message || 'Failed to sign in with Google');
      }
      throw error;
    }
  }, [auth]);

  const getIdToken = useCallback(async (forceRefresh = false) => {
    if (!auth.currentUser) {
      throw new Error('No user is currently logged in');
    }
    return auth.currentUser.getIdToken(forceRefresh);
  }, [auth]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    currentUser,
    loading,
    signup,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    googleSignIn,
    getIdToken
  }), [
    currentUser,
    loading,
    signup,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    googleSignIn,
    getIdToken
  ]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
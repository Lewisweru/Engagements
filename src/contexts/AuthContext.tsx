// --- START OF FILE Engagements/src/contexts/AuthContext.tsx --- (Corrected loadingAppUser)
import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import {
  User as FirebaseUser,
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
import axios from 'axios';

interface AppUser {
    _id: string;
    firebaseUid: string;
    username: string;
    email: string;
    name?: string;
    profilePic?: string;
    country?: string;
    role: 'user' | 'admin';
    createdAt: string;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  loadingAppUser: boolean;
  signup: (email: string, password: string, username: string, country: string) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  googleSignIn: (country?: string) => Promise<UserCredential>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  syncUserWithBackend: (user: FirebaseUser, country?: string, name?: string, profilePic?: string) => Promise<AppUser | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL || ''}/api`,
  timeout: 10000,
});

apiClient.interceptors.request.use(async (config) => {
  const user = firebaseAuth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
      console.debug('[Axios Interceptor] Token added to request.');
    } catch (error) {
      console.error('[Axios Interceptor] Error getting ID token:', error);
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

interface AuthProviderProps {
  children: ReactNode;
  authInstance?: Auth;
}

export function AuthProvider({ children, authInstance = firebaseAuth }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAppUser, setLoadingAppUser] = useState(true);

  const syncUserWithBackend = useCallback(async (user: FirebaseUser | null, country?: string, name?: string, profilePic?: string): Promise<AppUser | null> => {
    if (!user) {
      console.log('[Sync Backend] No user to sync.');
      setAppUser(null);
      setLoadingAppUser(false); // Set false on explicit logout/no user
      return null;
    }
    // Set loading true before the try block
    setLoadingAppUser(true);
    console.log(`[Sync Backend] Attempting sync for UID: ${user.uid}`);
    try {
        const syncPayload = {
             firebaseUid: user.uid,
             email: user.email,
             ...( (name || user.displayName) && { name: name || user.displayName } ),
             ...( (profilePic || user.photoURL) && { profilePic: profilePic || user.photoURL } ),
             ...( country && { country: country })
        };
        console.log("[Sync Backend] Sending payload:", syncPayload);

        const response = await apiClient.post<{ success: boolean; user: AppUser; message: string }>(
             '/auth/sync-firebase-user',
             syncPayload
         );

      if (response.data.success && response.data.user) {
        setAppUser(response.data.user);
        console.log(`[Sync Backend] Sync successful for user: ${response.data.user.username}`);
        // setLoadingAppUser(false); // Moved to finally
        return response.data.user;
      } else {
        throw new Error(response.data.message || 'Backend sync failed');
      }
    } catch (error: any) {
      console.error('[Sync Backend] Error syncing user with backend:', error);
      const backendErrorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      toast.error(`Account sync failed: ${backendErrorMessage || 'Network Error or Server Issue'}`);
      setAppUser(null);
      // setLoadingAppUser(false); // Moved to finally
      return null;
    } finally {
      // *** ENSURE loading is set to false regardless of success or failure ***
      setLoadingAppUser(false);
      console.log('[Sync Backend] setLoadingAppUser(false) called in finally block.');
    }
  }, []);

  useEffect(() => {
    console.log('[AuthProvider] Setting up Firebase Auth listener...');
    setLoading(true);
    setLoadingAppUser(true);

    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      console.log('[AuthProvider] onAuthStateChanged. User:', user ? user.uid : 'null');
      setCurrentUser(user);
      if (user) {
        await syncUserWithBackend(user, undefined, user.displayName || undefined, user.photoURL || undefined);
      } else {
        setAppUser(null);
        setLoadingAppUser(false);
      }
      setLoading(false);
    });

    return () => {
        console.log('[AuthProvider] Cleaning up Firebase Auth listener.');
        unsubscribe();
    }
  }, [authInstance, syncUserWithBackend]);

  const signup = useCallback(async (email: string, password: string, username: string, country: string) => {
    try {
      await setPersistence(authInstance, browserLocalPersistence);
      const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
      toast.success(`Account created for ${email}.`);
      const firebaseUser = userCredential.user;

      await updateProfile(firebaseUser, { displayName: username });
      setCurrentUser({ ...firebaseUser, displayName: username } as FirebaseUser);
      toast.success(`Profile name set to ${username}. Syncing...`);

      await syncUserWithBackend(firebaseUser, country, username);

      return userCredential;
    } catch (error: any) {
      console.error('Signup error:', error);
      const message = error.message?.replace('Firebase: ', '') || 'Failed to create account.';
      toast.error(`Signup failed: ${message}`);
      throw error;
    }
  }, [authInstance, syncUserWithBackend]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await setPersistence(authInstance, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
      toast.success(`Welcome back, ${userCredential.user.displayName || userCredential.user.email}!`);
      // onAuthStateChanged handles sync
      return userCredential;
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.message?.replace('Firebase: ', '') || 'Failed to login.';
       toast.error(`Login failed: ${message}`);
      throw error;
    }
  }, [authInstance]);

  const logout = useCallback(async () => {
    try {
      await signOut(authInstance);
      // onAuthStateChanged handles state clearing
      toast.success('Successfully logged out!');
    } catch (error: any) {
      console.error('Logout error:', error);
      const message = error.message?.replace('Firebase: ', '') || 'Failed to logout.';
      toast.error(`Logout failed: ${message}`);
      throw error;
    }
  }, [authInstance]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(authInstance, email);
      toast.success(`Password reset email sent to ${email}!`);
    } catch (error: any) {
      console.error('Password reset error:', error);
      const message = error.message?.replace('Firebase: ', '') || 'Failed to send reset email.';
      toast.error(`Password reset failed: ${message}`);
      throw error;
    }
  }, [authInstance]);

  const updateUserProfile = useCallback(async (displayName: string, photoURL?: string) => {
    const user = authInstance.currentUser;
    if (!user) {
      toast.error('No user logged in to update profile.');
      throw new Error('No user is currently logged in');
    }
    try {
      await updateProfile(user, { displayName, photoURL });
      const updatedFirebaseUser = { ...user, displayName, photoURL: photoURL || user.photoURL };
      setCurrentUser(updatedFirebaseUser as FirebaseUser);
      toast.success('Firebase profile updated. Syncing...');
      await syncUserWithBackend(updatedFirebaseUser as FirebaseUser, undefined, displayName, photoURL);
    } catch (error: any) {
      console.error('Firebase profile update error:', error);
      const message = error.message?.replace('Firebase: ', '') || 'Failed to update profile.';
      toast.error(`Profile update failed: ${message}`);
      throw error;
    }
  }, [authInstance, syncUserWithBackend]);

  const googleSignIn = useCallback(async (country?: string) => {
    try {
      await setPersistence(authInstance, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(authInstance, provider);
      toast.success(`Signed in as ${result.user.displayName || result.user.email}!`);
      await syncUserWithBackend(result.user, country, result.user.displayName || undefined, result.user.photoURL || undefined);
      return result;
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      let message = error.message?.replace('Firebase: ', '') || 'Failed to sign in with Google.';
      if (error.code === 'auth/popup-closed-by-user') {
        message = 'Sign in popup was closed.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
          message = 'An account already exists with this email using a different sign-in method.';
      }
      toast.error(`Google Sign-In failed: ${message}`);
      throw error;
    }
  }, [authInstance, syncUserWithBackend]);

  const getIdToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    const user = authInstance.currentUser;
    if (!user) {
      console.warn("[getIdToken] Called when currentUser is null.");
      return null;
    }
    try {
      return await user.getIdToken(forceRefresh);
    } catch (error) {
      console.error("[getIdToken] Error getting ID token:", error);
      toast.error('Could not refresh session. Please log in again.');
      return null;
    }
  }, [authInstance]);

  const value = useMemo(() => ({
    currentUser, appUser, loading, loadingAppUser,
    signup, login, logout, resetPassword, updateUserProfile, googleSignIn, getIdToken, syncUserWithBackend
  }), [
    currentUser, appUser, loading, loadingAppUser,
    signup, login, logout, resetPassword, updateUserProfile, googleSignIn, getIdToken, syncUserWithBackend
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
// --- END OF FILE Engagements/src/contexts/AuthContext.tsx ---
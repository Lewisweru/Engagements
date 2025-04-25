// contexts/AuthContext.tsx
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
import axios from 'axios'; // Import axios for backend calls

// Define a type for the user object returned by your backend /api/auth/current-user
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
    // Add other relevant fields from your backend user model
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
  syncUserWithBackend: (user: FirebaseUser, country?: string, name?: string, profilePic?: string) => Promise<AppUser | null>; // Return synced user or null
  // apiClient: typeof apiClient; // Expose if needed directly, otherwise import it
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// --- Axios Instance for API Calls ---
// Export this instance so components can import and use it directly
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || '/api',
  timeout: 10000, // Add a reasonable timeout
});

// Axios Request Interceptor to add Firebase ID Token
apiClient.interceptors.request.use(async (config) => {
  const user = firebaseAuth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
      console.debug('[Axios Interceptor] Token added to request.');
    } catch (error) {
      console.error('[Axios Interceptor] Error getting ID token:', error);
      // Maybe throw a specific error or handle appropriately
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// --- Auth Provider Component ---
interface AuthProviderProps {
  children: ReactNode;
  authInstance?: Auth;
}

export function AuthProvider({ children, authInstance = firebaseAuth }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAppUser, setLoadingAppUser] = useState(true); // Start true until first sync attempt

  // --- Function to Sync Firebase User with Backend ---
  // Returns the synced AppUser or null on failure
  const syncUserWithBackend = useCallback(async (user: FirebaseUser | null, country?: string, name?: string, profilePic?: string): Promise<AppUser | null> => {
    if (!user) {
      console.log('[Sync Backend] No user to sync.');
      setAppUser(null);
      setLoadingAppUser(false); // Ensure loading stops on logout
      return null;
    }
    setLoadingAppUser(true);
    console.log(`[Sync Backend] Attempting sync for UID: ${user.uid}`);
    try {
        const syncPayload = {
             firebaseUid: user.uid,
             email: user.email,
             // Prioritize explicitly passed details, fallback to Firebase profile
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
        // Toast can be optional here, maybe only on initial creation?
        // toast.success(response.data.message || 'Account synchronized!');
        setLoadingAppUser(false);
        return response.data.user; // Return the synced user
      } else {
        throw new Error(response.data.message || 'Backend sync failed');
      }
    } catch (error: any) {
      console.error('[Sync Backend] Error syncing user with backend:', error);
      const backendErrorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      toast.error(`Account sync failed: ${backendErrorMessage || 'Unknown error'}`);
      setAppUser(null); // Clear app user on sync failure
      setLoadingAppUser(false);
      return null; // Return null on failure
    }
  }, []); // Dependencies are implicitly handled

  // --- Firebase Auth State Listener ---
  useEffect(() => {
    console.log('[AuthProvider] Setting up Firebase Auth listener...');
    setLoading(true); // Ensure loading is true while listener sets up
    setLoadingAppUser(true);

    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      console.log('[AuthProvider] onAuthStateChanged. User:', user ? user.uid : 'null');
      setCurrentUser(user);
      if (user) {
        // Sync when auth state changes to logged in
        await syncUserWithBackend(user, undefined, user.displayName || undefined, user.photoURL || undefined);
      } else {
        // Ensure states are cleared on logout
        setAppUser(null);
        setLoadingAppUser(false);
      }
      setLoading(false); // Firebase auth state is now determined
    });

    return () => {
        console.log('[AuthProvider] Cleaning up Firebase Auth listener.');
        unsubscribe();
    }
  }, [authInstance, syncUserWithBackend]);

  // --- Auth Actions ---

  const signup = useCallback(async (email: string, password: string, username: string, country: string) => {
    try {
      await setPersistence(authInstance, browserLocalPersistence);
      const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
      toast.success(`Account created for ${email}.`);
      const firebaseUser = userCredential.user;

      await updateProfile(firebaseUser, { displayName: username });
      // Update local state immediately for better UX
      setCurrentUser({ ...firebaseUser, displayName: username } as FirebaseUser);
      toast.success(`Profile name set to ${username}. Syncing...`);

      // Explicitly sync after profile update, passing all known details
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
      // onAuthStateChanged will handle the sync
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
      // State updates (currentUser, appUser) will be handled by onAuthStateChanged
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

  // Updates Firebase profile & triggers backend sync
  const updateUserProfile = useCallback(async (displayName: string, photoURL?: string) => {
    const user = authInstance.currentUser;
    if (!user) {
      toast.error('No user logged in to update profile.');
      throw new Error('No user is currently logged in');
    }
    try {
      await updateProfile(user, { displayName, photoURL });
      const updatedFirebaseUser = { ...user, displayName, photoURL: photoURL || user.photoURL };
      setCurrentUser(updatedFirebaseUser as FirebaseUser); // Update local Firebase state
      toast.success('Firebase profile updated. Syncing...');
      // Explicitly sync backend with potentially new name/photo
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
      // Explicitly sync after Google sign-in, passing country if available
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

  // Memoize context value
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

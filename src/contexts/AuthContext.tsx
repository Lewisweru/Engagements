// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
  browserSessionPersistence,
  browserLocalPersistence,
  inMemoryPersistence
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from "react-hot-toast";

interface AuthContextType {
  currentUser: User | null;
  signup: (email: string, password: string, username: string, country: string) => Promise<void>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
  googleSignIn: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Set persistence when component mounts
  useEffect(() => {
    const setAuthPersistence = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        console.log("[AuthContext] Persistence set to LOCAL");
      } catch (error) {
        console.error("Error setting auth persistence:", error);
      }
    };
    setAuthPersistence();
  }, []);

  async function signup(email: string, password: string, username: string, country: string): Promise<void> {
    let firebaseUser: User | null = null;
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    
    if (!backendUrl) {
      toast.error("Configuration error. Cannot reach backend.");
      throw new Error("Backend URL not configured.");
    }

    try {
      console.log(`[AuthContext Signup] Attempting Firebase creation for ${email}`);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      firebaseUser = userCredential.user;
      
      if (!firebaseUser) throw new Error("Firebase user creation returned null.");
      console.log(`[AuthContext Signup] Firebase user created: ${firebaseUser.uid}`);

      try {
        await updateProfile(firebaseUser, { displayName: username });
        console.log(`[AuthContext Signup] Firebase profile updated for ${firebaseUser.uid}`);
      } catch (profileError) {
        console.warn(`[AuthContext Signup] Failed to update Firebase display name:`, profileError);
      }

      const backendResponse = await fetch(`${backendUrl}/api/auth/create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email,
          username: username,
          country: country,
          password: password,
          name: username,
          profilePic: firebaseUser.photoURL || "default-profile.png",
        }),
      });

      if (!backendResponse.ok) {
        console.error(`[AuthContext Signup] Backend /create-user failed (${backendResponse.status})`);
        await firebaseUser.delete().catch(err => console.error("Firebase user cleanup failed:", err));
        const errorData = await backendResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Backend user record creation failed: ${backendResponse.statusText}`);
      }

      console.log(`[AuthContext Signup] Backend /create-user successful for ${firebaseUser.uid}`);
      toast.success("Account created successfully!");

    } catch (error: any) {
      console.error("Signup Process Error:", error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error("This email is already registered.");
      } else if (error.code === 'auth/weak-password') {
        toast.error("Password is too weak (must be at least 6 characters).");
      } else if (error.message?.includes('Backend') || error.message?.includes('already exists')) {
        toast.error(error.message);
      } else {
        toast.error("Failed to create account. Please try again.");
      }
      throw error;
    }
  }

  async function login(email: string, password: string): Promise<UserCredential> {
    try {
      console.log(`[AuthContext Login] Attempting Firebase login for ${email}...`);
      // Explicitly set persistence before login
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log(`[AuthContext Login] Firebase login successful for ${result.user.uid}.`);
      toast.success("Logged in successfully!");
      return result;
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || 
          error.code === 'auth/wrong-password' || error.code === 'auth/invalid-email') {
        toast.error("Invalid email or password provided.");
      } else {
        toast.error("Failed to log in. Please try again.");
      }
      throw error;
    }
  }

  async function logout(): Promise<void> {
    try {
      console.log(`[AuthContext Logout] Logging out user: ${currentUser?.uid}`);
      await signOut(auth);
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout Error:", error);
      toast.error("Failed to log out. Please try again.");
    }
  }

  async function resetPassword(email: string): Promise<void> {
    console.log(`[AuthContext ResetPassword] Sending reset email to: ${email}`);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent! Check your inbox (and spam).");
    } catch (error: any) {
      console.error("Password Reset Error:", error);
      if(error.code === 'auth/user-not-found') {
        toast.error("No user found with this email address.");
      } else {
        toast.error("Failed to send password reset email.");
      }
    }
  }

  async function updateUserProfile(displayName: string): Promise<void> {
    console.log(`[AuthContext UpdateProfile] Updating display name for ${auth.currentUser?.uid}`);
    try {
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, { displayName });
        await user.reload();
        setCurrentUser({ ...user }); // Force state update
        toast.success("Profile display name updated!");
      } else {
        toast.error("You must be logged in to update your profile.");
        throw new Error("No user logged in.");
      }
    } catch (error) {
      console.error("Profile Update Error:", error);
      toast.error("Failed to update profile display name.");
    }
  }

  async function googleSignIn(): Promise<void> {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (!backendUrl) { 
      console.error("Backend URL missing"); 
      toast.error("Configuration error."); 
      return; 
    }

    try {
      console.log("[AuthContext GoogleSignIn] Initiating Google Sign-In popup...");
      // Set persistence before sign-in
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log(`[AuthContext GoogleSignIn] Firebase Sign-In successful. UID: ${user.uid}`);

      const backendResponse = await fetch(`${backendUrl}/api/auth/firebase-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email,
          name: user.displayName || "Anonymous User",
          profilePic: user.photoURL || "default-profile.png",
        }),
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json().catch(() => ({}));
        console.error("[AuthContext GoogleSignIn] Backend sync failed:", errorData);
        throw new Error(errorData.error || `Backend user sync failed: ${backendResponse.statusText}`);
      }
      
      console.log(`[AuthContext GoogleSignIn] Backend sync successful for UID: ${user.uid}`);
      toast.success("Logged in with Google successfully!");
    } catch (error: any) {
      console.error("Google Sign-In Process Error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error("Google Sign-In cancelled.");
      } else if (error.message?.includes('Backend sync failed')) {
        toast.error(`Login succeeded but account sync failed: ${error.message}`);
      } else {
        toast.error("Google Sign-In failed!");
      }
    }
  }

  useEffect(() => {
    console.log("[AuthContext Effect] Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log(`[AuthContext Effect] Auth state changed. User UID: ${user ? user.uid : 'null'}`);
      
      // Additional check to ensure token is fresh
      if (user) {
        try {
          const token = await user.getIdTokenResult();
          console.log(`[AuthContext] Token expiration: ${token.expirationTime}`);
        } catch (tokenError) {
          console.error("Token check failed:", tokenError);
        }
      }
      
      setCurrentUser(user);
      setLoading(false);
    });

    return () => {
      console.log("[AuthContext Effect] Cleaning up onAuthStateChanged listener.");
      unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    googleSignIn,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
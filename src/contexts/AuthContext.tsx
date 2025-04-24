// src/contexts/AuthContext.tsx (FULL CODE - Fixed useAuth, login catch, logging)

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
  GoogleAuthProvider, // Needed for googleSignIn
  signInWithPopup,    // Needed for googleSignIn
} from "firebase/auth";
import { auth } from "@/lib/firebase"; // Ensure path is correct
import { toast } from "react-hot-toast";

// Interface defining the context shape
interface AuthContextType {
  currentUser: User | null;
  signup: (email: string, password: string, username: string, country: string) => Promise<void>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
  googleSignIn: () => Promise<void>; // Make sure this is defined
  loading: boolean;
}

// Create the context with a default null value
const AuthContext = createContext<AuthContextType | null>(null);

// --- Custom Hook to Consume Context ---
// This MUST be present and correct
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // This error prevents using the hook outside the provider
    throw new Error("useAuth must be used within an AuthProvider");
  }
  // Make sure this return statement exists
  return context;
}
// --- End Custom Hook ---


// Props type for the provider component
interface AuthProviderProps {
    children: ReactNode;
}

// --- Auth Provider Component ---
export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start loading until initial check completes

  // Signup function (Creates Firebase user, then calls backend to create DB record)
  async function signup(email: string, password: string, username: string, country: string): Promise<void> {
    let firebaseUser: User | null = null; // Keep track of created Firebase user for potential cleanup
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

      // Attempt to update Firebase profile display name right away
      try {
          await updateProfile(firebaseUser, { displayName: username });
          console.log(`[AuthContext Signup] Firebase profile updated for ${firebaseUser.uid}`);
      } catch (profileError) {
           console.warn(`[AuthContext Signup] Failed to update Firebase display name immediately:`, profileError);
           // Continue signup process even if display name update fails initially
      }


      // Call backend to create the corresponding user record in MongoDB
      console.log(`[AuthContext Signup] Calling backend /create-user for ${firebaseUser.uid}`);
      const backendResponse = await fetch(`${backendUrl}/api/auth/create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send all necessary info for the backend User schema
        body: JSON.stringify({
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email,
          username: username, // Send the collected username
          country: country,   // Send the collected country
          password: password, // Send password for backend to hash and store (optional)
          name: username,     // Default name to username initially
          profilePic: firebaseUser.photoURL || "default-profile.png", // Use default if no photoURL
        }),
      });

      if (!backendResponse.ok) {
        // If backend creation fails, delete the Firebase user to avoid orphans
        console.error(`[AuthContext Signup] Backend /create-user failed (${backendResponse.status}). Deleting Firebase user ${firebaseUser.uid}...`);
        await firebaseUser.delete().catch(err => console.error("Firebase user cleanup failed:", err));
        console.log(`[AuthContext Signup] Orphaned Firebase user ${firebaseUser.uid} deleted.`);
        const errorData = await backendResponse.json().catch(() => ({})); // Try to get error message
        throw new Error(errorData.error || `Backend user record creation failed: ${backendResponse.statusText}`);
      }

      console.log(`[AuthContext Signup] Backend /create-user successful for ${firebaseUser.uid}`);
      // No need to setCurrentUser here; onAuthStateChanged will handle it when Firebase confirms creation.
      toast.success("Account created successfully! Please log in."); // Prompt login as state might take a moment

    } catch (error: any) {
      console.error("Signup Process Error:", error);
      // More specific Firebase Auth errors
      if (error.code === 'auth/email-already-in-use') {
        toast.error("This email is already registered with Firebase.");
      } else if (error.code === 'auth/weak-password') {
         toast.error("Password is too weak (must be at least 6 characters).");
      }
      // Handle backend errors passed up
      else if (error.message?.includes('Backend') || error.message?.includes('already exists')) {
         toast.error(error.message); // Show specific backend error
      }
      // Generic fallback
      else {
        toast.error("Failed to create account. Please try again.");
      }
      // Re-throw the error so the calling component (e.g., AuthPage) knows signup failed
      throw error;
    }
  }

  // Login function (Firebase Client SDK ONLY)
  async function login(email: string, password: string): Promise<UserCredential> {
    try {
      console.log(`[AuthContext Login] Attempting Firebase login for ${email}...`);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log(`[AuthContext Login] Firebase login successful for ${result.user.uid}.`);
      // onAuthStateChanged listener will handle setting currentUser state
      toast.success("Logged in successfully!");
      return result; // Return the UserCredential on success
    } catch (error: any) {
      console.error("Login Error:", error);
      // Check common Firebase login error codes
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-email') {
         toast.error("Invalid email or password provided.");
      } else {
         toast.error("Failed to log in. Please try again.");
      }
      // Re-throw the error for the calling component
      throw error;
    }
    // This part is technically unreachable due to throw, but satisfies strict TS return path check
    // return Promise.reject(new Error("Login failed"));
  }

  // Logout function (Firebase Client SDK ONLY)
  async function logout(): Promise<void> {
    try {
      console.log(`[AuthContext Logout] Logging out user: ${currentUser?.uid}`);
      await signOut(auth);
      // onAuthStateChanged listener will set currentUser to null
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout Error:", error);
      toast.error("Failed to log out. Please try again.");
    }
  }

  // Reset Password (Firebase only)
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

  // Update Firebase Profile (Only Display Name here)
  async function updateUserProfile(displayName: string): Promise<void> {
     console.log(`[AuthContext UpdateProfile] Updating display name for ${auth.currentUser?.uid} to ${displayName}`);
     try {
        const user = auth.currentUser;
        if (user) {
            await updateProfile(user, { displayName });
            // Note: Might need a backend call here if you want to sync MongoDB 'name' field too
            // await fetch(... update backend profile ...)
            await user.reload(); // Reload the user object to get latest profile data
            setCurrentUser(auth.currentUser); // Update context state immediately
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

  // Google Sign In (Calls backend /firebase-user for sync)
  async function googleSignIn(): Promise<void> {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (!backendUrl) { console.error("Backend URL missing"); toast.error("Configuration error."); return; }
    try {
      console.log("[AuthContext GoogleSignIn] Initiating Google Sign-In popup...");
      const provider = new GoogleAuthProvider(); // Create provider instance
      const result = await signInWithPopup(auth, provider); // Trigger sign-in
      const user = result.user;
      console.log(`[AuthContext GoogleSignIn] Firebase Sign-In successful. UID: ${user.uid}, Email: ${user.email}`);

      // Sync/Create user in backend via /firebase-user endpoint
      console.log(`[AuthContext GoogleSignIn] Calling backend sync for UID: ${user.uid}`);
      const backendResponse = await fetch(`${backendUrl}/api/auth/firebase-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email,
          name: user.displayName || "Anonymous User", // Use Google's display name
          profilePic: user.photoURL || "default-profile.png", // Use Google's photo
          // Backend /firebase-user handler should provide defaults for username/country
        }),
      });

       if (!backendResponse.ok) {
           const errorData = await backendResponse.json().catch(() => ({}));
           console.error("[AuthContext GoogleSignIn] Backend sync failed:", errorData);
           // Consider signing out if backend sync fails critically
           // await signOut(auth);
           throw new Error(errorData.error || `Backend user sync failed: ${backendResponse.statusText}`);
       }
      console.log(`[AuthContext GoogleSignIn] Backend sync successful for UID: ${user.uid}`);
      // onAuthStateChanged listener handles setting currentUser state
      toast.success("Logged in with Google successfully!");
    } catch (error: any) {
      console.error("Google Sign-In Process Error:", error);
       if (error.code === 'auth/popup-closed-by-user') {
           toast.error("Google Sign-In cancelled.");
       } else if (error.message?.includes('Backend sync failed')) {
            // Show the specific backend sync error message
           toast.error(`Login succeeded but account sync failed: ${error.message}`);
       }
       else {
          toast.error("Google Sign-In failed!");
       }
       // Decide if you need to re-throw or handle differently
    }
  }

  // Auth State Listener - Handles setting currentUser state reliably
  useEffect(() => {
    console.log("[AuthContext Effect] Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log(`[AuthContext Effect] Auth state changed. User UID: ${user ? user.uid : 'null'}`);
      setCurrentUser(user); // Update state based on Firebase's real-time auth state
      setLoading(false);
      console.log(`[AuthContext Effect] Loading set to false.`);
    });
    // Cleanup listener on component unmount
    return () => {
        console.log("[AuthContext Effect] Cleaning up onAuthStateChanged listener.");
        unsubscribe();
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // Context value provided to children components
  const value: AuthContextType = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    googleSignIn, // Make sure googleSignIn is included here
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
        {/* Don't render children until initial auth check is complete */}
        {!loading && children}
    </AuthContext.Provider>
  );
}
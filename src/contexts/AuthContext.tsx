// src/contexts/AuthContext.tsx (FULL CODE - Added return in login catch)

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
} from "firebase/auth";
import { auth } from "@/lib/firebase"; // Ensure path is correct
import { toast } from "react-hot-toast";

interface AuthContextType {
  currentUser: User | null;
  signup: (email: string, password: string, username: string, country: string) => Promise<void>;
  login: (email: string, password: string) => Promise<UserCredential>; // Return type is UserCredential
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
  googleSignIn: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) { throw new Error("useAuth must be used within an AuthProvider"); }
  return context;
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Signup function
  async function signup(email: string, password: string, username: string, country: string): Promise<void> {
    let firebaseUser: User | null = null;
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (!backendUrl) { throw new Error("Backend URL not configured."); }

    try {
      console.log(`[AuthContext Signup] Attempting Firebase creation for ${email}`);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      firebaseUser = userCredential.user;
      if (!firebaseUser) throw new Error("Firebase user creation failed unexpectedly.");
      console.log(`[AuthContext Signup] Firebase user created: ${firebaseUser.uid}`);

      await updateProfile(firebaseUser, { displayName: username });
      console.log(`[AuthContext Signup] Firebase profile updated for ${firebaseUser.uid}`);

      console.log(`[AuthContext Signup] Calling backend /create-user for ${firebaseUser.uid}`);
      const backendResponse = await fetch(`${backendUrl}/api/auth/create-user`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebaseUid: firebaseUser.uid, email: firebaseUser.email, username, country, password, name: username, profilePic: firebaseUser.photoURL || "default-profile.png" }),
      });

      if (!backendResponse.ok) {
        console.error(`[AuthContext Signup] Backend /create-user failed (${backendResponse.status}). Deleting Firebase user...`);
        await firebaseUser.delete().catch(err => console.error("Failed to delete Firebase user:", err));
        const errorData = await backendResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Backend user creation failed: ${backendResponse.statusText}`);
      }
      console.log(`[AuthContext Signup] Backend /create-user successful for ${firebaseUser.uid}`);
      toast.success("Account created successfully!");

    } catch (error: any) {
      console.error("Signup Error:", error);
      if (error.message?.includes('Backend') && firebaseUser && auth.currentUser?.uid === firebaseUser.uid) { try { await firebaseUser.delete(); console.log("Firebase user deleted due to backend error."); } catch (deleteError) { console.error("Cleanup delete failed:", deleteError); } }
      if (error.code === 'auth/email-already-in-use') { toast.error("Email already registered."); }
      else if (error.message?.includes('Backend') && error.message?.includes('already exists')) { toast.error("User already exists."); }
      else { toast.error(error.message || "Failed to create account."); }
      throw error; // Re-throw
    }
  }

  // Login function
  async function login(email: string, password: string): Promise<UserCredential> {
    try {
      console.log(`[AuthContext Login] Attempting Firebase login for ${email}...`);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log(`[AuthContext Login] Firebase login successful for ${email}.`);
      toast.success("Logged in successfully!");
      return result; // Return the UserCredential on success
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
         toast.error("Invalid email or password.");
      } else {
         toast.error("Failed to log in.");
      }
      // FIX: Explicitly re-throw to satisfy Promise<UserCredential> return type,
      // even though execution stops, TypeScript prefers explicitness here.
      // The calling component's catch block will handle this thrown error.
      throw error;
    }
    // Note: TypeScript might still warn here if it can't guarantee a throw always happens.
    // If the error persists, you could technically return a rejected promise,
    // but throwing is standard practice.
    // return Promise.reject(new Error("Login failed")); // Alternative if throw isn't enough
  }

  // Logout function
  async function logout(): Promise<void> {
    try { console.log(`[AuthContext Logout] Logging out user: ${currentUser?.uid}`); await signOut(auth); toast.success("Logged out successfully"); }
    catch (error) { console.error("Logout Error:", error); toast.error("Failed to log out"); }
  }

  // Reset Password
  async function resetPassword(email: string): Promise<void> {
    try { await sendPasswordResetEmail(auth, email); toast.success("Password reset email sent!"); }
    catch (error: any) { console.error("Password Reset Error:", error); if(error.code === 'auth/user-not-found') { toast.error("No user found."); } else { toast.error("Failed reset email."); } }
  }

  // Update Firebase Profile
  async function updateUserProfile(displayName: string): Promise<void> {
     console.log(`[AuthContext UpdateProfile] Updating display name for ${auth.currentUser?.uid} to ${displayName}`);
     try { const user = auth.currentUser; if (user) { await updateProfile(user, { displayName }); await user.reload(); setCurrentUser(auth.currentUser); toast.success("Profile display name updated!"); } else { throw new Error("No user logged in."); } }
     catch (error) { console.error("Profile Update Error:", error); toast.error("Failed to update profile."); }
  }

  // Google Sign In function
  async function googleSignIn(): Promise<void> {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (!backendUrl) { console.error("Backend URL missing"); toast.error("Configuration error."); return; } // Added return
    try {
      console.log("[AuthContext GoogleSignIn] Initiating Google Sign-In popup...");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log(`[AuthContext GoogleSignIn] Success. UID: ${user.uid}, Email: ${user.email}`);

      console.log(`[AuthContext GoogleSignIn] Calling backend sync for UID: ${user.uid}`);
      const backendResponse = await fetch(`${backendUrl}/api/auth/firebase-user`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebaseUid: user.uid, email: user.email, name: user.displayName || "Anonymous User", profilePic: user.photoURL || "default-profile.png" }),
      });
       if (!backendResponse.ok) { const errorData = await backendResponse.json().catch(() => ({})); console.error("[AuthContext GoogleSignIn] Backend sync failed:", errorData); throw new Error(errorData.error || `Backend sync failed: ${backendResponse.statusText}`); }
      console.log(`[AuthContext GoogleSignIn] Backend sync successful for UID: ${user.uid}`);
      toast.success("Logged in with Google successfully!");
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
       if (error.code === 'auth/popup-closed-by-user') { toast.error("Google Sign-In cancelled."); }
       else if (error.message?.includes('Backend')) { toast.error(`Failed to sync account: ${error.message}`); }
       else { toast.error("Google Sign-In failed!"); }
    }
  }

  // Auth State Listener
  useEffect(() => {
    console.log("[AuthContext Effect] Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log(`[AuthContext Effect] Auth state changed. User UID: ${user ? user.uid : 'null'}`);
      setCurrentUser(user);
      setLoading(false);
      console.log(`[AuthContext Effect] Loading set to false.`);
    });
    return () => { console.log("[AuthContext Effect] Cleaning up listener."); unsubscribe(); };
  }, []);

  // Context value
  const value: AuthContextType = { currentUser, signup, login, logout, resetPassword, updateUserProfile, googleSignIn, loading };

  return (
    <AuthContext.Provider value={value}>
        {!loading && children}
    </AuthContext.Provider>
  );
}
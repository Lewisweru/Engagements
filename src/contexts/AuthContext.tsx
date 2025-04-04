import { createContext, useContext, useEffect, useState } from "react";
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

// --- Updated Interface ---
interface AuthContextType {
  currentUser: User | null;
  // Signup now requires username and country
  signup: (email: string, password: string, username: string, country: string) => Promise<void>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  // This updates Firebase displayName, might need separate logic for MongoDB username/name
  updateUserProfile: (displayName: string) => Promise<void>;
  googleSignIn: () => Promise<void>;
  loading: boolean;
}
// --- End Updated Interface ---

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // --- MODIFIED SIGNUP FUNCTION ---
  async function signup(email: string, password: string, username: string, country: string): Promise<void> {
    let firebaseUser: User | null = null;
    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      firebaseUser = userCredential.user;

      // 2. Immediately update Firebase profile displayName with the username
      //    This makes it available on the firebaseUser object quickly.
      if (firebaseUser && username) {
        await updateProfile(firebaseUser, { displayName: username });
        // Don't necessarily need reload if we use the username param below,
        // but good practice if subsequent steps rely *only* on firebaseUser object
        // await firebaseUser.reload();
        // firebaseUser = auth.currentUser; // Refresh local variable if needed elsewhere
      } else {
         // Handle case where firebaseUser is null unexpectedly
         throw new Error("Firebase user creation failed unexpectedly.");
      }


      // 3. Send user data (including new fields) to your backend's create-user endpoint
      const backendResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/create-user`, { // Ensure this endpoint exists and handles these fields
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email,
          username: username, // Send the collected username
          country: country,   // Send the collected country
          name: username,     // Use username as the default 'name' field too
          profilePic: firebaseUser.photoURL || "default-profile.png", // Default profile pic
          password: password, // Send raw password for backend hashing
        }),
      });

      if (!backendResponse.ok) {
        // Attempt to delete the Firebase user if backend creation failed
        // This prevents orphaned Firebase accounts
        if (firebaseUser) await firebaseUser.delete().catch(err => console.error("Failed to delete Firebase user after backend error:", err));
        const errorData = await backendResponse.json().catch(() => ({})); // Try to get error message
        throw new Error(errorData.error || `Backend user creation failed: ${backendResponse.statusText}`);
      }

      // 4. Set current user in context state
      // Use auth.currentUser which *should* reflect the displayName update if reload was used,
      // otherwise the initial firebaseUser object might not have it yet.
      setCurrentUser(auth.currentUser);
      toast.success("Account created successfully!");

    } catch (error: any) {
      console.error("Signup Error:", error);
      // Attempt to delete the Firebase user if Firebase creation succeeded but backend failed later
      if (error.message?.includes('Backend') && firebaseUser && auth.currentUser?.uid === firebaseUser.uid) {
         try {
             await firebaseUser.delete();
             console.log("Firebase user deleted due to backend error during signup.");
         } catch (deleteError) {
              console.error("Failed to delete Firebase user after backend error:", deleteError);
         }
      }
      // Provide more specific error feedback
      if (error.code === 'auth/email-already-in-use') {
        toast.error("This email is already registered.");
      } else if (error.message?.includes('Backend') && error.message?.includes('already exists')) {
         // Handle potential backend duplicate error if Firebase check somehow missed it
         toast.error("User already exists.");
      }
      else {
        toast.error(error.message || "Failed to create account.");
      }
       // Re-throw the error if you want calling components (like AuthPage) to catch it
       // throw error;
    }
  }
  // --- END MODIFIED SIGNUP ---


  async function login(email: string, password: string): Promise<UserCredential> {
    // Login logic seems okay - it calls Firebase first, then your backend.
    // Ensure your backend `/api/auth/login` endpoint correctly verifies the password hash stored in MongoDB.
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // Optional: Verify against your backend's login route if needed for session/token management
       const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/login`, { // Ensure path is correct
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ email, password }), // Send credentials for backend validation/session
       });

       if (!response.ok) {
          // Logout from Firebase if backend validation fails
           await signOut(auth);
           const errorData = await response.json().catch(() => ({}));
           throw new Error(errorData.message || "Backend login validation failed");
       }
       // Optional: Handle backend response (e.g., set custom token/session data)
       // const backendData = await response.json();

      setCurrentUser(user);
      toast.success("Logged in successfully!");
      return result;
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.message?.includes('Backend')) {
         toast.error("Invalid email or password.");
      } else {
         toast.error("Failed to log in.");
      }
      throw error; // Re-throw
    }
  }

  async function logout(): Promise<void> {
    try {
      // Optional: Call backend logout endpoint if you manage sessions there
      // await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/logout`, { method: 'POST' });
      await signOut(auth);
      setCurrentUser(null);
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout Error:", error);
      toast.error("Failed to log out");
    }
  }

  async function resetPassword(email: string): Promise<void> {
     // This only involves Firebase, looks okay.
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent!");
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
      // This updates Firebase profile displayName.
      // To update MongoDB username/name requires a separate backend call.
    try {
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, { displayName });
        // TODO: Add backend call here if needed to sync `name` field in MongoDB
        // Example:
        // await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user/profile`, {
        //    method: 'PUT',
        //    headers: { 'Content-Type': 'application/json', /* Add Auth headers */ },
        //    body: JSON.stringify({ name: displayName }) // Update 'name' field
        // });
        await user.reload(); // Reload Firebase user object
        setCurrentUser(auth.currentUser); // Update context state
        toast.success("Profile display name updated!"); // Clarify it's display name
      } else {
         throw new Error("No user logged in to update profile.");
      }
    } catch (error) {
      console.error("Profile Update Error:", error);
      toast.error("Failed to update profile display name");
    }
  }

  // Google Sign In uses /api/auth/firebase-user which finds/creates in Mongo.
  // It doesn't provide username/country separate from displayName/photoURL.
  async function googleSignIn(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Sync/Authenticate with backend using the /firebase-user endpoint
      // This endpoint should ideally populate the 'name' field from Google's displayName
      // It won't automatically get a distinct 'username' or 'country' here.
      const backendResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/firebase-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email,
          name: user.displayName || "Anonymous User", // Use Google's display name
          profilePic: user.photoURL || "default-profile.png", // Use Google's photo
          // username and country won't be available from Google sign-in directly
        }),
      });

       if (!backendResponse.ok) {
           const errorData = await backendResponse.json().catch(() => ({}));
           throw new Error(errorData.error || `Backend user sync failed: ${backendResponse.statusText}`);
       }

      // Set current user in context
      setCurrentUser(user);
      toast.success("Logged in with Google successfully!");
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
       if (error.code === 'auth/popup-closed-by-user') {
           toast.error("Google Sign-In cancelled.");
       } else {
          toast.error(error.message || "Google Sign-In failed!");
       }
    }
  }

  useEffect(() => {
    // Firebase auth state listener remains the same
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe; // Cleanup subscription on unmount
  }, []);

  // --- Update context value ---
  const value = {
    currentUser,
    signup, // Pass the updated signup function
    login,
    logout,
    resetPassword,
    updateUserProfile,
    googleSignIn,
    loading,
  };
  // --- End update context value ---

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
import Cookies from 'js-cookie';
import { auth as firebaseAuthInstance } from './firebase'; // Firebase client auth instance for client-side operations
import { signOut } from 'firebase/auth';
import {
  registerUserServerAction
  // loginUserServerAction, // No longer used here for login
} from './actions';

// User type/interface - ensure this matches what's stored in the cookie
interface User {
  uid: string;
  email: string;
  username: string;
}

interface AuthResult {
  success: boolean;
  user?: User;
  message?: string;
}

export const register = async (email: string, password: string, username: string): Promise<AuthResult> => {
  try {
    // Server action handles Firebase registration AND setting user info in Firestore
    const result = await registerUserServerAction(email, password, username);
    if (result.success && result.user) {
      // After successful registration via server action, the user will typically be redirected to login.
      // The login flow (now client-side) will handle setting any necessary client-side cookies.
      return { success: true, user: result.user };
    }
    return { success: false, message: result.message || 'Registration failed.' };
  } catch (error: any) {
    console.error('Registration client error:', error);
    return { success: false, message: error.message || 'An unexpected error occurred during registration.' };
  }
};

/*
// Login is now handled directly in login/page.tsx using client-side Firebase SDK signInWithEmailAndPassword.
// The login/page.tsx will also handle setting the 'user' cookie via Cookies.set().
// This function is therefore deprecated in this file.
export const login = async (email: string, password: string): Promise<AuthResult> => {
  console.warn("login function in src/lib/auth.ts is deprecated. Login is handled in login/page.tsx.");
  // This function would need to be refactored if it were to be used
  // to call a client-side signIn and then set cookies.
  // For now, it's best to rely on the implementation in login/page.tsx.
  return { success: false, message: "Deprecated. Login via login/page.tsx." };
};
*/

export const logout = async (): Promise<void> => {
  try {
    // Sign out the Firebase user from the client-side SDK
    await signOut(firebaseAuthInstance);
    console.log('[AuthLib] Firebase user signed out from client SDK.');
  } catch (error) {
    console.error('[AuthLib] Firebase sign out error:', error);
  } finally {
    // Remove the client-side accessible 'user' cookie
    Cookies.remove('user', { path: '/' });
    console.log('[AuthLib] Client-side "user" cookie removed.');
    // If you were setting an HttpOnly cookie via server actions for login,
    // you might need a server action for logout to clear that cookie specifically by setting its expiry to the past.
    // For now, relying on client-side logout and cookie removal for UI changes.
  }
};

// Gets user data from the client-side 'user' cookie (set by login/page.tsx)
export const getCurrentUser = (): User | null => {
  const userCookie = Cookies.get('user');
  if (userCookie) {
    try {
      return JSON.parse(userCookie) as User;
    } catch (e) {
      console.error("[AuthLib] Failed to parse 'user' cookie", e);
      Cookies.remove('user', { path: '/' }); // Remove invalid cookie
      return null;
    }
  }
  return null;
};

// Checks for the existence of the client-side 'user' cookie
export const isAuthenticated = (): boolean => {
  return !!Cookies.get('user');
};
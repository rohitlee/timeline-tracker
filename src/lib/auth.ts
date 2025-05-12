
import Cookies from 'js-cookie';
import { auth } from './firebase'; // Firebase client auth instance
import { signOut } from 'firebase/auth';
import { 
  registerUserServerAction, 
  loginUserServerAction 
} from './actions'; // Server actions for Firebase operations

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
    const result = await registerUserServerAction(email, password, username);
    if (result.success && result.user) {
      Cookies.set('user', JSON.stringify(result.user), { expires: 7, path: '/' });
      return { success: true, user: result.user };
    }
    return { success: false, message: result.message || 'Registration failed.' };
  } catch (error: any) {
    console.error('Registration client error:', error);
    return { success: false, message: error.message || 'An unexpected error occurred during registration.' };
  }
};

export const login = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const result = await loginUserServerAction(email, password);
    if (result.success && result.user) {
      Cookies.set('user', JSON.stringify(result.user), { expires: 7, path: '/' });
      return { success: true, user: result.user };
    }
    return { success: false, message: result.message || 'Login failed.' };
  } catch (error: any) {
    console.error('Login client error:', error);
    return { success: false, message: error.message || 'An unexpected error occurred during login.' };
  }
};

export const logout = async (): Promise<void> => {
  try {
    await signOut(auth); // Firebase sign out
  } catch (error) {
    console.error('Firebase sign out error:', error);
  } finally {
    Cookies.remove('user', { path: '/' });
    // Optionally, redirect or update UI state here or in the component calling logout
  }
};

export const getCurrentUser = (): User | null => {
  const userCookie = Cookies.get('user');
  if (userCookie) {
    try {
      return JSON.parse(userCookie);
    } catch (e) {
      console.error("Failed to parse user cookie", e);
      Cookies.remove('user', { path: '/' }); // Remove invalid cookie
      return null;
    }
  }
  return null;
};

export const isAuthenticated = (): boolean => {
  return !!Cookies.get('user');
};

'use server';

import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import { auth, db } from './firebase'; // Firebase client SDK instances
import {
  createUserWithEmailAndPassword,
  // signInWithEmailAndPassword, // No longer used here for login
  type UserCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, addDoc, deleteDoc, query, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { z } from 'zod';
import { suggestTimelineEntries, type SuggestTimelineEntriesInput, type SuggestTimelineEntriesOutput } from '@/ai/flows/suggest-timeline-entries';
import type { TimelineEntry } from './types';


// User type for cookie data
interface UserCookieData {
  uid: string;
  email: string;
  username: string;
}

// Server-side helper to get user from cookie
async function getCurrentUserFromCookie(): Promise<UserCookieData | null> {
  const cookieStore = cookies();
  const userCookie = cookieStore.get('user');
  if (userCookie?.value) {
    try {
      return JSON.parse(userCookie.value);
    } catch (e) {
      console.error("Failed to parse user cookie on server:", e);
      return null;
    }
  }
  return null;
}


// --- Authentication Actions ---

const RegisterUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3),
});

export async function registerUserServerAction(email_param: string, password_param: string, username_param: string): Promise<{ success: boolean; user?: UserCookieData; message?: string }> {
  const validation = RegisterUserSchema.safeParse({ email: email_param, password: password_param, username: username_param});
  if (!validation.success) {
    return { success: false, message: validation.error.errors.map(e => e.message).join(', ') };
  }
  const {email, password, username} = validation.data;

  try {
    // Using the 'auth' instance from firebase.ts for server-side operations with client SDK
    const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    if (user) {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        username: username,
        createdAt: Timestamp.now(),
      });
      // Note: This doesn't set the client-side cookie directly. That should happen after login.
      // Or, if you auto-login after registration, the login flow would handle cookie setting.
      return { success: true, user: { uid: user.uid, email: user.email!, username } };
    }
    return { success: false, message: 'User registration failed.' };
  } catch (error: any) {
    console.error('Firebase registration error:', error);
    return { success: false, message: error.message || 'An error occurred during registration.' };
  }
}

/*
// Login is now primarily handled client-side in login/page.tsx
// This server action is commented out as it's no longer the primary login path.
// If needed for other server-to-server auth flows, it could be adapted.

const LoginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginUserServerAction(email_param: string, password_param: string): Promise<{ success: boolean; user?: UserCookieData; message?: string }> {
  const validation = LoginUserSchema.safeParse({ email: email_param, password: password_param });
   if (!validation.success) {
    return { success: false, message: validation.error.errors.map(e => e.message).join(', ') };
  }
  const {email, password} = validation.data;

  try {
    // This would use the server-side 'auth' instance.
    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      let username = email;
      if (userDocSnap.exists()) {
        username = userDocSnap.data()?.username || email;
      }
      const userCookieData: UserCookieData = { uid: user.uid, email: user.email!, username };
      // This sets an HTTPOnly cookie, useful if server actions need to read it.
      // The client will also set its own JS-accessible cookie.
      cookies().set('user', JSON.stringify(userCookieData), { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });

      return { success: true, user: userCookieData };
    }
    return { success: false, message: 'User login failed.' };
  } catch (error: any) {
    console.error('Firebase login error (server action):', error);
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
}
*/

// --- Timeline Entry Actions ---

const createTimelineEntryFormSchema = z.object({
  description: z.string().min(1, "Description is required"),
  date: z.date(),
  docketNumber: z.string().optional(),
  client: z.string().min(1, "Client is required."),
  task: z.string().min(1, "Task is required."),
  timeSpent: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM).'),
});

export async function createTimelineEntryAction(entryData: Omit<TimelineEntry, 'id' | 'userId' | 'userName' | 'date'> & { date: Date }): Promise<{ success: boolean; message?: string; entry?: TimelineEntry }> {
  noStore();
  const cookieUser = await getCurrentUserFromCookie();

  console.log('[Action:createTimelineEntryAction] Firebase Auth SDK Current User (before op):', auth.currentUser?.uid || 'null');
  console.log('[Action:createTimelineEntryAction] Cookie User UID:', cookieUser?.uid || 'null');

  if (!auth.currentUser) {
    console.error("[Action:createTimelineEntryAction] CRITICAL: Firebase SDK (auth.currentUser) is null IN SERVER ACTION. Firestore rules relying on request.auth will likely fail IF rules are not evaluated based on client's token.");
  } else if (cookieUser && auth.currentUser.uid !== cookieUser.uid) {
    console.warn(`[Action:createTimelineEntryAction] MISMATCH in Server Action: Cookie UID (${cookieUser.uid}) vs Firebase Auth SDK UID (${auth.currentUser.uid}). Rules check client's Firebase Auth state.`);
  }

  if (!cookieUser) {
    return { success: false, message: "Authentication required (app cookie missing)." };
  }

  const validation = createTimelineEntryFormSchema.safeParse(entryData);
  if (!validation.success) {
    return { success: false, message: validation.error.errors.map(e => e.message).join(', ') };
  }
  const validatedData = validation.data;

  try {
    const entryWithUser: Omit<TimelineEntry, 'id'> = {
      ...validatedData,
      userId: cookieUser.uid,
      userName: cookieUser.username,
      date: Timestamp.fromDate(validatedData.date),
    };

    // Firestore rules will be evaluated based on the authenticated state of the *client*
    // that initiated this server action, if the gRPC call from client to server action
    // correctly forwards the client's Firebase ID token.
    const docRef = await addDoc(collection(db, `users/${cookieUser.uid}/timelineEntries`), entryWithUser);
    const newEntry: TimelineEntry = { ...entryWithUser, id: docRef.id, date: validatedData.date };

    return { success: true, entry: newEntry };
  } catch (error: any) {
    console.error("[Action:createTimelineEntryAction] Error creating timeline entry in Firestore:", error.message, error.code);
    // Common error codes: 'permission-denied'
    return { success: false, message: `Failed to create timeline entry: ${error.message}` };
  }
}

export async function deleteTimelineEntryAction(entryId: string): Promise<{ success: boolean; message?: string }> {
  noStore();
  const cookieUser = await getCurrentUserFromCookie();

  console.log('[Action:deleteTimelineEntryAction] Firebase Auth SDK Current User (before op):', auth.currentUser?.uid || 'null');
  console.log('[Action:deleteTimelineEntryAction] Cookie User UID:', cookieUser?.uid || 'null');

   if (!auth.currentUser) {
    console.error("[Action:deleteTimelineEntryAction] CRITICAL: Firebase SDK (auth.currentUser) is null IN SERVER ACTION.");
  } else if (cookieUser && auth.currentUser.uid !== cookieUser.uid) {
    console.warn(`[Action:deleteTimelineEntryAction] MISMATCH in Server Action: Cookie UID (${cookieUser.uid}) vs Firebase Auth SDK UID (${auth.currentUser.uid}).`);
  }

  if (!cookieUser) {
    return { success: false, message: "Authentication required (app cookie missing)." };
  }
  if (!entryId) {
    return { success: false, message: "Entry ID is required." };
  }

  try {
    await deleteDoc(doc(db, `users/${cookieUser.uid}/timelineEntries`, entryId));
    return { success: true };
  } catch (error: any) {
    console.error("[Action:deleteTimelineEntryAction] Error deleting timeline entry:", error.message, error.code);
    return { success: false, message: `Failed to delete timeline entry: ${error.message}` };
  }
}

export async function getTimelineEntriesAction(): Promise<TimelineEntry[]> {
  noStore();
  const cookieUser = await getCurrentUserFromCookie();

  console.log('[Action:getTimelineEntriesAction] Firebase Auth SDK Current User (before op):', auth.currentUser?.uid || 'null');
  console.log('[Action:getTimelineEntriesAction] Cookie User UID:', cookieUser?.uid || 'null');

  if (!auth.currentUser) {
    console.error("[Action:getTimelineEntriesAction] CRITICAL: Firebase SDK (auth.currentUser) is null IN SERVER ACTION. Firestore rules will likely fail, returning empty list.");
  } else if (cookieUser && auth.currentUser.uid !== cookieUser.uid) {
     console.warn(`[Action:getTimelineEntriesAction] MISMATCH in Server Action: Cookie UID (${cookieUser.uid}) vs Firebase Auth SDK UID (${auth.currentUser.uid}). Rules use client's Firebase Auth state.`);
  }

  if (!cookieUser) {
    return [];
  }

  try {
    const q = query(collection(db, `users/${cookieUser.uid}/timelineEntries`), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    const entries: TimelineEntry[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      entries.push({
        id: docSnap.id,
        ...data,
        date: (data.date as Timestamp).toDate(),
      } as TimelineEntry);
    });
    return entries;
  } catch (error: any) {
    console.error("[Action:getTimelineEntriesAction] Error fetching timeline entries:", error.message, error.code);
    return [];
  }
}

// --- AI Suggestion Action ---
export async function getAiSuggestionsAction(input: SuggestTimelineEntriesInput): Promise<SuggestTimelineEntriesOutput> {
  try {
    const suggestions = await suggestTimelineEntries(input);
    return suggestions;
  } catch (error: any) { // Explicitly type error
    console.error("Error getting AI suggestions:", error);
    // Provide a default/empty output on error
    return { suggestedDescriptions: [], suggestedDocketNumbers: [] };
  }
}
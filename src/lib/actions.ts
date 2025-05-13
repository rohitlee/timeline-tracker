
'use server';

import { cookies } from 'next/headers';
import { auth, db } from './firebase'; // Firebase client SDK instances
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  type UserCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, addDoc, deleteDoc, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
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
    const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    if (user) {
      // Store additional user info (username) in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        username: username,
        createdAt: Timestamp.now(),
      });
      return { success: true, user: { uid: user.uid, email: user.email!, username } };
    }
    return { success: false, message: 'User registration failed.' };
  } catch (error: any) {
    console.error('Firebase registration error:', error);
    return { success: false, message: error.message || 'An error occurred during registration.' };
  }
}

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
    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    if (user) {
      // Fetch username from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      let username = email; // Default to email if username not found
      if (userDocSnap.exists()) {
        username = userDocSnap.data()?.username || email;
      }
      return { success: true, user: { uid: user.uid, email: user.email!, username } };
    }
    return { success: false, message: 'User login failed.' };
  } catch (error: any) {
    console.error('Firebase login error:', error);
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
}


// --- Timeline Entry Actions ---

const createTimelineEntryFormSchema = z.object({
  description: z.string().min(1, "Description is required"),
  date: z.date(), // Expecting Date object directly
  docketNumber: z.string().optional(),
  client: z.string().min(1, "Client is required."),
  task: z.string().min(1, "Task is required."),
  timeSpent: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM).'),
});

export async function createTimelineEntryAction(entryData: Omit<TimelineEntry, 'id' | 'userId' | 'userName' | 'date'> & { date: Date }): Promise<{ success: boolean; message?: string; entry?: TimelineEntry }> {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return { success: false, message: "Authentication required." };
  }

  const validation = createTimelineEntryFormSchema.safeParse(entryData);
  if (!validation.success) {
    return { success: false, message: validation.error.errors.map(e => e.message).join(', ') };
  }
  
  const validatedData = validation.data;

  try {
    const entryWithUser: Omit<TimelineEntry, 'id'> = {
      ...validatedData,
      userId: currentUser.uid,
      userName: currentUser.username,
      date: Timestamp.fromDate(validatedData.date), // Convert JS Date to Firestore Timestamp
    };
    
    const docRef = await addDoc(collection(db, `users/${currentUser.uid}/timelineEntries`), entryWithUser);
    const newEntry: TimelineEntry = { ...entryWithUser, id: docRef.id, date: validatedData.date }; // Return with JS Date
    
    return { success: true, entry: newEntry };
  } catch (error: any) {
    console.error("Error creating timeline entry in Firestore:", error);
    return { success: false, message: error.message || "Failed to create timeline entry." };
  }
}

export async function deleteTimelineEntryAction(entryId: string): Promise<{ success: boolean; message?: string }> {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return { success: false, message: "Authentication required." };
  }

  if (!entryId) {
    return { success: false, message: "Entry ID is required." };
  }

  try {
    await deleteDoc(doc(db, `users/${currentUser.uid}/timelineEntries`, entryId));
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting timeline entry from Firestore:", error);
    return { success: false, message: error.message || "Failed to delete timeline entry." };
  }
}

export async function getTimelineEntriesAction(): Promise<TimelineEntry[]> {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return [];
  }

  try {
    const q = query(collection(db, `users/${currentUser.uid}/timelineEntries`), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    const entries: TimelineEntry[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      entries.push({
        id: docSnap.id,
        ...data,
        date: (data.date as Timestamp).toDate(), // Convert Firestore Timestamp to JS Date
      } as TimelineEntry);
    });
    return entries;
  } catch (error) {
    console.error("Error fetching timeline entries from Firestore:", error);
    return [];
  }
}


// --- AI Suggestion Action ---
export async function getAiSuggestionsAction(input: SuggestTimelineEntriesInput): Promise<SuggestTimelineEntriesOutput> {
  // This action remains largely the same, as it doesn't directly depend on user auth state here
  // but rather on the input provided (past entries).
  // Ensure `suggestTimelineEntries` flow itself doesn't have unintended auth dependencies.
  try {
    const suggestions = await suggestTimelineEntries(input);
    return suggestions;
  } catch (error) {
    console.error("Error getting AI suggestions:", error);
    return { suggestedDescriptions: [], suggestedDocketNumbers: [] };
  }
}

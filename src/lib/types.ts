
import type { Timestamp } from 'firebase/firestore';

export interface TimelineEntry {
  id: string;
  date: Date | Timestamp; // Can be JS Date in client, Firestore Timestamp in DB
  userId: string;
  client: string; 
  task: string;   
  userName: string;
  docketNumber?: string;
  description: string;
  timeSpent: string; 
}

export interface Client {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  name: string;
}

// For user data stored in cookie / auth context
export interface UserProfile {
  uid: string;
  email: string | null;
  username: string;
}

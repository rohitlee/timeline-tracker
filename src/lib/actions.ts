'use server';

import { suggestTimelineEntries, type SuggestTimelineEntriesInput, type SuggestTimelineEntriesOutput } from '@/ai/flows/suggest-timeline-entries';
import { getCurrentUser } from './auth';
import { z } from 'zod';
import { mockTimelineEntries } from '@/data/mockData'; 
import type { TimelineEntry } from './types';

// Schema for validating form data for creating a timeline entry
const createTimelineEntryFormSchema = z.object({
  description: z.string().min(1, "Description is required"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date string" }),
  docketNumber: z.string().optional(),
  client: z.string().min(1, "Client is required."),
  task: z.string().min(1, "Task is required."),
  timeSpent: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM). Example: 01:30 for 1 hour 30 mins.'),
});

export async function getAiSuggestionsAction(input: SuggestTimelineEntriesInput): Promise<SuggestTimelineEntriesOutput> {
  try {
    const suggestions = await suggestTimelineEntries(input);
    return suggestions;
  } catch (error) {
    console.error("Error getting AI suggestions:", error);
    // Optionally, rethrow or handle more gracefully
    // For now, returning empty arrays to match existing behavior on error.
    return { suggestedDescriptions: [], suggestedDocketNumbers: [] };
  }
}

export async function createTimelineEntryAction(formData: FormData): Promise<{ success: boolean; message?: string; entry?: TimelineEntry }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Authentication required." };
  }

  const rawData = {
    description: formData.get('description') as string,
    // The date from FormData will likely be a string (e.g., ISO string if from a date picker).
    // TimelineEntryForm's `date` field is a Date object, but when passed to onSaveEntry,
    // if it were to call this server action, it might stringify it.
    // For robustness, we assume it's a string here and parse it.
    date: formData.get('date') as string, 
    docketNumber: formData.get('docketNumber') as string | undefined,
    client: formData.get('client') as string,
    task: formData.get('task') as string,
    timeSpent: formData.get('timeSpent') as string,
  };

  const validation = createTimelineEntryFormSchema.safeParse(rawData);

  if (!validation.success) {
    return { success: false, message: validation.error.errors.map(e => e.message).join(', ') };
  }

  const newEntry: TimelineEntry = {
    id: Date.now().toString(), // Simple unique ID
    userId: user.userId,
    userName: user.username, // Use username from the authenticated user session
    description: validation.data.description,
    date: new Date(validation.data.date), // Convert string from form to Date object
    docketNumber: validation.data.docketNumber,
    client: validation.data.client,
    task: validation.data.task,
    timeSpent: validation.data.timeSpent,
  };

  mockTimelineEntries.push(newEntry); // Add to in-memory mock data

  return { success: true, entry: newEntry }; // Return the created entry
}

export async function deleteTimelineEntryAction(entryId: string): Promise<{ success: boolean; message?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Authentication required." };
  }

  const index = mockTimelineEntries.findIndex(entry => entry.id === entryId && entry.userId === user.userId);

  if (index === -1) {
    return { success: false, message: "Entry not found or you don't have permission to delete it." };
  }

  mockTimelineEntries.splice(index, 1);

  return { success: true };
}

export async function getTimelineEntriesAction(): Promise<TimelineEntry[]> {
  const user = await getCurrentUser();
  // Ensure mockTimelineEntries is filtered by the current user's ID.
  // Dates in mockTimelineEntries are Date objects. They will be serialized to strings
  // when sent to the client, so client needs to parse them back to Date objects.
  return user ? mockTimelineEntries.filter(entry => entry.userId === user.userId) : [];
}

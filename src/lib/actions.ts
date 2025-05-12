'use server';

import { suggestTimelineEntries, type SuggestTimelineEntriesInput, type SuggestTimelineEntriesOutput } from '@/ai/flows/suggest-timeline-entries';
import { getCurrentUser } from './auth';
import { z } from 'zod';
import { mockTimelineEntries } from '@/data/mockData'; // Assuming mockData is your data source for now
import { TimelineEntry } from './types'; // Assuming TimelineEntry type is defined

const timelineEntrySchema = z.object({
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"), // Or a more specific date validation
  docketNumber: z.string().optional(),
});

export async function getAiSuggestionsAction(input: SuggestTimelineEntriesInput): Promise<SuggestTimelineEntriesOutput> {
  try {
    const suggestions = await suggestTimelineEntries(input);
    return suggestions;
  } catch (error) {
    console.error("Error getting AI suggestions:", error);
    return { suggestedDescriptions: [], suggestedDocketNumbers: [] };
  }
}

// Placeholder actions for timeline entries - modify these to interact with your actual data source
// and enforce user ownership.

export async function createTimelineEntryAction(formData: FormData): Promise<{ success: boolean; message?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Authentication required." };
  }

  const description = formData.get('description') as string;
  const date = formData.get('date') as string;
  const docketNumber = formData.get('docketNumber') as string | undefined;

  const validation = timelineEntrySchema.safeParse({ description, date, docketNumber });

  if (!validation.success) {
    return { success: false, message: validation.error.errors.map(e => e.message).join(', ') };
  }

  const newEntry: TimelineEntry = {
    id: Date.now().toString(), // Simple unique ID for mock data
    userId: user.userId,
    description: validation.data.description,
    date: validation.data.date,
    docketNumber: validation.data.docketNumber,
  };

  mockTimelineEntries.push(newEntry); // Add to mock data

  return { success: true };
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
  return user ? mockTimelineEntries.filter(entry => entry.userId === user.userId) : [];
}

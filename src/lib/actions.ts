'use server';

import { suggestTimelineEntries, type SuggestTimelineEntriesInput, type SuggestTimelineEntriesOutput } from '@/ai/flows/suggest-timeline-entries';

export async function getAiSuggestionsAction(input: SuggestTimelineEntriesInput): Promise<SuggestTimelineEntriesOutput> {
  try {
    const suggestions = await suggestTimelineEntries(input);
    return suggestions;
  } catch (error) {
    console.error("Error getting AI suggestions:", error);
    return { suggestedDescriptions: [], suggestedDocketNumbers: [] };
  }
}

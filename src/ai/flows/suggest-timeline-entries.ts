// src/ai/flows/suggest-timeline-entries.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting timeline entries based on past entries.
 *
 * - suggestTimelineEntries - A function that suggests relevant descriptions and 'Our Docket #' entries based on past entries.
 * - SuggestTimelineEntriesInput - The input type for the suggestTimelineEntries function.
 * - SuggestTimelineEntriesOutput - The return type for the suggestTimelineEntries function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTimelineEntriesInputSchema = z.object({
  pastEntries: z.array(z.string()).describe('An array of past timeline entries.'),
  currentEntry: z.string().describe('The current timeline entry being created.'),
});
export type SuggestTimelineEntriesInput = z.infer<typeof SuggestTimelineEntriesInputSchema>;

const SuggestTimelineEntriesOutputSchema = z.object({
  suggestedDescriptions: z.array(z.string()).describe('An array of suggested descriptions based on past entries.'),
  suggestedDocketNumbers: z.array(z.string()).describe('An array of suggested docket numbers based on past entries.'),
});
export type SuggestTimelineEntriesOutput = z.infer<typeof SuggestTimelineEntriesOutputSchema>;

export async function suggestTimelineEntries(input: SuggestTimelineEntriesInput): Promise<SuggestTimelineEntriesOutput> {
  return suggestTimelineEntriesFlow(input);
}

const suggestTimelineEntriesPrompt = ai.definePrompt({
  name: 'suggestTimelineEntriesPrompt',
  input: {schema: SuggestTimelineEntriesInputSchema},
  output: {schema: SuggestTimelineEntriesOutputSchema},
  prompt: `You are a helpful assistant that suggests descriptions and docket numbers for timeline entries based on past entries.

  Past Entries:
  {{#each pastEntries}}
  - {{{this}}}
  {{/each}}

  Current Entry:
  {{{currentEntry}}}

  Based on the past entries and the current entry, suggest relevant descriptions and docket numbers.
  Return the suggestions as a JSON object with the following format:
  {
    "suggestedDescriptions": ["suggestion1", "suggestion2"],
    "suggestedDocketNumbers": ["docket1", "docket2"]
  }
  `,
});

const suggestTimelineEntriesFlow = ai.defineFlow(
  {
    name: 'suggestTimelineEntriesFlow',
    inputSchema: SuggestTimelineEntriesInputSchema,
    outputSchema: SuggestTimelineEntriesOutputSchema,
  },
  async input => {
    const {output} = await suggestTimelineEntriesPrompt(input);
    return output!;
  }
);

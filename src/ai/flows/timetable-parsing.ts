'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { ParseTimetableOutput } from '@/lib/types';
import { ParseTimetableOutputSchema } from '@/lib/types';

const ParseTimetableInputSchema = z.object({
    fileDataUri: z
        .string()
        .describe(
            "The timetable file as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        ),
});

export type ParseTimetableInput = z.infer<typeof ParseTimetableInputSchema>;

export async function parseTimetable(input: ParseTimetableInput): Promise<ParseTimetableOutput> {
    return parseTimetableFlow(input);
}

const prompt = ai.definePrompt({
    name: 'parseTimetablePrompt',
    input: { schema: ParseTimetableInputSchema },
    output: { schema: ParseTimetableOutputSchema },
    prompt: `You are a timetable parsing expert. Your goal is to extract the schedule information from the provided document into a structured JSON format.

  Analyze the document and extract:
  1. A list of all unique SUBJECT NAMES in a top-level "subjects" array (strings).
  2. A "schedule" object containing a "subjects" array where each subject has its name and a list of classes.
  
  Each class must have: day, start_time, end_time, and location.
  Normalize days to 3-letter codes (MON, TUE, WED, THU, FRI, SAT, SUN).
  Normalize times to 24-hour HH:MM format.

  Document: {{media url=fileDataUri}}`,
});


const parseTimetableFlow = ai.defineFlow(
    {
        name: 'parseTimetableFlow',
        inputSchema: ParseTimetableInputSchema,
        outputSchema: ParseTimetableOutputSchema,
    },
    async input => {
        const { output } = await prompt(input);
        if (!output) throw new Error("Genkit returned null output");
        return output;
    }
);

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

  Analyze the provided document and extract each class into an object with the following fields: day, startTime, endTime, subject, and location.

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

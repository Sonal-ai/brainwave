'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input Schema: Base64 image + optional hint
const TimetableAnalysisInputSchema = z.object({
    fileDataUri: z.string(),
});

// Output Schema: Matching the expected format for the frontend/DB
const TimetableAnalysisOutputSchema = z.object({
    subjects: z.array(z.string()).describe("List of all unique subjects found in the timetable"),
    schedule: z.object({
        subjects: z.array(z.object({
            name: z.string(),
            classes: z.array(z.object({
                day: z.string(),
                start_time: z.string(),
                end_time: z.string(),
                location: z.string().optional()
            }))
        }))
    })
});

export type TimetableAnalysisInput = z.infer<typeof TimetableAnalysisInputSchema>;
export type TimetableAnalysisOutput = z.infer<typeof TimetableAnalysisOutputSchema>;

export async function analyzeTimetable(input: TimetableAnalysisInput): Promise<TimetableAnalysisOutput> {
    return analyzeTimetableFlow(input);
}

const prompt = ai.definePrompt({
    name: 'timetableAnalysisPrompt',
    input: { schema: TimetableAnalysisInputSchema },
    output: { schema: TimetableAnalysisOutputSchema },
    prompt: `Analyze this image of a college timetable.
    
    Extract:
    1. A list of all unique SUBJECT NAMES.
    2. A structured schedule grouping classes by subject.
    
    For each class, normalize the day to specific 3-letter codes (MON, TUE, WED, THU, FRI, SAT, SUN).
    Normalize times to 24-hour HH:MM format (e.g., 14:00).
    
    Return ONLY valid JSON matching the schema.
    
    Image: {{media url=fileDataUri}}`,
});

const analyzeTimetableFlow = ai.defineFlow(
    {
        name: 'timetableAnalysisFlow',
        inputSchema: TimetableAnalysisInputSchema,
        outputSchema: TimetableAnalysisOutputSchema,
    },
    async input => {
        const { output } = await prompt(input);
        if (!output) throw new Error("Genkit returned null output");
        return output;
    }
);

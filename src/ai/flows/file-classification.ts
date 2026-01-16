'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ClassifyFileInputSchema = z.object({
    fileDataUri: z.string(),
    existingSubjects: z.array(z.string()).describe("List of existing user subjects to choose from"),
});

const ClassifyFileOutputSchema = z.object({
    subject: z.string().describe("The best matching subject from the list, or a new 1-2 word topic if none match."),
    confidence: z.number().optional()
});

export type ClassifyFileInput = z.infer<typeof ClassifyFileInputSchema>;
export type ClassifyFileOutput = z.infer<typeof ClassifyFileOutputSchema>;

export async function classifyFile(input: ClassifyFileInput): Promise<ClassifyFileOutput> {
    return classifyFileFlow(input);
}

const prompt = ai.definePrompt({
    name: 'classifyFilePrompt',
    input: { schema: ClassifyFileInputSchema },
    output: { schema: ClassifyFileOutputSchema },
    prompt: `You are an academic file organizer. Analyze the provided document and categorize it into ONE of the following subjects: {{existingSubjects}}.
    
    If the document strongly matches one of the existing subjects, return that subject name.
    If it does NOT match any existing subject, suggest a concise new subject name (1-3 words) that describes the content (e.g., "History", "Physics Lab", "Calculus").
    
    Document: {{media url=fileDataUri}}`,
});

const classifyFileFlow = ai.defineFlow(
    {
        name: 'classifyFileFlow',
        inputSchema: ClassifyFileInputSchema,
        outputSchema: ClassifyFileOutputSchema,
    },
    async input => {
        const { output } = await prompt(input);
        if (!output) throw new Error("Genkit returned null output");
        return output;
    }
);

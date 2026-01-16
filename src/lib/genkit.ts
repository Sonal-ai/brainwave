
import { genkit, z } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/googleai';

// Initialize Genkit with Google AI plugin
const ai = genkit({
    plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
    model: 'gemini-1.5-flash-001', // Explicit version
});

// Define Schema for Timetable
export const TimetableSchema = z.object({
    subjects: z.array(z.object({
        name: z.string(),
        classes: z.array(z.object({
            day: z.string(),
            start_time: z.string(),
            end_time: z.string(),
            location: z.string().optional()
        }))
    }))
});

// Define the Flow
export const parseTimetableFlow = ai.defineFlow(
    {
        name: 'parseTimetable',
        inputSchema: z.object({
            imageUri: z.string().describe('Base64 Data URI of the timetable image'),
        }),
        outputSchema: TimetableSchema,
    },
    async (input) => {
        const { imageUri } = input;

        const result = await ai.generate({
            model: 'gemini-1.5-flash-001',
            prompt: [
                { text: "Analyze this timetable image and extract the schedule into the specified JSON structure. Be accurate with times and days." },
                { media: { url: imageUri } }
            ],
            output: { format: 'json', schema: TimetableSchema }
        });

        if (!result.output) {
            throw new Error("Failed to generate timetable structure");
        }

        return result.output;
    }
);

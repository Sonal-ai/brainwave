
import { z } from 'genkit';

export const ParseTimetableOutputSchema = z.object({
    subjects: z.array(z.object({
        name: z.string(),
        classes: z.array(z.object({
            day: z.string(),
            start_time: z.string(),
            end_time: z.string(),
            location: z.string().optional(),
            subject: z.string().optional()
        }))
    }))
});

export type ParseTimetableOutput = z.infer<typeof ParseTimetableOutputSchema>;

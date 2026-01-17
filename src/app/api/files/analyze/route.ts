import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { parseTimetable } from '@/ai/flows/timetable-parsing';
import { STATIC_SUBJECTS } from '@/lib/constants';
import fs from 'fs';

export async function POST(req: Request) {
    try {
        const { username, fileId } = await req.json();

        // 1. Get File Record
        const db = getDb();
        const userIndex = db.users.findIndex(u => u.username === username);
        if (userIndex === -1) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

        const user = db.users[userIndex];
        const fileIndex = user.files.findIndex(f => f.id === fileId);

        if (fileIndex === -1) return NextResponse.json({ success: false, message: "File not found" }, { status: 404 });
        const fileRecord = user.files[fileIndex];

        // 2. Resolve Local Path
        const relativePath = fileRecord.mediaId?.replace('/uploads/', '') || "";
        const localPath = join(process.cwd(), 'public', 'uploads', relativePath);

        if (!fs.existsSync(localPath)) {
            return NextResponse.json({ success: false, message: "Physical file missing" }, { status: 404 });
        }

        // 3. Prepare Image for Gemini (Base64 Data URI)
        const buffer = await readFile(localPath);
        let ext = (localPath.split('.').pop() || 'jpeg').toLowerCase();
        if (ext === 'jpg') ext = 'jpeg';
        const mimeType = ext === 'pdf' ? 'application/pdf' : `image/${ext}`;
        const base64Data = `data:${mimeType};base64,${buffer.toString('base64')}`;

        // 4. Call Genkit Flow (Gemini Direct)
        console.log(`Analyzing timetable with Gemini: ${fileRecord.name}`);

        try {
            const result = await parseTimetable({ fileDataUri: base64Data });

            if (result && result.subjects) {
                // Update User Timetable
                user.timetable = result;

                const extractedSubjects = result.subjects.map((s: any) => s.name);

                console.log("Applying Strict Replace for subjects:", extractedSubjects);
                // Strict Replace Logic (User Mode):
                // We strictly replace the subject list with the new timetable's subjects.
                user.subjects = extractedSubjects;

                // Update File Status
                user.files[fileIndex].subject = 'Timetable (Analyzed)';
                user.files[fileIndex].parsed = true;

                // Save to DB
                db.users[userIndex] = user;
                saveDb(db);

                return NextResponse.json({
                    success: true,
                    subjects: extractedSubjects,
                    schedule: result
                });
            } else {
                throw new Error("Empty result from Genkit");
            }
        } catch (genkitError: any) {
            console.error("Genkit Error:", genkitError);
            return NextResponse.json({
                success: false,
                message: `AI Analysis Failed: ${genkitError.message || 'Unknown error'}. Did you set GOOGLE_API_KEY?`
            }, { status: 500 });
        }

    } catch (e: any) {
        console.error("Analysis Error:", e);
        return NextResponse.json({
            success: false,
            message: e.message || "Internal Server Error"
        }, { status: 500 });
    }
}

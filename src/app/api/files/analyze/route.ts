import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { parseTimetable } from '@/ai/flows/timetable-parsing';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, fileId } = body;

        if (!username || !fileId) {
            return NextResponse.json({ message: 'Missing params' }, { status: 400 });
        }

        const db = getDb();
        const userIndex = db.users.findIndex(u => u.username === username);
        if (userIndex === -1) return NextResponse.json({ message: 'User not found' }, { status: 404 });

        const user = db.users[userIndex];
        const fileIndex = user.files.findIndex(f => f.id === fileId);

        if (fileIndex === -1) return NextResponse.json({ message: 'File not found' }, { status: 404 });

        const file = user.files[fileIndex];

        if (!file.mediaId) {
            return NextResponse.json({ message: 'No file data found please re-upload.' }, { status: 400 });
        }

        // 1. Read File from Disk
        // mediaId is now "/uploads/xyz.jpg" -> we map to filesystem
        const filePath = join(process.cwd(), 'public', file.mediaId);

        let base64Data = '';
        try {
            const buffer = await readFile(filePath);
            let ext = (filePath.split('.').pop() || 'jpeg').toLowerCase();
            if (ext === 'jpg') ext = 'jpeg';
            const mimeType = ext === 'pdf' ? 'application/pdf' : `image/${ext}`;
            base64Data = `data:${mimeType};base64,${buffer.toString('base64')}`;
        } catch (e) {
            console.error("File Read Error:", e);
            return NextResponse.json({ message: 'File not found on server disk.' }, { status: 404 });
        }

        // 2. Run Genkit Flow
        console.log("Starting Genkit Analysis...");
        try {
            const result = await parseTimetable({ fileDataUri: base64Data }); // Call the flow directly

            if (result && result.subjects) {
                // Update User
                user.timetable = result;

                const extractedSubjects = result.subjects.map((s: any) => s.name);
                user.subjects = Array.from(new Set([...(user.subjects || []), ...extractedSubjects]));

                // Update File Status
                user.files[fileIndex].subject = 'Timetable (Analyzed)';
                user.files[fileIndex].parsed = true;

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
                message: `AI Analysis Failed: ${genkitError.message || 'Unknown error'}. Did you set GEMINI_API_KEY?`
            }, { status: 500 });
        }

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Analysis failed' }, { status: 500 });
    }
}

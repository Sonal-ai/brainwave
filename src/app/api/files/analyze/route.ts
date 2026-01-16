import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { parseTimetable } from '@/ai/flows/timetable-parsing';
import { STATIC_SUBJECTS } from '@/lib/constants';

export async function POST(req: Request) {
    try {
        const { username, fileId } = await req.json();

        // 1. Get File Record
        const db = getDb();
        const user = db.users.find(u => u.username === username);
        if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

        const fileRecord = user.files.find(f => f.id === fileId);
        if (!fileRecord) return NextResponse.json({ success: false, message: "File not found" }, { status: 404 });

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
        const result = await analyzeTimetable({
            fileDataUri: base64Data
        });

        // 5. Update DB
        if (result.subjects) {
            user.subjects = [...new Set([...user.subjects, ...result.subjects])];
        }

        // 2. Run Genkit Flow
        console.log("Starting Genkit Analysis...");
        try {
            const result = await parseTimetable({ fileDataUri: base64Data }); // Call the flow directly

            if (result && result.subjects) {
                // Update User
                user.timetable = result;

                const extractedSubjects = result.subjects.map((s: any) => s.name);

                // Logic to REPLACE the static subjects if they are the only ones present
                const currentSubjects = user.subjects || [];
                const isOnlyStatic = currentSubjects.length === STATIC_SUBJECTS.length &&
                    currentSubjects.every(val => STATIC_SUBJECTS.includes(val));

                if (isOnlyStatic) {
                    user.subjects = extractedSubjects;
                } else {
                    user.subjects = Array.from(new Set([...currentSubjects, ...extractedSubjects]));
                }

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

        fileRecord.parsed = true;

        // Save
        const userIdx = db.users.findIndex(u => u.username === username);
        db.users[userIdx] = user;
        saveDb(db);

        return NextResponse.json({
            success: true,
            subjects: result.subjects,
            schedule: result.schedule
        });

    } catch (e: any) {
        console.error("Analysis Error:", e);
        return NextResponse.json({
            success: false,
            message: e.message || "Internal Server Error"
        }, { status: 500 });
    }
}

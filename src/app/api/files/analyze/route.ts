import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { analyzeTimetable } from '@/ai/flows/timetable-analysis';
import fs from 'fs';

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
        if (result.schedule) {
            user.timetable = result.schedule;
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

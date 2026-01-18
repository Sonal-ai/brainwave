import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { parseTimetable } from '@/ai/flows/timetable-parsing';
import { STATIC_SUBJECTS } from '@/lib/constants';
import fs from 'fs';

export async function POST(req: Request) {
    try {
        const { username, fileId, mode = 'auto' } = await req.json();

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

        // 3. Prepare Image (Base64 for Gemini / File for OnDemand)
        const buffer = await readFile(localPath);
        let ext = (localPath.split('.').pop() || 'jpeg').toLowerCase();
        if (ext === 'jpg') ext = 'jpeg';
        const mimeType = ext === 'pdf' ? 'application/pdf' : `image/${ext}`;

        // 4. Analysis Logic
        let result: any = null;
        let agentUsed = 'none';

        // --- Try On-Demand if mode is 'auto' or 'ondemand' ---
        if (mode === 'auto' || mode === 'ondemand') {
            try {
                console.log(`[Analysis] Attempting On-Demand... (Mode: ${mode})`);
                const fileName = fileRecord.name || `file_${Date.now()}.${ext}`;
                const fileObj = new File([buffer], fileName, { type: mimeType });

                const onDemandPromise = (async () => {
                    const { uploadMedia, analyzeTimetable } = await import('@/lib/ondemand');
                    const mediaId = await uploadMedia(fileObj);
                    if (!mediaId) throw new Error("On-Demand upload failed");
                    return await analyzeTimetable(mediaId);
                })();

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("On-Demand Timeout")), 12000)
                );

                result = await Promise.race([onDemandPromise, timeoutPromise]);

                if (result && result.subjects && result.schedule) {
                    agentUsed = 'ondemand';
                    console.log("✅ Analysis successful via On-Demand");
                } else {
                    throw new Error("Invalid output format");
                }
            } catch (err: any) {
                console.warn("On-Demand agent failed:", err.message);
                if (mode === 'ondemand') {
                    return NextResponse.json({ success: false, message: `On-Demand failed: ${err.message}` }, { status: 500 });
                }
            }
        }

        // --- Try Gemini if mode is 'gemini' or (mode is 'auto' and on-demand failed) ---
        if (!result && (mode === 'auto' || mode === 'gemini')) {
            try {
                console.log(`[Analysis] Attempting Gemini... (Mode: ${mode})`);
                const base64Data = `data:${mimeType};base64,${buffer.toString('base64')}`;
                result = await parseTimetable({ fileDataUri: base64Data });
                agentUsed = 'gemini';
                console.log("✅ Analysis successful via Gemini (Fallback)");
            } catch (err: any) {
                console.error("Gemini agent failed:", err);
                return NextResponse.json({ success: false, message: `Gemini failed: ${err.message}` }, { status: 500 });
            }
        }

        if (result && (result.subjects || result.schedule)) {
            // Update User Timetable
            user.timetable = result;

            // Use the subjects array from result (both agents now return it)
            const extractedSubjects = result.subjects || [];

            console.log(`Applying extracted subjects via ${agentUsed}:`, extractedSubjects);
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
                schedule: result,
                agentUsed: agentUsed
            });
        }

        return NextResponse.json({ success: false, message: "Empty result from AI agents" }, { status: 500 });

    } catch (e: any) {
        console.error("Analysis Error:", e);
        return NextResponse.json({
            success: false,
            message: e.message || "Internal Server Error"
        }, { status: 500 });
    }
}

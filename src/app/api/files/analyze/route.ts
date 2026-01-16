import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { analyzeTimetable } from '@/lib/ondemand';

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
            return NextResponse.json({ message: 'No Media ID found for this file. Please re-upload.' }, { status: 400 });
        }

        // Trigger Analysis
        const timetableData = await analyzeTimetable(file.mediaId);

        if (timetableData && timetableData.subjects) {
            // Update User
            user.timetable = timetableData;

            const extractedSubjects = timetableData.subjects.map((s: any) => s.name);
            user.subjects = Array.from(new Set([...(user.subjects || []), ...extractedSubjects]));

            // Update File Status
            user.files[fileIndex].subject = 'Timetable (Analyzed)';
            user.files[fileIndex].parsed = true;

            db.users[userIndex] = user;
            saveDb(db);

            return NextResponse.json({
                success: true,
                subjects: extractedSubjects,
                schedule: timetableData
            });
        } else {
            return NextResponse.json({
                success: false,
                message: 'AI returned empty structure. Try a clearer image.'
            });
        }

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Analysis failed' }, { status: 500 });
    }
}

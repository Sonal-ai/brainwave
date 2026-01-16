import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { classifyFile } from '@/ai/flows/file-classification';

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
        if (!file.mediaId) return NextResponse.json({ message: 'No file content' }, { status: 400 });

        // 1. Read File
        const filePath = join(process.cwd(), 'public', file.mediaId);
        let base64Data = '';
        try {
            const buffer = await readFile(filePath);
            let ext = (filePath.split('.').pop() || 'jpeg').toLowerCase();
            if (ext === 'jpg') ext = 'jpeg';

            // Allow PDF
            const mimeType = ext === 'pdf' ? 'application/pdf' : `image/${ext}`;

            // Log for debug
            console.log(`Classifying file properly: ${filePath} as ${mimeType}`);

            base64Data = `data:${mimeType};base64,${buffer.toString('base64')}`;
        } catch (e) {
            return NextResponse.json({ message: 'File read error' }, { status: 500 });
        }

        // 2. Classify
        try {
            const result = await classifyFile({
                fileDataUri: base64Data,
                existingSubjects: user.subjects || []
            });

            if (result && result.subject) {
                // Update File
                user.files[fileIndex].subject = result.subject;

                // Add to subjects list if new
                if (!user.subjects.includes(result.subject)) {
                    user.subjects.push(result.subject);
                }

                db.users[userIndex] = user;
                saveDb(db);

                return NextResponse.json({ success: true, subject: result.subject });
            }

            throw new Error("No classification result");

        } catch (err: any) {
            console.error("Classification Error:", err);
            return NextResponse.json({
                success: false,
                message: err.message || 'Classification failed'
            }, { status: 500 });
        }

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Internal error' }, { status: 500 });
    }
}

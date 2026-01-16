import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const username = formData.get('username') as string;
        const type = formData.get('type') as string;

        if (!file || !username) {
            return NextResponse.json({ message: 'Missing file or user' }, { status: 400 });
        }

        // Save file locally (to bypass OnDemand upload issues)
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        const uniqueName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        const filePath = join(uploadDir, uniqueName);
        await writeFile(filePath, buffer);

        // Save DB Record
        const db = getDb();
        const userIndex = db.users.findIndex(u => u.username === username);
        if (userIndex === -1) return NextResponse.json({ message: 'User not found' }, { status: 404 });

        const user = db.users[userIndex];
        // Only store necessary metadata + path (simulating mediaId)
        const fileData: import('@/lib/db').FileRecord = {
            id: uuidv4(),
            name: file.name,
            size: file.size,
            type: type || 'resource',
            subject: 'Pending Analysis',
            uploadDate: new Date().toISOString(),
            mediaId: `/uploads/${uniqueName}`, // Local Path
            parsed: false
        };

        user.files.push(fileData);
        db.users[userIndex] = user;
        saveDb(db);

        return NextResponse.json({
            message: 'File uploaded successfully',
            file: fileData
        });

    } catch (error) {
        console.error("Upload Error:", error);
        return NextResponse.json({ message: 'Server upload failed' }, { status: 500 });
    }
}

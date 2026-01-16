import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, subject } = body;

        if (!username || !subject) {
            return NextResponse.json({ message: 'Missing params' }, { status: 400 });
        }

        const db = getDb();
        const userIndex = db.users.findIndex(u => u.username === username);

        if (userIndex === -1) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        const user = db.users[userIndex];

        // Remove subject from list
        user.subjects = user.subjects.filter(s => s !== subject);

        // Universal Delete: Remove files associated with this subject
        user.files = user.files.filter(f => f.subject !== subject);

        db.users[userIndex] = user;
        saveDb(db);

        return NextResponse.json({ success: true, subjects: user.subjects });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Internal error' }, { status: 500 });
    }
}

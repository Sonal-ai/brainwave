import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username } = body;

        if (!username) {
            return NextResponse.json({ message: 'Missing username' }, { status: 400 });
        }

        const db = getDb();
        const userIndex = db.users.findIndex(u => u.username === username);

        if (userIndex === -1) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        const user = db.users[userIndex];

        // Clear all subjects
        user.subjects = [];

        // Files remain but are effectively uncategorized (as their subject tags won't match any folder)

        db.users[userIndex] = user;
        saveDb(db);

        return NextResponse.json({ success: true, subjects: [] });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Internal error' }, { status: 500 });
    }
}

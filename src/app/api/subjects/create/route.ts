import { NextResponse } from 'next/server';
import { findUser, getDb, saveDb } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, subject } = body;

        if (!username || !subject) {
            return NextResponse.json({ message: 'Missing username or subject' }, { status: 400 });
        }

        const db = getDb();
        const userIndex = db.users.findIndex(u => u.username === username);

        if (userIndex === -1) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        const user = db.users[userIndex];

        if (!user.subjects.includes(subject)) {
            user.subjects.push(subject);
            db.users[userIndex] = user;
            saveDb(db);
        }

        return NextResponse.json({ message: 'Subject created', subjects: user.subjects });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

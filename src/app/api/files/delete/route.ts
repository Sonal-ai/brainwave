import { NextResponse } from 'next/server';
import { findUser, getDb, saveDb } from '@/lib/db';

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const username = searchParams.get('username');

        if (!id || !username) {
            return NextResponse.json({ message: 'Missing file ID or username' }, { status: 400 });
        }

        const db = getDb();
        const userIndex = db.users.findIndex(u => u.username === username);

        if (userIndex === -1) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        const user = db.users[userIndex];
        const initialCount = user.files.length;
        user.files = user.files.filter(f => f.id !== id);

        if (user.files.length === initialCount) {
            return NextResponse.json({ message: 'File not found' }, { status: 404 });
        }

        db.users[userIndex] = user;
        saveDb(db);

        return NextResponse.json({ message: 'File deleted successfully', files: user.files });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

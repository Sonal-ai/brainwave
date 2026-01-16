import { NextResponse } from 'next/server';
import { findUser } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
        return NextResponse.json({ message: 'Missing username' }, { status: 400 });
    }

    const user = await findUser(username);

    if (!user) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
        files: user.files,
        subjects: user.subjects
    });
}

import { NextResponse } from 'next/server';
import { findUser } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        const user = await findUser(username);

        if (!user || user.password !== password) {
            return NextResponse.json(
                { message: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // In a real app, we would set a secure HttpOnly cookie here.
        // For this demo, we'll return the user info and handle session on client/localstorage for simplicity.
        const { password: _, ...userWithoutPass } = user;

        return NextResponse.json({ user: userWithoutPass });
    } catch (error) {
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

import { NextResponse } from 'next/server';
import { findUser, createUser } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, name } = body;

        if (!email) {
            return NextResponse.json({ message: 'Missing email' }, { status: 400 });
        }

        let user = await findUser(email);

        if (!user) {
            console.log(`Creating new user for ${email}`);
            user = await createUser({
                id: crypto.randomUUID(),
                username: email, // Treating email as username for legacy compatibility
                password: '', // Not used for Auth0 users
                name: name || email.split('@')[0],
                subjects: [],
                files: []
            });
        }

        return NextResponse.json({ user });
    } catch (error) {
        console.error('Sync error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

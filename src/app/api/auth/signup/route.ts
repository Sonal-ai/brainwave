import { NextResponse } from 'next/server';
import { createUser, findUser } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password, name } = body;

        const existingUser = await findUser(username);

        if (existingUser) {
            return NextResponse.json(
                { message: 'Username already exists' },
                { status: 409 }
            );
        }

        const newUser = await createUser({
            id: uuidv4(),
            username,
            password,
            name,
            subjects: [],
            files: []
        });

        // Strip password
        const { password: _, ...userWithoutPass } = newUser;

        return NextResponse.json({ user: userWithoutPass });
    } catch (error) {
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

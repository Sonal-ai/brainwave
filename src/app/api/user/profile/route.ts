import { NextRequest, NextResponse } from 'next/server';
import { findUser } from '@/lib/db';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    try {
        const user = await findUser(email);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            subjects: user.subjects,
            name: user.name
        });
    } catch (error) {
        console.error("Profile API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { findUser, getDb, saveDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const username = formData.get('username') as string;
        const type = formData.get('type') as string; // 'timetable' or 'resource'
        const subject = formData.get('subject') as string;

        if (!file || !username) {
            return NextResponse.json({ message: 'Missing file or user' }, { status: 400 });
        }

        const db = getDb();
        const userIndex = db.users.findIndex(u => u.username === username);

        if (userIndex === -1) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        const user = db.users[userIndex];

        // Mock File Saving (In real app, save to disk/S3)
        // Here we just store metadata
        const fileData = {
            id: uuidv4(),
            name: file.name,
            size: file.size,
            type: type,
            subject: subject || 'General',
            uploadDate: new Date().toISOString(),
        };

        // LOGIC: File Intelligence & Parsing
        const fileName = file.name.toLowerCase();
        let agentResponse: any = null;

        // 1. Timetable: Just Upload (Analysis is Step 2)
        if (type === 'timetable') {
            const { uploadMedia } = await import('@/lib/ondemand');

            console.log("Starting OnDemand Upload...");
            const mediaId = await uploadMedia(file);

            if (mediaId) {
                fileData.mediaId = mediaId; // Save ID for later analysis
                fileData.subject = 'Pending Analysis';
                fileData.parsed = false;
            } else {
                console.warn("OnDemand Upload Failed.");
                fileData.subject = 'Upload Failed';
            }
        }
        // 2. Resource Classification (OnDemand / Mock)
        else if (type === 'resource' || !type) {
            const { processFileWithAgent } = await import('@/lib/ondemand');
            // Mock agent for classification
            agentResponse = await processFileWithAgent(file, process.env.ONDEMAND_DOC_AGENT_ID || 'mock-doc', {
                currentSubjects: user.subjects
            });

            if (agentResponse.mode === 'classification' && agentResponse.classified_subject) {
                fileData.subject = agentResponse.classified_subject;
            } else {
                // Simple keyword fallback
                if (fileName.includes('math')) fileData.subject = 'Mathematics';
                else fileData.subject = 'General';
            }
        }

        // Fallback for agentResponse if still null (e.g. failed timetable parse)
        if (!agentResponse) {
            agentResponse = { mode: 'none', subjects_detected: [], confidence: 0 };
        }

        user.files.push(fileData);
        db.users[userIndex] = user;
        saveDb(db);

        return NextResponse.json({
            message: 'File processed successfully',
            file: fileData,
            updatedSubjects: user.subjects,
            agentResponse: agentResponse,
            schedule: user.timetable,
            inferredSubject: fileData.subject
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

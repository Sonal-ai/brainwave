import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const API_KEY = process.env.ONDEMAND_API_KEY || "";
const BASE_URL = "https://api.on-demand.io/chat/v1";

const AGENT_IDS = ["agent-1712327325", "agent-1713962163"];
const ENDPOINT_ID = "predefined-xai-grok4.1-fast";
const REASONING_MODE = "grok-4-fast";
const FULFILLMENT_PROMPT = `You are a quiz master. You will be given a subject, number of questions, and difficulty, you are to quiz the user one question by one and give them their final score. After each wrong answer , you must correct them and continue asking. If given any other type of prompt, apologise and have them try again. You can find the syllabus of the various subjects at dtu.ac.in`;

async function createChatSession(externalUserId: string) {
    const url = `${BASE_URL}/sessions`;
    const contextMetadata = [
        { key: "userId", value: "1" },
        { key: "name", value: "John" },
    ];

    const body = {
        agentIds: AGENT_IDS,
        externalUserId: externalUserId,
        contextMetadata: contextMetadata,
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (response.status === 201) {
            const data: any = await response.json();
            return data.data.id;
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
}

export async function POST(req: NextRequest) {
    if (!API_KEY) {
        return NextResponse.json({ error: "API Key not configured" }, { status: 500 });
    }

    try {
        const { subject, difficulty, count, query, sessionId, externalUserId } = await req.json();

        let currentSessionId = sessionId;
        let currentExternalUserId = externalUserId || uuidv4();

        if (!currentSessionId) {
            currentSessionId = await createChatSession(currentExternalUserId);
            if (!currentSessionId) {
                return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
            }
        }

        // Construct the query if it's the start
        const userQuery = query || `Start a quiz for Subject: ${subject}, Difficulty: ${difficulty}, Number of Questions: ${count}.`;

        const url = `${BASE_URL}/sessions/${currentSessionId}/query`;
        const body = {
            endpointId: ENDPOINT_ID,
            query: userQuery,
            agentIds: AGENT_IDS,
            responseMode: "sync", // Using sync for simplified implementation of interactive quiz
            reasoningMode: REASONING_MODE,
            modelConfigs: {
                fulfillmentPrompt: FULFILLMENT_PROMPT,
                temperature: 0.3,
                topP: 1,
                maxTokens: 0,
                presencePenalty: 0,
                frequencyPenalty: 0,
            },
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data: any = await response.json();

        if (response.status === 200 && data.data) {
            return NextResponse.json({
                answer: data.data.answer,
                sessionId: currentSessionId,
                externalUserId: currentExternalUserId
            });
        } else {
            return NextResponse.json({ error: "Failed to get quiz response" }, { status: 500 });
        }

    } catch (error) {
        console.error("Quiz API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

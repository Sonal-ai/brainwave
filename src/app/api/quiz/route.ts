import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const API_KEY = process.env.ONDEMAND_API_KEY || "";
const BASE_URL = "https://api.on-demand.io/chat/v1";

const AGENT_IDS = ["agent-1712327325", "agent-1713962163"];
const ENDPOINT_ID = "predefined-xai-grok4.1-fast";
const REASONING_MODE = "grok-4-fast";
const FULFILLMENT_PROMPT = `You are a quiz master. You will be given a subject, number of questions, and difficulty, you are to quiz the user one question by one and give them their final score. After each wrong answer , you must correct them and continue asking. If given any other type of prompt, apologise and have them try again. You can find the syllabus of the various subjects at dtu.ac.in`;

const TEMPERATURE = 0.3;
const TOP_P = 1;
const MAX_TOKENS = 0;
const PRESENCE_PENALTY = 0;
const FREQUENCY_PENALTY = 0;
const RESPONSE_MODE = "stream"; // Consistent with GPA high-fidelity port

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

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'apikey': API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (response.status === 201) {
        const sessionRespData: any = await response.json();
        return sessionRespData.data.id;
    }
    return "";
}

async function submitQuery(sessionId: string, query: string, contextMetadata: any[]) {
    const url = `${BASE_URL}/sessions/${sessionId}/query`;
    const body = {
        endpointId: ENDPOINT_ID,
        query: query,
        agentIds: AGENT_IDS,
        responseMode: RESPONSE_MODE,
        reasoningMode: REASONING_MODE,
        modelConfigs: {
            fulfillmentPrompt: FULFILLMENT_PROMPT,
            stopSequences: [],
            temperature: TEMPERATURE,
            topP: TOP_P,
            maxTokens: MAX_TOKENS,
            presencePenalty: PRESENCE_PENALTY,
            frequencyPenalty: FREQUENCY_PENALTY,
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

    if (!response.body) return null;

    let fullAnswer = "";
    let finalSessionId = "";
    let finalMessageId = "";
    let metrics: any = {};

    for await (const chunk of response.body) {
        const text = chunk.toString();
        const lines = text.split('\n');

        for (const line of lines) {
            if (line.startsWith("data:")) {
                const dataStr = line.slice(5).trim();
                if (dataStr === "[DONE]") continue;

                try {
                    const event = JSON.parse(dataStr);
                    if (event.eventType === "fulfillment") {
                        if (event.answer) fullAnswer += event.answer;
                        if (event.sessionId) finalSessionId = event.sessionId;
                        if (event.messageId) finalMessageId = event.messageId;
                    } else if (event.eventType === "metricsLog") {
                        if (event.publicMetrics) metrics = event.publicMetrics;
                    }
                } catch (e) {
                    continue;
                }
            }
        }
    }

    return {
        message: "Quiz query submitted successfully",
        data: {
            sessionId: finalSessionId || sessionId,
            messageId: finalMessageId,
            answer: fullAnswer,
            metrics: metrics,
            status: "completed",
            contextMetadata: contextMetadata,
        },
    };
}

export async function POST(req: NextRequest) {
    if (!API_KEY) {
        return NextResponse.json({ error: "API Key not configured" }, { status: 500 });
    }

    try {
        const { subject, difficulty, count, query, sessionId, externalUserId } = await req.json();

        let currentSessionId = sessionId;
        let currentExternalUserId = externalUserId || uuidv4();

        if (!currentSessionId || currentSessionId === "null") {
            currentSessionId = await createChatSession(currentExternalUserId);
            if (!currentSessionId) {
                return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
            }
        }

        const contextMetadata = [
            { key: "userId", value: "1" },
            { key: "name", value: "John" },
        ];

        // Construct the query if it's the start
        const userQuery = query || `Start a quiz for Subject: ${subject}, Difficulty: ${difficulty}, Number of Questions: ${count}.`;

        const finalResponse = await submitQuery(currentSessionId, userQuery, contextMetadata);

        if (finalResponse) {
            return NextResponse.json(finalResponse);
        } else {
            return NextResponse.json({ error: "Failed to get quiz response" }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Quiz API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

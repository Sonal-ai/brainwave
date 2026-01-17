import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import os from 'os';

const API_KEY = process.env.ONDEMAND_API_KEY || "";
const BASE_URL = "https://api.on-demand.io/chat/v1";
const MEDIA_BASE_URL = "https://api.on-demand.io/media/v1";

const RESPONSE_MODE = "stream";
const AGENT_IDS = [
    "agent-1712327325",
    "agent-1713962163",
    "agent-1768605956",
    "agent-1768609390",
    "agent-1768611515",
    "agent-1768611427",
    "agent-1768611266"
];
const ENDPOINT_ID = "predefined-xai-grok4.1-fast";
const REASONING_MODE = "grok-4-fast";
const FULFILLMENT_PROMPT = `You are an adaptive study planning agent for students.

Your goal is to help students plan, track, and improve their study routine over time using the available tools.

You have access to the following tools:
- generateStudyPlan: Creates a personalized study plan.
- recordProgress: Records daily study progress.
- analyzeWeaknesses: Identifies weak subjects based on performance.

GENERAL BEHAVIOR RULES:
- Be proactive and supportive.
- Prefer structured planning over generic advice.
- Never assume missing data.
- Always explain changes you make to the study plan.

WHEN TO USE TOOLS:
1. When the user asks to create or update a study plan:
   - Collect subject names, difficulty, priority, available hours per day, and number of days.
   - Call generateStudyPlan with the structured input.

2. When the user reports what they studied, skipped, or completed:
   - Call recordProgress with the day number, completed subjects, and hours spent.

3. When performance scores, missed tasks, or repeated struggles are mentioned:
   - Call analyzeWeaknesses.
   - Use the result to adjust future study focus.

DECISION-MAKING RULES:
- Subjects marked as “hard” or “high priority” must receive more study time.
- Weak subjects must be scheduled earlier and more frequently.
- If a subject is repeatedly skipped, increase its priority.
- Never exceed the user’s available hours per day.

OUTPUT RULES:
- After every tool call, summarize what was done.
- Show the updated plan or adjustments clearly.
- Keep explanations concise and student-friendly.

FAILURE HANDLING:
- If a tool fails or is unavailable, explain the issue and continue with logical planning.
- Do not fabricate tool outputs.

EXAMPLES OF INTENT HANDLING:
- “Make a study plan” → generateStudyPlan
- “I couldn’t finish Math today” → recordProgress → analyzeWeaknesses
- “What should I focus on next?” → analyzeWeaknesses → adjust plan

Your role is not just to respond, but to continuously improve the student’s study outcomes over time.`;

const STOP_SEQUENCES: string[] = [];
const TEMPERATURE = 0.2;
const TOP_P = 1;
const MAX_TOKENS = 0;
const PRESENCE_PENALTY = 0;
const FREQUENCY_PENALTY = 0;

const CREATED_BY = "AIREV";
const UPDATED_BY = "AIREV";
const FILE_AGENTS = ["agent-1713954536", "agent-1713958591", "agent-1713958830", "agent-1713961903", "agent-1713967141"];

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

async function uploadMediaFile(filePath: string, fileName: string, agents: string[], sessionId: string) {
    const url = `${MEDIA_BASE_URL}/public/file/raw`;

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('sessionId', sessionId);
    formData.append('createdBy', CREATED_BY);
    formData.append('updatedBy', UPDATED_BY);
    formData.append('name', fileName);
    formData.append('responseMode', RESPONSE_MODE);

    agents.forEach(agent => {
        formData.append('agents', agent);
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'apikey': API_KEY,
            ...formData.getHeaders()
        },
        body: formData
    });

    if (response.status === 201 || response.status === 200) {
        const mediaResponse: any = await response.json();
        return mediaResponse.data;
    }
    return null;
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
            stopSequences: STOP_SEQUENCES,
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
        message: "Chat query submitted successfully",
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
    try {
        const requestData = await req.formData();
        const query = requestData.get('query') as string || "Hello!";
        let sessionId = requestData.get('sessionId') as string;
        let externalUserId = requestData.get('externalUserId') as string;
        const file = requestData.get('file') as File | null;

        if (!API_KEY) {
            return NextResponse.json({ error: "Missing API_KEY" }, { status: 500 });
        }

        if (!externalUserId || externalUserId === "null") {
            externalUserId = uuidv4();
        }

        if (!sessionId || sessionId === "null") {
            sessionId = await createChatSession(externalUserId);
        }

        const contextMetadata = [
            { key: "userId", value: "1" },
            { key: "name", value: "John" },
        ];

        if (file) {
            const tempDir = os.tmpdir();
            const tempFilePath = path.join(tempDir, `${uuidv4()}-${file.name}`);
            const buffer = Buffer.from(await file.arrayBuffer());
            await fs.promises.writeFile(tempFilePath, buffer);

            await uploadMediaFile(tempFilePath, file.name, FILE_AGENTS, sessionId);

            await fs.promises.unlink(tempFilePath);
        }

        const finalResponse = await submitQuery(sessionId, query, contextMetadata);

        return NextResponse.json(finalResponse);

    } catch (error: any) {
        console.error("Study Planner Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

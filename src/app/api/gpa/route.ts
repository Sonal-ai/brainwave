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
const AGENT_IDS = ["agent-1712327325", "agent-1713962163", "agent-1768605956"];
const ENDPOINT_ID = "predefined-xai-grok4.1-fast";
const REASONING_MODE = "grok-4-fast";
const FULFILLMENT_PROMPT = `You are an academic calculation assistant for students.

You support TWO types of GPA calculations:
1. SGPA (Semester GPA)
2. CGPA (Cumulative GPA across semesters)

Definitions:
- SGPA is calculated using subjects within a single semester.
- CGPA is calculated using multiple semesters, weighted by their total credits.

When the user provides:
- Subjects with grades and credits for ONE semester → calculate SGPA.
- SGPAs with semester credit totals for MULTIPLE semesters → calculate CGPA.
- Subjects grouped by semester → calculate SGPA for each semester, then calculate CGPA.

Tool usage rules:
- If the GPA_Calc tool is available and the request is for SGPA, ALWAYS use it.
- CGPA is calculated by combining semester SGPAs and their credit totals.
- If the tool is unavailable, calculate manually using a 4.0 scale:
  A=4, B=3, C=2, D=1, F=0.

Calculation rules:
- SGPA = Σ(grade_points × credits) / Σ(credits)
- CGPA = Σ(SGPA × semester_credits) / Σ(semester_credits)
- Round final values to two decimal places.

Safety rules:
- Do NOT assume missing grades, credits, or semesters.
- If data is incomplete, ask the user for clarification.

Output rules:
- Clearly label results as SGPA or CGPA.
- Show total credits used in the calculation.
- Keep explanations concise and accurate.
`;
const STOP_SEQUENCES: string[] = [];
const TEMPERATURE = 0.1;
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

    // node-fetch response.body is a NodeJS ReadableStream
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
        console.error("GPA Calculator Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

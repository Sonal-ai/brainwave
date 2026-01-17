import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const API_KEY = process.env.ONDEMAND_API_KEY || "";
const BASE_URL = "https://api.on-demand.io/chat/v1";
const MEDIA_BASE_URL = "https://api.on-demand.io/media/v1";

const AGENT_IDS = ["agent-1712327325", "agent-1713962163"];
const ENDPOINT_ID = "predefined-xai-grok4.1-fast";
const REASONING_MODE = "grok-4-fast";
const FULFILLMENT_PROMPT = "When given an image or document, extract its contents and paraphrase it and return it to the user. Don't add anything else.";

const TEMPERATURE = 0.3;
const TOP_P = 1;
const MAX_TOKENS = 0;
const PRESENCE_PENALTY = 0;
const FREQUENCY_PENALTY = 0;
const RESPONSE_MODE = "stream";

const FILE_AGENTS = ["agent-1713954536", "agent-1713958591", "agent-1713958830", "agent-1713961903", "agent-1713967141"];
const CREATED_BY = "AIREV";
const UPDATED_BY = "AIREV";

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
        const data: any = await response.json();
        return data.data.id;
    }
    return "";
}

async function uploadMediaFile(filePath: string, fileName: string, sessionId: string) {
    const url = `${MEDIA_BASE_URL}/public/file/raw`;

    if (!fs.existsSync(filePath)) return null;

    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));
        formData.append('sessionId', sessionId);
        formData.append('createdBy', CREATED_BY);
        formData.append('updatedBy', UPDATED_BY);
        formData.append('name', fileName);
        formData.append('responseMode', 'sync');

        FILE_AGENTS.forEach(agent => {
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
            const data: any = await response.json();
            return data.data;
        }
    } catch (error) {
        console.error("Upload error:", error);
    }
    return null;
}

async function submitQuery(sessionId: string, contextMetadata: any[]) {
    const url = `${BASE_URL}/sessions/${sessionId}/query`;
    const body = {
        endpointId: ENDPOINT_ID,
        query: "Summarize the uploaded document.",
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
        message: "Summary generated successfully",
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
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `${uuidv4()}-${file.name}`);
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.promises.writeFile(tempFilePath, buffer);

        const externalUserId = uuidv4();
        const sessionId = await createChatSession(externalUserId);

        if (!sessionId) {
            await fs.promises.unlink(tempFilePath);
            return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
        }

        const uploadResult = await uploadMediaFile(tempFilePath, file.name, sessionId);
        await fs.promises.unlink(tempFilePath);

        if (!uploadResult) {
            return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
        }

        const contextMetadata = [
            { key: "userId", value: "1" },
            { key: "name", value: "John" },
        ];

        const finalResponse = await submitQuery(sessionId, contextMetadata);

        if (finalResponse) {
            return NextResponse.json(finalResponse);
        } else {
            return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
        }

    } catch (error: any) {
        console.error("API Route Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

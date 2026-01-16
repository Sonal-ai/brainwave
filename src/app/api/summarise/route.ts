import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { pipeline } from 'stream/promises';

const API_KEY = process.env.ONDEMAND_API_KEY || "";
const BASE_URL = "https://api.on-demand.io/chat/v1";
const MEDIA_BASE_URL = "https://api.on-demand.io/media/v1";

// Constants from the user snippet
const AGENT_IDS = ["agent-1712327325", "agent-1713962163"];
const ENDPOINT_ID = "predefined-xai-grok4.1-fast";
const REASONING_MODE = "grok-4-fast";
const FULFILLMENT_PROMPT = "When given an image or document, extract its contents and paraphrase it and return it to the user. Don't add anything else.";
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
            console.error(`Error creating session: ${response.status} - ${await response.text()}`);
            return null;
        }
    } catch (error) {
        console.error("Exception creating session:", error);
        return null;
    }
}

async function uploadMediaFile(filePath: string, fileName: string, sessionId: string) {
    const url = `${MEDIA_BASE_URL}/public/file/raw`;

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return null;
    }

    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));
        formData.append('sessionId', sessionId);
        formData.append('createdBy', CREATED_BY);
        formData.append('updatedBy', UPDATED_BY);
        formData.append('name', fileName);
        formData.append('responseMode', 'sync'); // Using sync for upload acknowledgement

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
        } else {
            console.error(`Error uploading file: ${response.status} - ${await response.text()}`);
            return null;
        }
    } catch (error) {
        console.error("Exception uploading file:", error);
        return null;
    }
}

async function submitQuery(sessionId: string) {
    const url = `${BASE_URL}/sessions/${sessionId}/query`;
    const body = {
        endpointId: ENDPOINT_ID,
        query: "Summarize the uploaded document.", // Generic query to trigger the prompt
        agentIds: AGENT_IDS,
        responseMode: "stream",
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

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.body) return "No response body";

        // Read stream and collect answer
        const reader = response.body; // node-fetch body is a stream
        let fullAnswer = "";

        // Handling the stream manually since it's an API route and we want to return the full text
        // Note: node-fetch returns a NodeJS Readable stream
        for await (const chunk of reader) {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
                if (line.startsWith("data:")) {
                    const dataStr = line.slice(5).trim();
                    if (dataStr === "[DONE]") continue;

                    try {
                        const event = JSON.parse(dataStr);
                        if (event.eventType === "fulfillment" && event.answer) {
                            fullAnswer += event.answer;
                        }
                    } catch (e) {
                        // ignore parse errors
                    }
                }
            }
        }

        return fullAnswer;

    } catch (error) {
        console.error("Exception submitting query:", error);
        return "Error generating summary.";
    }
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

        // Save file to temp
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `${uuidv4()}-${file.name}`);
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.promises.writeFile(tempFilePath, buffer);

        // Process
        const externalUserId = uuidv4();
        const sessionId = await createChatSession(externalUserId);

        if (!sessionId) {
            await fs.promises.unlink(tempFilePath);
            return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
        }

        const uploadResult = await uploadMediaFile(tempFilePath, file.name, sessionId);

        // Clean up temp file
        await fs.promises.unlink(tempFilePath);

        if (!uploadResult) {
            return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
        }

        const summary = await submitQuery(sessionId);

        return NextResponse.json({ summary });

    } catch (error) {
        console.error("API Route Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

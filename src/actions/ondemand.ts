'use server';

export async function uploadMedia(url: string) {
    const apiKey = process.env.ONDEMAND_API_KEY;

    if (!apiKey) {
        throw new Error('OnDemand API Key is missing');
    }

    const endpoint = 'https://api.on-demand.io/media/v1/public/file';

    const payload = {
        url: url,
        plugins: ['plugin-1713961903'], // YouTube Processing Plugin
        responseMode: 'sync',
        createdBy: 'Brainwave User', // Placeholder
        name: `youtube-${Date.now()}`
    };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, data: data };
    } catch (error: any) {
        console.error('OnDemand API Error:', error);
        return { success: false, error: error.message };
    }
}

// 🟢 STEP 1 — Fetch the transcript text
export async function fetchTranscript(url: string) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch transcript file");
        const text = await res.text();

        // Validation
        if (!text || text.length < 50) {
            throw new Error("Transcript is empty or invalid (too short)");
        }

        return { success: true, text };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 🟢 STEP 2 — Create a Chat Session
export async function createChatSession(externalUserId?: string, pluginIds?: string[]) {
    const apiKey = process.env.ONDEMAND_API_KEY;
    if (!apiKey) throw new Error('OnDemand API Key is missing');

    try {
        const response = await fetch('https://api.on-demand.io/chat/v1/sessions', {
            method: 'POST',
            headers: {
                'apikey': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                externalUserId: externalUserId || 'brainwave-user-1',
                pluginIds: pluginIds || []
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Session Creation Failed: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, sessionId: data.data.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 🟢 Get Session Details
export async function getSession(sessionId: string) {
    const apiKey = process.env.ONDEMAND_API_KEY;
    if (!apiKey) throw new Error('OnDemand API Key is missing');

    try {
        const response = await fetch(`https://api.on-demand.io/chat/v1/sessions/${sessionId}`, {
            method: 'GET',
            headers: {
                'apikey': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to get session: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, session: data.data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 🟢 List All Sessions
export async function listSessions(limit: number = 10, cursor?: string, sort: 'asc' | 'desc' = 'desc') {
    const apiKey = process.env.ONDEMAND_API_KEY;
    if (!apiKey) throw new Error('OnDemand API Key is missing');

    try {
        let url = `https://api.on-demand.io/chat/v1/sessions?limit=${limit}&sort=${sort}`;
        if (cursor) {
            url += `&cursor=${cursor}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'apikey': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to list sessions: ${response.status}`);
        }

        const data = await response.json();
        return { 
            success: true, 
            sessions: data.data,
            pagination: data.pagination
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 🟢 Get Messages in a Session
export async function getMessages(sessionId: string, limit: number = 50, cursor?: string) {
    const apiKey = process.env.ONDEMAND_API_KEY;
    if (!apiKey) throw new Error('OnDemand API Key is missing');

    try {
        let url = `https://api.on-demand.io/chat/v1/sessions/${sessionId}/messages?limit=${limit}`;
        if (cursor) {
            url += `&cursor=${cursor}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'apikey': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to get messages: ${response.status}`);
        }

        const data = await response.json();
        return { 
            success: true, 
            messages: data.data,
            pagination: data.pagination
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 🟢 Get Specific Message
export async function getSpecificMessage(sessionId: string, messageId: string) {
    const apiKey = process.env.ONDEMAND_API_KEY;
    if (!apiKey) throw new Error('OnDemand API Key is missing');

    try {
        const response = await fetch(
            `https://api.on-demand.io/chat/v1/sessions/${sessionId}/messages/${messageId}`,
            {
                method: 'GET',
                headers: {
                    'apikey': apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to get message: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, message: data.data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 🟢 STEP 3 — Ask a question using Chat API (Enhanced for general chat)
export async function queryChat(
    sessionId: string, 
    question: string,
    options?: {
        endpointId?: string;
        pluginIds?: string[];
        responseMode?: 'sync' | 'stream' | 'webhook';
        modelConfigs?: {
            temperature?: number;
            topP?: number;
            fulfillmentPrompt?: string;
        };
    }
) {
    const apiKey = process.env.ONDEMAND_API_KEY;
    if (!apiKey) throw new Error('OnDemand API Key is missing');

    const queryPayload = {
        endpointId: options?.endpointId || "predefined-openai-gpt4o",
        responseMode: options?.responseMode || "sync",
        query: question,
        pluginIds: options?.pluginIds || [],
        modelConfigs: options?.modelConfigs || {}
    };

    try {
        const response = await fetch(`https://api.on-demand.io/chat/v1/sessions/${sessionId}/query`, {
            method: 'POST',
            headers: {
                'apikey': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(queryPayload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Query Failed: ${response.status}`);
        }

        const data = await response.json();
        return { 
            success: true, 
            answer: data.data.answer,
            messageId: data.data.messageId,
            status: data.data.status
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 🟢 Enhanced function specifically for transcript-based queries
export async function queryChatWithTranscript(
    sessionId: string, 
    transcript: string, 
    question: string
) {
    const fulfillmentPrompt = `You are an AI assistant specialized in analyzing video transcripts. Your ONLY purpose is to answer questions about the provided video transcript.

STRICT RULES:
1. You can ONLY answer questions that are directly related to the video content in the transcript below.
2. If a question is about topics covered in the video, answer it with evidence from the transcript.
3. If a question asks for clarification or deeper explanation of video topics, you may provide that.
4. If a question is completely unrelated to the video (e.g., "What's the weather?", "Tell me a joke", "Who is the president?"), you MUST politely decline and redirect to video-related questions.
5. Do NOT answer general knowledge questions unless they directly relate to understanding the video content.

VIDEO TRANSCRIPT:
${transcript.substring(0, 150000)}

RESPONSE GUIDELINES:
- For video-related questions: Provide detailed answers with quotes from the transcript as evidence.
- For off-topic questions: Respond with: "I can only answer questions about this video. Please ask something related to the video content."
- For unclear relevance: If you're unsure if a question is related, err on the side of video context.
- Be helpful and educational for genuine video-related queries.
- Keep answers concise but informative.`;

    return queryChat(sessionId, question, {
        modelConfigs: {
            fulfillmentPrompt,
            temperature: 0.3
        }
    });
}


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
export async function createChatSession() {
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
                externalUserId: 'brainwave-user-1'
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

// 🟢 STEP 3 — Ask a question using Chat API
export async function queryChat(sessionId: string, transcript: string, question: string) {
    const apiKey = process.env.ONDEMAND_API_KEY;
    if (!apiKey) throw new Error('OnDemand API Key is missing');

    const queryPayload = {
        endpointId: "predefined-openai-gpt4o",
        responseMode: "sync",
        query: `
You are analyzing a video transcript.

Transcript:
${transcript.substring(0, 150000)}

Question:
${question}

Instructions:
- Answer YES or NO.
- If YES, quote the exact line from the transcript as evidence.
- If NO, say "Not mentioned".
`
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
        return { success: true, answer: data.data.answer };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

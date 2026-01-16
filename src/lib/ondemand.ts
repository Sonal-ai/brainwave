const API_KEY = process.env.ONDEMAND_API_KEY!;

export interface AgentResponse {
    mode: 'timetable' | 'classification';
    subjects_detected?: string[];
    classified_subject?: string;
    confidence: number;
    notes?: string;
}

// 1. Upload Media (Step 1)
export async function uploadMedia(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);

    try {
        console.log(`[OnDemand] Uploading ${file.name}...`);
        const res = await fetch("https://api.on-demand.io/media/v1/public/file", {
            method: "POST",
            headers: { "apikey": API_KEY },
            body: formData
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("OnDemand Media API Error:", err);
            return null;
        }

        const data = await res.json();
        const id = data.data?.id || data.media_id || data.id;
        console.log(`[OnDemand] Upload Success. Media ID: ${id}`);
        return id || null;
    } catch (e) {
        console.error("Upload Exception:", e);
        return null;
    }
}

// 2. Analyze Timetable (Step 2)
export async function analyzeTimetable(mediaId: string): Promise<any> {
    const TOOL_ID = 'tool-1713958591';

    try {
        console.log(`[OnDemand] Analyzing Media ID: ${mediaId}`);

        // Step A: Create Session
        const res = await fetch("https://api.on-demand.io/chat/v1/sessions", {
            method: 'POST',
            headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pluginIds: [TOOL_ID],
                externalUserId: 'user-1'
            })
        });

        if (!res.ok) throw new Error(`Session creation failed: ${res.status}`);
        const session = await res.json();
        const sessionId = session.data.id;

        // Step B: Query
        const prompt = `
            Analyze the image with ID ${mediaId}. 
            Extract the timetable schedule into this strict JSON format:
            {
              "subjects": [
                {
                  "name": "Subject Name",
                  "classes": [
                    { "day": "Monday", "start_time": "10:00 AM", "end_time": "11:00 AM", "location": "Room 101" }
                  ]
                }
              ]
            }
        `;

        const queryRes = await fetch(`https://api.on-demand.io/chat/v1/sessions/${sessionId}/query`, {
            method: 'POST',
            headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                endpointId: 'predefined-openai-gpt4o',
                query: prompt,
                pluginIds: [TOOL_ID],
                responseMode: 'sync'
            })
        });

        if (!queryRes.ok) throw new Error(`Query failed: ${queryRes.status}`);

        const completion = await queryRes.json();
        const answer = completion.data?.answer;

        if (!answer) return null;

        const cleanJson = answer.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
        return JSON.parse(cleanJson);

    } catch (e) {
        console.error("OnDemand Processing Error:", e);
        return null;
    }
}

export async function processFileWithAgent(
    file: File,
    agentId: string, // Not used strictly if we hardcode the tool for now, but kept for sig compatibility
    context: any = {}
): Promise<AgentResponse> {

    // For Timetables, we use the Extraction Flow
    // If this function is called for Classification (Resources), we can do similar logic

    return {
        mode: 'classification',
        classified_subject: 'General',
        confidence: 0,
        notes: "Fallback"
    };
}

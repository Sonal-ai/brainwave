const API_KEY = process.env.ONDEMAND_API_KEY!.trim();

export interface AgentResponse {
    mode: 'timetable' | 'classification';
    subjects_detected?: string[];
    classified_subject?: string;
    confidence: number;
    notes?: string;
}

// 1. Upload Media (Step 1)
export async function uploadMedia(file: File): Promise<string | null> {
    try {
        console.log("[DEBUG] API key loaded:", !!API_KEY, "Length:", API_KEY?.length);

        if (!API_KEY) {
            console.error("[OnDemand] Missing API_KEY");
            return null;
        }

        console.log(`[OnDemand] Preparing upload for: ${file.name} (${file.size} bytes, type: ${file.type})`);

        // Convert to standard File object for maximum compatibility
        const arrayBuffer = await file.arrayBuffer();
        const blob = new Blob([arrayBuffer]);
        const newFile = new File([blob], file.name, { type: file.type || 'application/octet-stream' });

        const formData = new FormData();
        formData.append("file", newFile);

        console.log(`[OnDemand] Sending to https://api.on-demand.io/media/v1/public/file`);

        // Using 'apikey' header as it successfully authenticated (500 error > 401 error)
        const res = await fetch("https://api.on-demand.io/media/v1/public/file", {
            method: "POST",
            headers: {
                "apikey": API_KEY
            },
            body: formData
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[OnDemand] Upload Failed: ${res.status} ${res.statusText}`);
            console.error(`[OnDemand] Error Body: ${errText}`);
            return null;
        }

        const data = await res.json();
        console.log(`[OnDemand] Response:`, data);

        const id = data.data?.id || data.media_id || data.id;

        if (id) {
            console.log(`[OnDemand] Upload Success. Media ID: ${id}`);
            return id;
        } else {
            console.error("[OnDemand] No ID in response:", data);
            return null;
        }
    } catch (e) {
        console.error("Upload Exception:", e);
        return null; // Return null so UI shows "Analysis Failed"
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
            headers: {
                'apikey': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pluginIds: [TOOL_ID],
                externalUserId: 'user-1'
            })
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Session creation failed: ${res.status} - ${err}`);
        }

        const session = await res.json();
        const sessionId = session.data.id;
        console.log(`[OnDemand] Session Started: ${sessionId}`);

        // Step B: Query with Specific Model
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
            headers: {
                'apikey': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                modelId: '6969d6b8ac9b040cc2f752f9', // GPT-5.2 User Locked Model
                query: prompt,
                pluginIds: [TOOL_ID],
                responseMode: 'sync'
            })
        });

        if (!queryRes.ok) {
            const err = await queryRes.text();
            throw new Error(`Query failed: ${queryRes.status} - ${err}`);
        }

        const completion = await queryRes.json();
        const answer = completion.data?.answer;

        if (!answer) {
            console.warn("[OnDemand] No answer received.");
            return null;
        }

        console.log("Analysis Result Length:", answer.length);
        const cleanJson = answer.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
        return JSON.parse(cleanJson);

    } catch (e) {
        console.error("OnDemand Processing Error:", e);
        return null; // Return null so UI shows "Analysis Failed"
    }
}

export async function processFileWithAgent(
    file: File,
    agentId: string,
    context: any = {}
): Promise<AgentResponse> {
    // Fallback/Mock for Resource Classification for now
    return {
        mode: 'classification',
        classified_subject: 'General',
        confidence: 0,
        notes: "Fallback"
    };
}

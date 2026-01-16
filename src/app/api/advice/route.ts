import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const API_KEY = process.env.NEXT_PUBLIC_ONDEMAND_API_KEY || "xZHFkXgr7YgxDpeqgzaunTnyT77uCjoK";
const BASE_URL = "https://api.on-demand.io/chat/v1";
const AGENT_IDS = ["agent-1712327325", "agent-1713962163"];
const ENDPOINT_ID = "predefined-openai-gpt5.2";
const RESPONSE_MODE = "stream";

async function createChatSession(externalUserId: string) {
    const url = `${BASE_URL}/sessions`;
    const contextMetadata = [
        { key: "userId", value: externalUserId },
        { key: "source", value: "dashboard_advisor" }
    ];

    const body = {
        agentIds: AGENT_IDS,
        externalUserId: externalUserId,
        contextMetadata: contextMetadata,
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (response.status === 201) {
            const data = await response.json();
            return data.data.id;
        } else {
            const err = await response.text();
            console.error("Session Create Error:", err);
            return null;
        }
    } catch (e) {
        console.error("Session Fetch Error:", e);
        return null;
    }
}

async function submitQuery(sessionId: string, prompt: string) {
    const url = `${BASE_URL}/sessions/${sessionId}/query`;
    const body = {
        endpointId: ENDPOINT_ID,
        query: "Generate Academic Advice",
        agentIds: AGENT_IDS,
        responseMode: RESPONSE_MODE,
        reasoningMode: "gpt-5.2",
        modelConfigs: {
            fulfillmentPrompt: prompt,
            temperature: 0.7,
            maxTokens: 500,
            stopSequences: [],
            topP: 1,
            presencePenalty: 0,
            frequencyPenalty: 0
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.body) return null;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullAnswer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith("data:")) {
                    const dataStr = line.slice(5).trim();
                    if (dataStr === "[DONE]") return fullAnswer;

                    try {
                        const event = JSON.parse(dataStr);
                        if (event.eventType === "fulfillment" && event.answer) {
                            fullAnswer += event.answer;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
        }
        return fullAnswer;

    } catch (e) {
        console.error("Query Fetch Error:", e);
        return null;
    }
}

export async function POST(req: Request) {
    try {
        const { attendance, cgpa } = await req.json();

        // 1. Compute Metrics
        let totalClasses = 0;
        let attendedClasses = 0;
        let lowAttendanceSubjects: string[] = [];

        if (attendance) {
            Object.keys(attendance).forEach(sub => {
                const { attended, total } = attendance[sub];
                if (total > 0) {
                    totalClasses += total;
                    attendedClasses += attended;
                    if ((attended / total) < 0.75) {
                        lowAttendanceSubjects.push(sub);
                    }
                }
            });
        }

        const avgAttendance = totalClasses > 0 ? ((attendedClasses / totalClasses) * 100).toFixed(1) : "0";
        const lowAttendanceCount = lowAttendanceSubjects.length;

        // 2. Construct Prompt
        const prompt = `You are an academic advisory agent for a college student dashboard.

Your task:
Based on overall academic indicators, provide ONE primary advice.

Possible advice values:
- ATTEND_MORE_CLASSES
- STUDY_HARDER
- BALANCE_BOTH
- MAINTAIN_CURRENT

Rules:
- Minimum safe attendance is 75%
- CGPA below 7.0 indicates academic weakness
- Attendance has higher priority than CGPA
- Be strict, concise, and supportive
- Do NOT give multiple primary advices

Input:
Average Attendance: ${avgAttendance}%
CGPA: ${cgpa || "N/A"}
Subjects below 75% attendance: ${lowAttendanceCount} (${lowAttendanceSubjects.join(', ')})

Return ONLY valid JSON in this format:
{
  "status": "",
  "primary_advice": "",
  "confidence": "",
  "reason": "",
  "next_steps": []
}`;

        // 3. Call Agent
        const externalUserId = uuidv4();
        const sessionId = await createChatSession(externalUserId);

        if (!sessionId) {
            return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
        }

        const answer = await submitQuery(sessionId, prompt);

        if (!answer) {
            return NextResponse.json({ error: "Failed to get advice" }, { status: 500 });
        }

        // 4. Parse JSON Response
        let cleanJson = answer.replace(/```json\n?|\n?```/g, "").trim();
        let adviceData;

        try {
            adviceData = JSON.parse(cleanJson);
        } catch (e) {
            console.error("JSON Parse Error:", cleanJson);
            adviceData = {
                status: "UNKNOWN",
                primary_advice: "CHECK_LOGS",
                reason: answer,
                next_steps: []
            };
        }

        return NextResponse.json(adviceData);

    } catch (e) {
        console.error("API Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

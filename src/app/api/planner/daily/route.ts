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
        { key: "source", value: "daily_planner" }
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
        query: "Generate Daily Plan",
        agentIds: AGENT_IDS,
        responseMode: RESPONSE_MODE,
        reasoningMode: "gpt-5.2",
        modelConfigs: {
            fulfillmentPrompt: prompt,
            temperature: 0.7,
            maxTokens: 1000,
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
        const inputData = await req.json();

        // Expecting input structure matching the user's request
        const {
            daystart = "07:00",
            dayend = "23:00",
            today_timetable,
            lowprioritysubjects,
            highprioritysubjects
        } = inputData;

        // VALIDATION
        if (!today_timetable || !Array.isArray(today_timetable)) {
            return NextResponse.json({ error: "Invalid timetable data" }, { status: 400 });
        }

        // CONSTRUCT PROMPT (Using the EXACT User Prompt)
        const timetableJson = JSON.stringify(today_timetable, null, 2);
        const highPriorityJson = JSON.stringify(highprioritysubjects || [], null, 2);
        const lowPriorityJson = JSON.stringify(lowprioritysubjects || [], null, 2);

        const prompt = `You are a Daily Planner Agent for a college student.

Your responsibility:
Create a realistic, structured daily plan from morning to night
based strictly on today’s timetable and subject priorities.

You do NOT motivate, explain philosophy, or chat.
You ONLY plan the day.

══════════ RULES ══════════

1. The plan must cover the full day from ${daystart} to ${dayend}.
2. Class timings are FIXED and cannot be changed.
3. Do NOT schedule study during class times.
4. Use only free time slots for study.
5. Subjects listed as high priority must receive more study time.
6. No continuous study session should exceed 2 hours.
7. Insert breaks after long activities.
8. Include meals, rest, and light activities.
9. Avoid heavy study late at night.
10. Keep the plan realistic and human-like.

══════════ INPUT ══════════

Day Start: ${daystart}
Day End: ${dayend}

Today’s Classes:
${timetableJson}

High Priority Subjects:
${highPriorityJson}

Low Priority Subjects:
${lowPriorityJson}

══════════ OUTPUT ══════════

Return ONLY valid JSON.
Do not add explanation, markdown, or extra text.

Use EXACTLY this format:

{
  "date": "",
  "focus_subjects": [],
  "daily_plan": [
    {
      "time": "",
      "activity": "",
      "category": ""
    }
  ],
  "summary": ""
}
`;

        // CALL AGENT
        const externalUserId = uuidv4();
        const sessionId = await createChatSession(externalUserId);

        if (!sessionId) {
            return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
        }

        const answer = await submitQuery(sessionId, prompt);

        if (!answer) {
            return NextResponse.json({ error: "Failed to get plan" }, { status: 500 });
        }

        // PARSE RESPONSE
        let cleanJson = answer.replace(/```json\n?|\n?```/g, "").trim();
        let planData;

        try {
            planData = JSON.parse(cleanJson);
        } catch (e) {
            console.error("JSON Parse Error:", cleanJson);
            // Attempt to recover or return raw
            return NextResponse.json({ error: "Failed to parse agent response", raw: answer }, { status: 500 });
        }

        return NextResponse.json(planData);

    } catch (e) {
        console.error("API Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

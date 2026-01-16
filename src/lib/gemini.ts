const API_KEY = process.env.GEMINI_API_KEY;

export interface ClassSession {
    day: string;
    startTime: string;
    endTime: string;
    subject: string;
    location: string;
}

// Step 1: Image -> Text (OCR Agent)
export async function extractTextFromImage(file: File): Promise<string> {
    if (!API_KEY) return "";

    try {
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = file.type;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: "Perform OCR on this image. Extract all the text exactly as it appears, preserving the layout if possible." },
                        { inline_data: { mime_type: mimeType, data: base64Data } }
                    ]
                }]
            }),
        });

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (e) {
        console.error("OCR Failed:", e);
        return "";
    }
}

// Step 2: Text -> Schedule (Structuring Agent)
export interface TimetableResponse {
    subjects: {
        name: string;
        classes: {
            day: string;
            start_time: string;
            end_time: string;
            location: string;
        }[];
    }[];
}

export async function structureTimetable(text: string): Promise<TimetableResponse | null> {
    if (!API_KEY || !text) return null;

    try {
        const prompt = `
You are a Timetable Intelligence Agent operating inside the DTU Student Helper platform.

Your input is raw text extracted from a timetable using the OnDemand Media API.

Your task is to analyze this text and extract structured academic information.

--------------------------------------------------
PRIMARY OBJECTIVES
--------------------------------------------------
From the given timetable text, you must identify:

1. SUBJECTS
- Extract all subject names
- Normalize naming (e.g., "DSA", "Data Structures" → one subject)
- Remove duplicates

2. CLASS TIME
- Identify start and end times
- Group them by day if possible

3. CLASS LOCATION
- Extract room numbers, lab identifiers, or building codes
- Associate them with subjects and time slots

--------------------------------------------------
OUTPUT STRUCTURE (MANDATORY)
--------------------------------------------------
Return ONLY valid JSON in the following format:

{
  "subjects": [
    {
      "name": "",
      "classes": [
        {
          "day": "",
          "start_time": "",
          "end_time": "",
          "location": ""
        }
      ]
    }
  ]
}

--------------------------------------------------
RULES
--------------------------------------------------
- Do NOT hallucinate missing data
- If location is not found, return null
- If time is unclear, mark it as "unknown"
- Operate only on provided text
- Be conservative and accurate

You are NOT a chatbot.
You are a timetable understanding system.

INPUT TEXT:
"""
${text}
"""
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            }),
        });

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) return null;

        const cleanJson = textResponse.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Structuring Failed:", e);
        return null;
    }
}

// Step 3: Direct Multimodal (Image -> JSON)
export async function parseTimetableMultimodal(file: File): Promise<TimetableResponse | null> {
    if (!API_KEY) return null;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = file.type;

        const prompt = `
You are a Timetable Intelligence Agent.
Your task is to extract structured academic information directly from the provided timetable image.

--------------------------------------------------
PRIMARY OBJECTIVES
--------------------------------------------------
1. SUBJECTS: Extract all subject names. Normalize valid academic subjects (e.g. "DSA" -> "Data Structures").
2. CLASS TIME: Identify start and end times.
3. CLASS LOCATION: Extract room numbers/labs.

--------------------------------------------------
OUTPUT STRUCTURE (MANDATORY)
--------------------------------------------------
Return ONLY valid JSON in the following format:
{
  "subjects": [
    {
      "name": "",
      "classes": [
        {
          "day": "",
          "start_time": "",
          "end_time": "",
          "location": ""
        }
      ]
    }
  ]
}

- Do not include markdown formatting.
- Be accurate.
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: mimeType, data: base64Data } }
                    ]
                }]
            }),
        });

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) return null;

        const cleanJson = textResponse.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Multimodal Parsing Failed:", e);
        return null;
    }
}

import { getBaseurl } from "../../lib/utils";
import { Environment } from "../AIChat/types";
import { contextVariables } from "../types";

export async function generateSessionId(
    API_KEY: string,
    environment: Environment,
    botId: string,
    contextVariables?: contextVariables
) {
    try {
        const sessionData = {
            pluginIds: [],
            externalUserId: "1",
            contextMetadata: contextVariables,
        };

        const url = getBaseurl(environment);
        const response = await fetch(`${url}/chat/v1/sessions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-bot-id": botId,
                apikey: API_KEY,
            },
            body: JSON.stringify(sessionData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data?.data?.id;
    } catch (error) {
        console.error("Failed to generate session:", error);
        throw error;
    }
}

export async function getBotConfiguration(
    API_KEY: string,
    botId: string,
    environment: Environment
) {
    try {
        const url = getBaseurl(environment);
        const response = await fetch(
            `${url}/config/v1/public/embedded/chatbot/${botId}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "x-bot-id": botId,
                    apikey: API_KEY,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error("Failed to get bot configuration:", error);
        throw error;
    }
}

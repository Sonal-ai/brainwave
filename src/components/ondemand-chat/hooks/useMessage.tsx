import { generateSessionId } from "../components/api";
import { SendMessageType } from "../components/types";
import { eventToMessageMapping } from "../lib/constant";
import { addMessage, getBaseurl, updateLastMessage } from "../lib/utils";

export const useMessage = (apiKey: string) => {
    const sendMessage = async ({
        environment,
        modelEndpointId,
        input,
        setMessages,
        sessionId,
        setInput,
        setIsInputDisabled,
        setSessionId,
        moreAddedAgents,
        fulfillmentPrompt,
        contextVariables,
        botId,
        reasoningMode,
    }: SendMessageType) => {
        if (!input) return;

        addMessage(setMessages, {
            message: input,
            author: "user",
            isFetching: false,
            id: Date.now().toString(),
            status: "complete",
        });

        addMessage(setMessages, {
            author: "bot",
            isFetching: true,
            status: "loading",
        });

        setIsInputDisabled(true);
        setInput("");

        try {
            let currentSessionId = sessionId;
            if (!currentSessionId) {
                const sessionId = await generateSessionId(
                    apiKey,
                    environment,
                    botId,
                    contextVariables
                );
                currentSessionId = sessionId;
                setSessionId(currentSessionId);
            }

            const queryData = {
                endpointId: modelEndpointId,
                query: input,
                pluginIds: moreAddedAgents,
                responseMode: "stream",
                debugMode: "on",
                reasoningMode: reasoningMode,
                modelConfigs: {
                    frequencyPenalty: 0,
                    fulfillmentPrompt: fulfillmentPrompt,
                    presencePenalty: 0,
                    stopTokens: [],
                    temperature: 0.3,
                    topP: 0.9,
                },
            };

            const url = getBaseurl(environment);
            const response = await fetch(
                `${url}/chat/v1/sessions/${currentSessionId}/query`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-bot-id": botId,
                        apikey: apiKey!,
                    },
                    body: JSON.stringify(queryData),
                }
            );

            const reader = response.body?.getReader();
            const decoder = new TextDecoder("utf-8");

            // eslint-disable-next-line no-constant-condition
            while (true) {
                const { done, value } = await reader!.read();
                if (done) break;

                const decoderResult = decoder.decode(value);
                const lines = decoderResult
                    .split("\n")
                    .map((line) => line.replace(/^data:/, "").trim())
                    .filter(
                        (line) =>
                            line !== "event:message" &&
                            line !== "[DONE]" &&
                            line !== "" &&
                            line !== "event:heartbeat" // PATCH: Filter out heartbeat events
                    )
                    .map((line) => JSON.parse(line));

                for (const line of lines) {
                    if (
                        line.eventType === "statusLog" &&
                        line.currentStatusLog.statusMessage !== "Fulfillment completed"
                    ) {
                        updateLastMessage(setMessages, {
                            message:
                                eventToMessageMapping[line.currentStatusLog.statusMessage],
                            isFetching: false,
                            status: "loading",
                        });
                    } else if (line.eventType === "fulfillment") {
                        updateLastMessage(setMessages, (prev) => ({
                            message:
                                prev?.status === "loading"
                                    ? line.answer
                                    : prev.message + line.answer,
                            status: "streaming",
                            isFetching: false,
                        }));
                    }
                }
            }
        } catch (error) {
            console.error("Error sending message:", error);
            updateLastMessage(setMessages, {
                message: "An error occurred while processing your request.",
                status: "error",
                isFetching: false,
            });
        } finally {
            setIsInputDisabled(false);
        }
    };

    return { sendMessage };
};

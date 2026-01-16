import { Environment } from "./AIChat/types";

export type BotMessageStatus =
    | "streaming"
    | "complete"
    | "error"
    | "loading"
    | "uploading";

type StatusEventType =
    | "retrieving"
    | "retrievalCompleted"
    | "retrievalFailed"
    | "executing"
    | "executionCompleted"
    | "executionFailed"
    | "fulfilling"
    | "fulfillmentCompleted"
    | "fulfillmentFailed";

export type StatusLogType = {
    type: StatusEventType;
    message: string;
    plugins?: string[];
};

export type MessageType = {
    id: string;
    message: string;
    author: "bot" | "user";
    isFetching?: boolean;
    status?: BotMessageStatus;
    statusLogList?: StatusLogType[];
    rtl?: boolean;
};

export interface SendMessageType {
    sessionId: string;
    setSessionId: React.Dispatch<React.SetStateAction<string>>;
    input: string;
    messages: MessageType[];
    setMessages: React.Dispatch<React.SetStateAction<MessageType[]>>;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    setIsInputDisabled: React.Dispatch<React.SetStateAction<boolean>>;
    moreAddedAgents?: string[];
    fulfillmentPrompt?: string;
    modelEndpointId?: string;
    reasoningMode: string;
    environment: Environment;
    botId: string;
    contextVariables?: contextVariables;
}

type contextVariable = {
    key: string;
    value: string;
};

export type contextVariables = contextVariable[];

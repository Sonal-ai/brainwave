import { contextVariables, MessageType } from "../types";

export interface ChatBotConfiguration {
    id?: string;
    companyId?: string;
    name: string;
    logoUrl: string;
    primaryColor: string;
    introductoryMessage: string;
    secondaryColor: string;
    chatPluginIds: string[];
    modelEndpointId: string;
    inputPlaceholder: string;
    fulfillmentPrompt: string;
    reasoningMode: string;
}

export interface ChatMessageProps {
    message: MessageType;
    botConfig: ChatBotConfiguration;
}

export interface ChatInputProps {
    input: string;
    setInput: (input: string) => void;
    isInputDisabled: boolean;
    botConfig: ChatBotConfiguration;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export type Environment = "dev" | "prod";

export interface ReactChatBotProps {
    apiKey: string;
    botId: string;
    environment?: Environment;
    contextVariables?: contextVariables;
}

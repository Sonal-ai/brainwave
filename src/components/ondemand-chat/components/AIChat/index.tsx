import { useEffect, useRef, useState } from "react";

import { useMessage } from "../../hooks/useMessage";
import { BotIcon, Cancel } from "../../lib/constant";
import { getBotConfiguration } from "../api";
import { MessageType } from "../types";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { ChatBotConfiguration, ReactChatBotProps } from "./types";

import "../index.css";

export const OnDemandChatBot: React.FC<ReactChatBotProps> = ({
    environment = "prod",
    apiKey,
    botId,
    contextVariables,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<MessageType[]>([]);
    const [isInputDisabled, setIsInputDisabled] = useState(false);
    const [input, setInput] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [botConfig, setBotConfig] = useState<ChatBotConfiguration>();

    const { sendMessage } = useMessage(apiKey);
    const chatRef = useRef<HTMLDivElement>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim()) return;

        await sendMessage({
            input,
            sessionId,
            setMessages,
            messages,
            setInput,
            setIsInputDisabled,
            setSessionId,
            moreAddedAgents: botConfig?.chatPluginIds,
            fulfillmentPrompt: botConfig?.fulfillmentPrompt,
            modelEndpointId: botConfig?.modelEndpointId,
            reasoningMode: botConfig?.reasoningMode ?? "low",
            environment,
            botId,
            contextVariables,
        });
        setInput("");
    };

    const handleClickOutside = (event: MouseEvent) => {
        if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        const fetchBotConfiguration = async () => {
            const config = (await getBotConfiguration(
                apiKey,
                botId,
                environment
            )) as ChatBotConfiguration;
            setBotConfig(config);
            if (messages.length === 0) {
                setMessages([
                    {
                        message: config.introductoryMessage,
                        author: "bot",
                        isFetching: false,
                        id: Date.now().toString(),
                        status: "complete",
                    },
                ]);
            }
        };
        fetchBotConfiguration();
    }, []);

    useEffect(() => {
        if (!isOpen) {
            document.body.style.overflow = "";
            document.removeEventListener("mousedown", handleClickOutside);
            return;
        }

        document.body.style.overflow = "hidden";
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.body.style.overflow = "";
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    if (!botConfig) return null;

    return (
        <div className="ai-chat-container">
            {!isOpen ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="help-button"
                    style={{
                        background: botConfig.primaryColor,
                        color: botConfig.secondaryColor,
                    }}
                >
                    <BotIcon color={botConfig.secondaryColor} />
                </button>
            ) : (
                <div ref={chatRef} className="chat-window">
                    <div
                        className="chat-header"
                        style={{ background: botConfig.primaryColor }}
                    >
                        <img
                            src={botConfig.logoUrl}
                            style={{ height: "2rem", paddingLeft: "0.5rem" }}
                            alt="Bot Logo"
                        />
                        <button onClick={() => setIsOpen(false)} className="cancel">
                            <Cancel color={botConfig.secondaryColor} />
                        </button>
                    </div>

                    <div className="messages-container">
                        {messages.map((message) => (
                            <ChatMessage
                                key={message.id}
                                message={message}
                                botConfig={botConfig}
                            />
                        ))}
                    </div>

                    <ChatInput
                        input={input}
                        setInput={setInput}
                        isInputDisabled={isInputDisabled}
                        botConfig={botConfig}
                        onSubmit={handleSubmit}
                    />
                </div>
            )}
        </div>
    );
};

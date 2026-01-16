import React, { useEffect, useRef } from "react";
import Markdown from "markdown-to-jsx";
import { ChatMessageProps } from "./types";

export const ChatMessage: React.FC<ChatMessageProps> = ({
    message,
    botConfig,
}) => {
    const messageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messageRef.current) {
            messageRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [message]);

    return (
        <div
            ref={messageRef}
            className={`message-wrapper ${message.author === "user" ? "user" : "ai"}`}
        >
            <div
                className={`message ${message.author === "user" ? "user" : "ai"} `}
                style={{
                    background:
                        message.author === "user" ? botConfig.primaryColor : "primaryColor",
                    color: message.author === "user" ? botConfig.secondaryColor : "",
                }}
            >
                {message.isFetching && <div className="loader"></div>}
                <Markdown className={message.status === "loading" ? "shine" : ""}>
                    {message.message}
                </Markdown>
            </div>
        </div>
    );
};

import React from "react";
import { ChatInputProps } from "./types";
import { HorizontalIcon } from "../../lib/constant";

export const ChatInput: React.FC<ChatInputProps> = ({
    input,
    setInput,
    isInputDisabled,
    botConfig,
    onSubmit,
}) => (
    <div className="chat-input-container">
        <form onSubmit={onSubmit} className="chat-form">
            <input
                type="text"
                value={input}
                disabled={isInputDisabled}
                onChange={(e) => setInput(e.target.value)}
                placeholder={botConfig.inputPlaceholder}
                className="chat-input"
            />
            <button
                type="submit"
                disabled={isInputDisabled || !input.trim()}
                className="send-button"
                style={{ background: botConfig.primaryColor }}
            >
                <HorizontalIcon color={botConfig.secondaryColor} />
            </button>
        </form>
    </div>
);

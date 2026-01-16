import { Environment } from "../components/AIChat/types";
import { MessageType } from "../components/types";
import { DEV_BASE_URL, PROD_BASE_URL } from "./constant";

export const addMessage = (
    setMessages: React.Dispatch<React.SetStateAction<MessageType[]>>,
    message: Partial<MessageType>
) => {
    setMessages((prev) => [
        ...prev,
        {
            message: "",
            isFetching: false,
            id: Date.now().toString(),
            author: "bot",
            status: "loading",
            ...message,
        },
    ]);
};

export const updateLastMessage = (
    setMessages: React.Dispatch<React.SetStateAction<MessageType[]>>,
    update: Partial<MessageType> | ((prev: MessageType) => Partial<MessageType>)
) => {
    setMessages((prev) => [
        ...prev.slice(0, -1),
        {
            ...prev[prev.length - 1],
            ...(typeof update === "function"
                ? update(prev[prev.length - 1])
                : update),
        },
    ]);
};

export const getBaseurl = (environment: Environment) => {
    if (environment === "dev") return DEV_BASE_URL;
    else return PROD_BASE_URL;
};

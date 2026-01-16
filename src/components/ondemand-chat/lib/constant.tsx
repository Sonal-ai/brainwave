export const DEV_BASE_URL = "https://gateway-dev.on-demand.io";
export const PROD_BASE_URL = "https://api.on-demand.io";
export const DEFAULT_AI_MODEL = "predefined-openai-gpt4o";

type IconTypeProps = {
    color?: string;
};
export const HorizontalIcon = ({ color }: IconTypeProps) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-send-horizontal"
        >
            <path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z" />
            <path d="M6 12h16" />
        </svg>
    );
};

export const Cancel = ({ color }: IconTypeProps) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-circle-x"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6" />
            <path d="m9 9 6 6" />
        </svg>
    );
};

export const BotIcon = ({ color }: IconTypeProps) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-bot"
        >
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
        </svg>
    );
};

export const hexToRgb = (hex: string) => {
    hex = hex.replace(/^#/, "");
    let bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;
    return `${r}, ${g}, ${b}`;
};

export const eventToMessageMapping: Record<string, string> = {
    "Analyzing the prompt...": "We're carefully reviewing your request.",
    "Re-analyzing the prompt...":
        "Checking again to ensure everything is accurate!",
    "Analysis failed":
        "We couldn't process your request. Please try again with more details.",
    "Execution plan created": "We've mapped out the next steps for you.",
    "Retrieved the agents": "We've found the right tools to assist you.",
    "Executing the agents...": "Processing your request now...",
    "Agents execution completed": "All done! Here's what we found for you.",
    "Agents execution failed":
        "We ran into an issue while working on your request. Please try again.",
    "Execution log created":
        "Your request details have been recorded for reference.",
    "Fulfilling the prompt...":
        "Almost there! We're putting everything together.",
    "Fulfillment completed": "Success! Your request has been completed.",
    "Fulfillment failed":
        "We hit a snag while finishing up. Please try again or reach out for help.",
};

'use client';

import React from 'react';
import { OnDemandChatBot } from "./ondemand-chat";
import { useAuth0 } from '@auth0/auth0-react';

const AIChatbot = () => {
    const { user } = useAuth0();

    const contextVariables = [
        { key: "name", value: user?.name || "User" },
        { key: "email", value: user?.email || "anonymous@example.com" },
    ];

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <OnDemandChatBot
                apiKey="bFOOFKIcKN0bX6llErS1uX5JicrsJVdF"
                botId="6969fd7c8b00a652c700df6d"
                contextVariables={contextVariables}
            />
        </div>
    );
};

export default AIChatbot;

"use client";

import { Auth0Provider } from "@auth0/auth0-react";
import React from "react";

interface Auth0ProviderWithNavigateProps {
    children: React.ReactNode;
}

export const Auth0ProviderWithNavigate = ({
    children,
}: Auth0ProviderWithNavigateProps) => {
    const domain = "dev-xam03klmexpb7bbk.us.auth0.com";
    const clientId = "pPEu2P5sb7fGG274k6S1BFU5uuG1YRrz";

    const onRedirectCallback = (appState: any) => {
        window.history.replaceState(
            {},
            document.title,
            appState?.returnTo || window.location.pathname
        );
    };

    if (!(domain && clientId)) {
        return null;
    }

    return (
        <Auth0Provider
            domain={domain}
            clientId={clientId}
            authorizationParams={{
                redirect_uri: typeof window !== "undefined" ? window.location.origin : undefined,
            }}
            onRedirectCallback={onRedirectCallback}
        >
            {children}
        </Auth0Provider>
    );
};

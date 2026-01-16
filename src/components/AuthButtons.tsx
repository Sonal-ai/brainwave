"use client";

import { useAuth0 } from "@auth0/auth0-react";
import React from "react";

export const LoginButton = ({ className }: { className?: string }) => {
    const { loginWithRedirect } = useAuth0();

    return (
        <button className={className} onClick={() => loginWithRedirect()}>
            Log In
        </button>
    );
};

export const SignupButton = ({ className }: { className?: string }) => {
    const { loginWithRedirect } = useAuth0();

    return (
        <button
            className={className}
            onClick={() =>
                loginWithRedirect({
                    authorizationParams: {
                        screen_hint: "signup",
                    },
                })
            }
        >
            Get Started
        </button>
    );
};

export const LogoutButton = ({ className }: { className?: string }) => {
    const { logout } = useAuth0();

    return (
        <button
            className={className}
            onClick={() =>
                logout({
                    logoutParams: {
                        returnTo: window.location.origin,
                    },
                })
            }
        >
            Log Out
        </button>
    );
};

export const AuthButtons = ({ styles }: { styles: any }) => {
    const { isAuthenticated, user } = useAuth0();

    if (isAuthenticated) {
        return (
            <>
                {user?.email && <span style={{ marginRight: '1rem', color: 'var(--foreground)' }}>{user.email}</span>}
                <a href="/dashboard" style={{ marginRight: '1rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>Dashboard</a>
                <LogoutButton className={`${styles.button} ${styles.buttonSecondary}`} />
            </>
        );
    }

    return (
        <>
            <LoginButton className={`${styles.button} ${styles.buttonSecondary}`} />
            <SignupButton className={`${styles.button} ${styles.buttonPrimary}`} />
        </>
    );
};

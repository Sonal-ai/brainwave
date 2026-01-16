"use client";

import Sidebar from '@/components/Sidebar/Sidebar';
import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isAuthenticated } = useAuth0();

    useEffect(() => {
        if (isAuthenticated && user?.email) {
            // Sync user to backend DB
            fetch('/api/auth/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    name: user.name
                })
            }).catch(err => console.error("Auth sync failed", err));
        }
    }, [isAuthenticated, user]);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <Sidebar />
            <div style={{
                flex: 1,
                marginLeft: '260px',
                padding: '32px',
                maxWidth: 'calc(100vw - 260px)'
            }}>
                {children}
            </div>
        </div>
    );
}

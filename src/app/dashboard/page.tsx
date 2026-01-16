'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            router.push('/login');
        } else {
            setUser(JSON.parse(storedUser));
        }
    }, [router]);

    if (!user) return null;

    const quickStats = [
        { label: 'Current Semester', value: '6th' },
        { label: 'Files Tracked', value: '12' },
        { label: 'Pending Tasks', value: '3' },
    ];

    return (
        <div style={{ animation: 'fadeUp 0.6s ease-out' }}>
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>
                    Hello, <span style={{ color: 'var(--accent-primary)' }}>{user.name}</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                    Your academic intelligence center is active.
                </p>
            </header>

            {/* Quick Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '24px',
                marginBottom: '40px'
            }}>
                {quickStats.map((stat) => (
                    <div key={stat.label} style={{
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '24px',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                            {stat.label}
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            {stat.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: '24px'
            }}>
                {/* Recent Activity */}
                <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    minHeight: '300px'
                }}>
                    <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Recent Activity</h2>
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No recent activity detected. Upload a file to get started.
                    </div>
                </div>

                {/* Quick Actions or Notifications */}
                <div style={{
                    background: 'rgba(59, 130, 246, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.1)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                }}>
                    <h2 style={{ fontSize: '18px', marginBottom: '20px', color: 'var(--accent-primary)' }}>
                        System Status
                    </h2>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                            <span style={{ width: 8, height: 8, background: 'var(--success)', borderRadius: '50%' }}></span>
                            File Intelligence: Active
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                            <span style={{ width: 8, height: 8, background: 'var(--success)', borderRadius: '50%' }}></span>
                            Chatbot: Ready
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                            <span style={{ width: 8, height: 8, background: 'var(--warning)', borderRadius: '50%' }}></span>
                            Community: Syncing...
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SubjectsPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [subjects, setSubjects] = useState<string[]>([]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            router.push('/login');
        } else {
            const u = JSON.parse(storedUser);
            setUser(u);
            setSubjects(u.subjects || []);
            // Optional: Fetch fresh from API to be sure
            fetch(`/api/files?username=${u.username}`)
                .then(res => res.json())
                .then(data => setSubjects(data.subjects || []));
        }
    }, [router]);

    if (!user) return null;

    return (
        <div style={{ animation: 'fadeUp 0.6s ease-out' }}>
            <header style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>My Subjects</h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Academics detected from your timetable.
                </p>
            </header>

            {subjects.length === 0 ? (
                <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--glass-border)'
                }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No Subjects Active</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                        Upload your timetable in the <b>My Files</b> section to automatically extract your subjects.
                    </p>
                    <button
                        onClick={() => router.push('/dashboard/files')}
                        style={{
                            padding: '12px 24px',
                            background: 'var(--accent-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-full)',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        Go to Upload
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                    {subjects.map((subject, idx) => (
                        <div key={idx} style={{
                            background: 'var(--bg-secondary)',
                            padding: '24px',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--glass-border)',
                            transition: 'transform 0.2s',
                            cursor: 'default'
                        }}>
                            <div style={{
                                width: '48px', height: '48px',
                                background: 'rgba(139, 92, 246, 0.1)',
                                color: 'var(--accent-primary)',
                                borderRadius: '12px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '16px'
                            }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{subject}</h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Active Semester
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

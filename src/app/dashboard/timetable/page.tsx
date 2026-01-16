'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ClassSession {
    day: string;
    startTime: string;
    endTime: string;
    subject: string;
    location: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function TimetablePage() {
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

    // Flatten and Group by Day
    const groupedSchedule: Record<string, ClassSession[]> = {};
    let totalClasses = 0;

    // Initialize days
    DAYS.forEach(day => groupedSchedule[day] = []);

    // Transform Subject-centric -> Day-centric
    if (user.timetable?.subjects) {
        user.timetable.subjects.forEach((subj: any) => {
            if (subj.classes) {
                subj.classes.forEach((cls: any) => {
                    const d = cls.day;
                    // Simple day matching
                    const dayKey = DAYS.find(day => day.toLowerCase() === d.toLowerCase()) || "Other";
                    if (groupedSchedule[dayKey]) {
                        groupedSchedule[dayKey].push({
                            day: d,
                            startTime: cls.start_time,
                            endTime: cls.end_time,
                            subject: subj.name,
                            location: cls.location || 'TBA'
                        });
                        totalClasses++;
                    }
                });
            }
        });
    }

    // Sort each day
    Object.keys(groupedSchedule).forEach(day => {
        groupedSchedule[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return (
        <div style={{ animation: 'fadeUp 0.6s ease-out' }}>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Timetable Management</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Upload your timetable to automatically track classes and get reminders.
                    </p>
                </div>
                <button
                    onClick={() => router.push('/dashboard/files')}
                    style={{
                        padding: '10px 20px',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '14px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Update / Upload Timetable
                </button>
            </header>

            <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '32px'
            }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Your Weekly Schedule</h2>

                {totalClasses === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No classes found. Upload a timetable to get started.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {DAYS.map(day => {
                            const classes = groupedSchedule[day];
                            if (!classes || classes.length === 0) return null;

                            return (
                                <div key={day}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px',
                                        color: 'var(--text-primary)', fontWeight: 600
                                    }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                        {day}
                                        <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {classes.map((cls, idx) => (
                                            <div key={idx} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '16px',
                                                background: 'var(--bg-primary)',
                                                border: '1px solid var(--glass-border)',
                                                borderRadius: 'var(--radius-md)',
                                                transition: 'transform 0.2s',
                                                cursor: 'default'
                                            }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                                                    <div style={{ width: '120px', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                        {cls.startTime} - {cls.endTime}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '16px' }}>{cls.subject}</div>
                                                    </div>
                                                </div>
                                                <div style={{
                                                    padding: '4px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)',
                                                    fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)'
                                                }}>
                                                    {cls.location}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { STATIC_SUBJECTS } from '@/lib/constants';

export default function TimetablePage() {
    const router = useRouter();
    const { user: auth0User, isAuthenticated } = useAuth0();

    // Hardcoded data from db.json for shdra06@gmail.com
    const STATIC_DATA = {
        "subjects": [
            {
                "name": "COMPUTER AIDED ENGINEERING GRAPHICS-2",
                "classes": [
                    { "day": "MON", "start_time": "09:00", "end_time": "10:00", "location": "LAB", "subject": "COMPUTER AIDED ENGINEERING GRAPHICS-2" },
                    { "day": "MON", "start_time": "11:00", "end_time": "12:00", "location": "", "subject": "COMPUTER AIDED ENGINEERING GRAPHICS-2" },
                    { "day": "WED", "start_time": "11:00", "end_time": "12:00", "location": "", "subject": "COMPUTER AIDED ENGINEERING GRAPHICS-2" }
                ]
            },
            {
                "name": "BASIC ELECTRONICS & COMMUNICATION ENGINEERING",
                "classes": [
                    { "day": "MON", "start_time": "12:00", "end_time": "13:00", "location": "", "subject": "BASIC ELECTRONICS & COMMUNICATION ENGINEERING" },
                    { "day": "THU", "start_time": "11:00", "end_time": "12:00", "location": "", "subject": "BASIC ELECTRONICS & COMMUNICATION ENGINEERING" },
                    { "day": "THU", "start_time": "16:00", "end_time": "17:00", "location": "LAB", "subject": "BASIC ELECTRONICS & COMMUNICATION ENGINEERING" }
                ]
            },
            {
                "name": "PROGRAMMING FUNDAMENTALS",
                "classes": [
                    { "day": "MON", "start_time": "13:00", "end_time": "14:00", "location": "", "subject": "PROGRAMMING FUNDAMENTALS" },
                    { "day": "FRI", "start_time": "13:00", "end_time": "14:00", "location": "", "subject": "PROGRAMMING FUNDAMENTALS" },
                    { "day": "FRI", "start_time": "14:00", "end_time": "15:00", "location": "LAB", "subject": "PROGRAMMING FUNDAMENTALS" }
                ]
            },
            {
                "name": "AS SELECTED",
                "classes": [
                    { "day": "TUE", "start_time": "08:00", "end_time": "09:00", "location": "", "subject": "AS SELECTED" },
                    { "day": "THU", "start_time": "08:00", "end_time": "09:00", "location": "", "subject": "AS SELECTED" }
                ]
            },
            {
                "name": "MATHEMATICS-I",
                "classes": [
                    { "day": "TUE", "start_time": "12:00", "end_time": "13:00", "location": "PB-GF6", "subject": "MATHEMATICS-I" },
                    { "day": "TUE", "start_time": "13:00", "end_time": "14:00", "location": "PB-GF6", "subject": "MATHEMATICS-I" },
                    { "day": "WED", "start_time": "09:00", "end_time": "10:00", "location": "", "subject": "MATHEMATICS-I" },
                    { "day": "WED", "start_time": "15:00", "end_time": "16:00", "location": "PB-GF6", "subject": "MATHEMATICS-I" }
                ]
            },
            {
                "name": "WEB DESIGNING",
                "classes": [
                    { "day": "TUE", "start_time": "14:00", "end_time": "15:00", "location": "CS103", "subject": "WEB DESIGNING" },
                    { "day": "THU", "start_time": "14:00", "end_time": "15:00", "location": "CS-103", "subject": "WEB DESIGNING" }
                ]
            }
        ]
    };

    const [scheduleData, setScheduleData] = useState<any>(STATIC_DATA);

    useEffect(() => {
        if (isAuthenticated && auth0User?.email) {
            // Attempt to fetch fresh data to see if there's a new parsed timetable
            fetch('/api/auth/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: auth0User.email,
                    name: auth0User.name
                })
            })
                .then(r => r.json())
                .then(data => {
                    // If user has a timetable in DB, use THAT instead of static
                    if (data.user && data.user.timetable && data.user.timetable.subjects && data.user.timetable.subjects.length > 0) {
                        console.log("Loaded Dynamic Timetable from DB");
                        setScheduleData(data.user.timetable);
                    }
                })
                .catch(e => console.error("Background sync failed", e));
        }
    }, [isAuthenticated, auth0User]);

    // Flatten data for table view
    const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const allSessions: any[] = [];

    if (scheduleData && scheduleData.subjects) {
        scheduleData.subjects.forEach((subj: any) => {
            if (subj.classes) {
                subj.classes.forEach((cls: any) => {
                    allSessions.push({ ...cls, subjectName: subj.name });
                });
            }
        });
    }

    // Helper to get sessions for a day
    const getSessionsForDay = (day: string) => {
        return allSessions
            .filter(s => s.day && s.day.toUpperCase().startsWith(day.substring(0, 3))) // robust match
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
    };

    return (
        <div style={{ animation: 'fadeUp 0.6s ease-out', padding: '20px' }}>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Timetable</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Weekly Schedule</p>
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
                    Files
                </button>
            </header>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--glass-border)', textAlign: 'left' }}>
                            <th style={{ padding: '12px' }}>Day</th>
                            <th style={{ padding: '12px' }}>Time</th>
                            <th style={{ padding: '12px' }}>Subject</th>
                            <th style={{ padding: '12px' }}>Location</th>
                        </tr>
                    </thead>
                    <tbody>
                        {DAYS.map(day => {
                            const sessions = getSessionsForDay(day);
                            if (sessions.length === 0) return null;
                            return (
                                <React.Fragment key={day}>
                                    {sessions.map((session, idx) => (
                                        <tr key={`${day}-${idx}`} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{idx === 0 ? day : ''}</td>
                                            <td style={{ padding: '12px' }}>{session.start_time} - {session.end_time}</td>
                                            <td style={{ padding: '12px' }}>{session.subjectName}</td>
                                            <td style={{ padding: '12px' }}>{session.location || '-'}</td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

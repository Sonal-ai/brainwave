'use client';

import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export default function PlannerPage() {
    const { user, isAuthenticated } = useAuth0();
    const [plan, setPlan] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Copy of Static Data (from timetable page) to ensure stability
    const STATIC_TIMETABLE_DATA = {
        "subjects": [
            {
                "name": "COMPUTER AIDED ENGINEERING GRAPHICS-2",
                "classes": [
                    { "day": "MON", "start_time": "09:00", "end_time": "10:00", "location": "LAB" },
                    { "day": "MON", "start_time": "11:00", "end_time": "12:00", "location": "" },
                    { "day": "WED", "start_time": "11:00", "end_time": "12:00", "location": "" }
                ]
            },
            {
                "name": "BASIC ELECTRONICS & COMMUNICATION ENGINEERING",
                "classes": [
                    { "day": "MON", "start_time": "12:00", "end_time": "13:00", "location": "" },
                    { "day": "THU", "start_time": "11:00", "end_time": "12:00", "location": "" },
                    { "day": "THU", "start_time": "16:00", "end_time": "17:00", "location": "LAB" }
                ]
            },
            {
                "name": "PROGRAMMING FUNDAMENTALS",
                "classes": [
                    { "day": "MON", "start_time": "13:00", "end_time": "14:00", "location": "" },
                    { "day": "FRI", "start_time": "13:00", "end_time": "14:00", "location": "" },
                    { "day": "FRI", "start_time": "14:00", "end_time": "15:00", "location": "LAB" }
                ]
            },
            {
                "name": "AS SELECTED",
                "classes": [
                    { "day": "TUE", "start_time": "08:00", "end_time": "09:00", "location": "" },
                    { "day": "THU", "start_time": "08:00", "end_time": "09:00", "location": "" }
                ]
            },
            {
                "name": "MATHEMATICS-I",
                "classes": [
                    { "day": "TUE", "start_time": "12:00", "end_time": "13:00", "location": "PB-GF6" },
                    { "day": "TUE", "start_time": "13:00", "end_time": "14:00", "location": "PB-GF6" },
                    { "day": "WED", "start_time": "09:00", "end_time": "10:00", "location": "" },
                    { "day": "WED", "start_time": "15:00", "end_time": "16:00", "location": "PB-GF6" }
                ]
            },
            {
                "name": "WEB DESIGNING",
                "classes": [
                    { "day": "TUE", "start_time": "14:00", "end_time": "15:00", "location": "CS103" },
                    { "day": "THU", "start_time": "14:00", "end_time": "15:00", "location": "CS-103" }
                ]
            }
        ]
    };

    const generateDailyPlan = async () => {
        setLoading(true);
        setError('');
        setPlan(null);

        try {
            // 1. Get Today's Timetable
            const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
            const currentDay = days[new Date().getDay()]; // e.g., "FRI"
            // For demo purposes, if it's Sunday/Sat, maybe mock strictly to Monday or Keep accurate?
            // Let's keep accurate but maybe fallback to MON for demo if empty? 
            // The prompt says "Generate a realistic plan", ideally for TODAY.

            const todayClasses: any[] = [];

            STATIC_TIMETABLE_DATA.subjects.forEach(sub => {
                sub.classes.forEach(cls => {
                    if (cls.day.toUpperCase() === currentDay) {
                        todayClasses.push({
                            subject: sub.name,
                            start: cls.start_time,
                            end: cls.end_time
                        });
                    }
                });
            });

            // 2. Get Low Attendance Subjects from LocalStorage
            const attData = JSON.parse(localStorage.getItem('attendance_data') || '{}');
            const lowAttendanceSubjects: string[] = [];

            Object.keys(attData).forEach(sub => {
                const { attended, total } = attData[sub];
                if (total > 0 && (attended / total) < 0.75) {
                    lowAttendanceSubjects.push(sub);
                }
            });

            // 3. Call API with Updated Structure
            const res = await fetch('/api/planner/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    daystart: "07:00",
                    dayend: "23:00",
                    today_timetable: todayClasses,
                    lowprioritysubjects: [], // Can filter later if needed
                    highprioritysubjects: lowAttendanceSubjects
                })
            });

            const data = await res.json();

            if (res.ok) {
                setPlan(data);
            } else {
                setError(data.error || "Failed to generate plan");
            }

        } catch (e: any) {
            setError(e.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const getTypeColor = (type: string) => {
        // Handle both new 'category' and potential old 'type' for robustness
        const t = type?.toUpperCase() || '';
        if (t.includes('CLASS')) return '#3b82f6'; // Blue
        if (t.includes('STUDY')) return '#f59e0b'; // Orange
        if (t.includes('BREAK')) return '#10b981'; // Green
        if (t.includes('REST')) return '#6b7280'; // Gray
        if (t.includes('PERSONAL')) return '#8b5cf6'; // Purple
        return 'var(--text-secondary)';
    };

    return (
        <div style={{ animation: 'fadeUp 0.6s ease-out', maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
            <header style={{ marginBottom: '32px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
                    Daily Planner <span style={{ fontSize: '24px' }}>🗓️</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    AI-generated schedule based on your classes & weak spots.
                </p>

                <button
                    onClick={generateDailyPlan}
                    disabled={loading}
                    style={{
                        marginTop: '24px',
                        padding: '16px 32px',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: 'white', border: 'none', borderRadius: '16px',
                        fontSize: '18px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer',
                        boxShadow: '0 8px 20px rgba(245, 158, 11, 0.3)',
                        transition: 'transform 0.2s',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? 'Thinking... 🧠' : 'Generate Today\'s Plan ✨'}
                </button>
            </header>

            {error && (
                <div style={{
                    padding: '16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '24px', textAlign: 'center'
                }}>
                    {error}
                </div>
            )}

            {plan && (
                <div style={{ animation: 'fadeUp 0.5s ease-out' }}>
                    {/* Summary Card */}
                    <div style={{
                        background: 'var(--bg-secondary)', padding: '24px', borderRadius: '20px',
                        marginBottom: '32px', border: '1px solid var(--glass-border)',
                        textAlign: 'center'
                    }}>
                        <h2 style={{ fontSize: '20px', marginBottom: '8px', fontWeight: 'bold' }}>Strategy for Today</h2>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{plan.summary}</p>

                        {plan.focus_subjects?.length > 0 && (
                            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {plan.focus_subjects.map((sub: string, i: number) => (
                                    <span key={i} style={{
                                        background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b',
                                        padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold'
                                    }}>
                                        🎯 {sub}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Timeline */}
                    <div style={{ position: 'relative', paddingLeft: '20px' }}>
                        {/* Vertical Line */}
                        <div style={{
                            position: 'absolute', left: '0', top: '0', bottom: '0',
                            width: '2px', background: 'var(--glass-border)'
                        }} />

                        {plan.daily_plan.map((item: any, idx: number) => (
                            <div key={idx} style={{
                                marginBottom: '24px', position: 'relative', paddingLeft: '24px'
                            }}>
                                {/* Dot */}
                                <div style={{
                                    position: 'absolute', left: '-5px', top: '16px',
                                    width: '12px', height: '12px', borderRadius: '50%',
                                    background: getTypeColor(item.category || item.type),
                                    boxShadow: `0 0 10px ${getTypeColor(item.category || item.type)}`
                                }} />

                                <div style={{
                                    background: 'var(--bg-secondary)', padding: '16px', borderRadius: '16px',
                                    borderLeft: `4px solid ${getTypeColor(item.category || item.type)}`,
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{item.time}</span>
                                        <span style={{
                                            fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold',
                                            color: getTypeColor(item.category || item.type), background: `${getTypeColor(item.category || item.type)}20`,
                                            padding: '2px 8px', borderRadius: '4px'
                                        }}>
                                            {item.category || item.type}
                                        </span>
                                    </div>
                                    <h3 style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>{item.activity}</h3>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

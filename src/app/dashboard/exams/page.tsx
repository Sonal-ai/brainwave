'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';

export default function ExamsPage() {
    const { user } = useAuth0();
    const router = useRouter();
    const [exams, setExams] = useState<any[]>([]);

    const STATIC_EXAMS = [
        { id: 1, subject: "MATHEMATICS-I", date: "2026-02-15", time: "10:00 AM", type: "Mid-Term", location: "Exam Hall A" },
        { id: 2, subject: "PROGRAMMING FUNDAMENTALS", date: "2026-02-17", time: "02:00 PM", type: "Mid-Term", location: "Lab 3" },
        { id: 3, subject: "WEB DESIGNING", date: "2026-02-20", time: "10:00 AM", type: "Mid-Term", location: "CS Block" },
        { id: 4, subject: "BASIC ELECTRONICS & COMMUNICATION ENG.", date: "2026-02-22", time: "02:00 PM", type: "Mid-Term", location: "Exam Hall B" },
        { id: 5, subject: "COMPUTER AIDED ENGINEERING GRAPHICS-2", date: "2026-02-24", time: "10:00 AM", type: "Mid-Term", location: "Design Lab" },
    ];

    useEffect(() => {
        if (user?.email) {
            fetch('/api/auth/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, name: user.name })
            })
                .then(res => res.json())
                .then(data => {
                    const userSubjects = data.user?.subjects || [];
                    const currentExams = [...STATIC_EXAMS];
                    let nextId = 100;

                    userSubjects.forEach((subj: string) => {
                        const exists = currentExams.some(e => e.subject.toLowerCase() === subj.toLowerCase());
                        if (!exists) {
                            currentExams.push({
                                id: nextId++,
                                subject: subj,
                                date: new Date().toISOString(),
                                time: "TBD",
                                type: "Unscheduled",
                                location: "TBD"
                            });
                        }
                    });

                    setExams(currentExams.sort((a, b) => a.type === 'Unscheduled' ? 1 : -1));
                })
                .catch(e => {
                    console.error("Sync error", e);
                    setExams(STATIC_EXAMS);
                });
        } else {
            setExams(STATIC_EXAMS);
        }
    }, [user]);

    // CGPA State
    const [sgpas, setSgpas] = useState<Record<string, string>>({
        "Sem 1": "", "Sem 2": "", "Sem 3": "", "Sem 4": "", "Sem 5": ""
    });
    const [cgpa, setCgpa] = useState<string>("0.00");

    // Load Saved Data
    useEffect(() => {
        const saved = localStorage.getItem('academic_data');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.sgpas) setSgpas(data.sgpas);
        }
    }, []);

    // Calculate CGPA
    useEffect(() => {
        const values = Object.values(sgpas).map(v => parseFloat(v)).filter(v => !isNaN(v));
        if (values.length > 0) {
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = (sum / values.length).toFixed(2);
            setCgpa(avg);

            // Persist
            localStorage.setItem('academic_data', JSON.stringify({
                sgpas, cgpa: avg
            }));
        } else {
            setCgpa("0.00");
        }
    }, [sgpas]);

    const handleSgpaChange = (sem: string, value: string) => {
        if (parseFloat(value) < 0 || parseFloat(value) > 10) return; // Basic validation
        setSgpas(prev => ({ ...prev, [sem]: value }));
    };

    return (
        <div style={{ animation: 'fadeUp 0.6s ease-out', padding: '20px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>

            {/* Left Column: Exam Schedule */}
            <div>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Exam Schedule</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Upcoming assessments and locations.</p>

                <div style={{ display: 'grid', gap: '24px' }}>
                    {exams.map(exam => (
                        <div key={exam.id} style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '16px',
                            padding: '24px',
                            position: 'relative',
                            overflow: 'hidden',
                            display: 'flex', gap: '24px', alignItems: 'center'
                        }}>
                            <div style={{
                                position: 'absolute', top: 0, left: 0, width: '4px', height: '100%',
                                background: exam.type === 'Mid-Term' ? 'var(--warning)' : 'var(--error)'
                            }}></div>

                            <div style={{
                                width: '60px', height: '60px', borderRadius: '12px', background: 'var(--bg-tertiary)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{new Date(exam.date).getDate()}</span>
                                <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>{new Date(exam.date).toLocaleString('default', { month: 'short' })}</span>
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{
                                    display: 'inline-block', padding: '4px 8px', borderRadius: '4px',
                                    background: 'var(--bg-tertiary)', fontSize: '10px', fontWeight: 'bold',
                                    color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase'
                                }}>
                                    {exam.type}
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', lineHeight: 1.4 }}>
                                    {exam.subject}
                                </h3>
                                <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                    <span>⏰ {exam.time}</span>
                                    <span>📍 {exam.location}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Column: API / CGPA */}
            <div>
                {/* CGPA Calculator */}
                <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '16px',
                    padding: '24px',
                    marginBottom: '24px'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Academic Performance</h2>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Current CGPA</div>
                            <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{cgpa}</div>
                        </div>
                        <div style={{
                            width: '50px', height: '50px', borderRadius: '50%',
                            background: `conic-gradient(var(--accent-primary) ${(parseFloat(cgpa) / 10) * 100}%, var(--bg-tertiary) 0)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <span style={{ fontSize: '12px', background: 'var(--bg-secondary)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {((parseFloat(cgpa) / 10) * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.keys(sgpas).map(sem => (
                            <div key={sem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{sem}</label>
                                <input
                                    type="number"
                                    step="0.01" max="10" min="0"
                                    placeholder="SGPA"
                                    value={sgpas[sem]}
                                    onChange={(e) => handleSgpaChange(sem, e.target.value)}
                                    style={{
                                        width: '80px', padding: '8px', borderRadius: '8px',
                                        border: '1px solid var(--glass-border)', background: 'var(--bg-tertiary)',
                                        color: 'var(--text-primary)', textAlign: 'center'
                                    }}
                                />
                            </div>
                        ))}
                        <button
                            onClick={() => {
                                const nextSem = `Sem ${Object.keys(sgpas).length + 1}`;
                                setSgpas(prev => ({ ...prev, [nextSem]: "" }));
                            }}
                            style={{
                                marginTop: '12px', padding: '10px', borderRadius: '8px', border: '1px dashed var(--glass-border)',
                                background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px'
                            }}
                        >
                            + Add Semester
                        </button>
                    </div>
                </div>

                {/* AI Advice Card */}
                <div
                    onClick={() => router.push('/dashboard/chat')}
                    style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
                        borderRadius: '16px',
                        padding: '24px',
                        color: 'white',
                        cursor: 'pointer',
                        boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)'
                    }}
                >
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Need Advice?</h2>
                    <p style={{ fontSize: '13px', opacity: 0.9, marginBottom: '16px', lineHeight: 1.5 }}>
                        Ask AI to analyze your attendance & grades to suggest a study plan.
                    </p>
                    <button style={{
                        background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none',
                        padding: '8px 16px', borderRadius: '20px', fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                        backdropFilter: 'blur(5px)'
                    }}>
                        Get Recommendations
                    </button>
                </div>
            </div>
        </div>
    );
}

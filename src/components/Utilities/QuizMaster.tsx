"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import styles from './QuizMaster.module.css';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

import { STATIC_SUBJECTS } from '@/lib/constants';

export default function QuizMaster() {
    const { user } = useAuth0();
    const [subjects, setSubjects] = useState<string[]>([]);
    const [isFetchingSubjects, setIsFetchingSubjects] = useState(false);
    const [config, setConfig] = useState({
        subject: '',
        difficulty: 'Medium',
        count: 5
    });
    const [isQuizStarted, setIsQuizStarted] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [externalUserId, setExternalUserId] = useState<string | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user?.email) {
            setIsFetchingSubjects(true);
            fetch(`/api/user/profile?email=${user.email}`)
                .then(async res => {
                    if (!res.ok) throw new Error("Profile not found");
                    return res.json();
                })
                .then(data => {
                    if (data.subjects) {
                        const userSubjects = data.subjects.length > 0 ? data.subjects : STATIC_SUBJECTS;
                        setSubjects(userSubjects);
                        if (userSubjects.length > 0) {
                            setConfig(prev => ({ ...prev, subject: userSubjects[0] }));
                        }
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch subjects, using defaults", err);
                    setSubjects(STATIC_SUBJECTS);
                    setConfig(prev => ({ ...prev, subject: STATIC_SUBJECTS[0] }));
                })
                .finally(() => {
                    setIsFetchingSubjects(false);
                });
        }
    }, [user?.email]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleStartQuiz = async () => {
        setIsLoading(true);
        setIsQuizStarted(true);

        try {
            const response = await fetch('/api/quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...config
                })
            });

            const data = await response.json();
            if (data.answer) {
                setMessages([{ role: 'assistant', content: data.answer }]);
                setSessionId(data.sessionId);
                setExternalUserId(data.externalUserId);
            }
        } catch (error) {
            console.error("Failed to start quiz", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMsg = inputValue.trim();
        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: userMsg,
                    sessionId,
                    externalUserId
                })
            });

            const data = await response.json();
            if (data.answer) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
            }
        } catch (error) {
            console.error("Failed to send message", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isQuizStarted) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2>Quiz Master</h2>
                    <p>Test your knowledge with an interactive AI-powered quiz.</p>
                </div>

                <div className={styles.setupCard}>
                    <div className={styles.formGroup}>
                        <label>Select Subject</label>
                        <select
                            value={config.subject}
                            onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                            disabled={isFetchingSubjects}
                        >
                            {isFetchingSubjects ? (
                                <option value="" disabled>Loading subjects...</option>
                            ) : subjects.length > 0 ? (
                                subjects.map(s => <option key={s} value={s}>{s}</option>)
                            ) : (
                                <option value="" disabled>No subjects found</option>
                            )}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Difficulty</label>
                        <select
                            value={config.difficulty}
                            onChange={(e) => setConfig({ ...config, difficulty: e.target.value })}
                        >
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Number of Questions (Max 20)</label>
                        <input
                            type="number"
                            min="1"
                            max="20"
                            value={config.count}
                            onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) || 1 })}
                        />
                    </div>

                    <button
                        className={styles.startBtn}
                        onClick={handleStartQuiz}
                        disabled={!config.subject || isLoading}
                    >
                        {isLoading ? 'Wait...' : 'Start Quiz'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.quizContainer}>
            <div className={styles.quizHeader}>
                <h3>Quiz Master: {config.subject}</h3>
                <button className={styles.endBtn} onClick={() => setIsQuizStarted(false)}>End Quiz</button>
            </div>

            <div className={styles.chatArea}>
                {messages.map((m, i) => (
                    <div key={i} className={`${styles.message} ${m.role === 'user' ? styles.userMessage : styles.botMessage}`}>
                        <div className={styles.bubble}>
                            {m.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className={styles.loadingMessage}>
                        <div className={styles.typingDot}></div>
                        <div className={styles.typingDot}></div>
                        <div className={styles.typingDot}></div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <form className={styles.inputArea} onSubmit={handleSendMessage}>
                <input
                    type="text"
                    placeholder="Type your answer here..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading || !inputValue.trim()}>Send</button>
            </form>
        </div>
    );
}

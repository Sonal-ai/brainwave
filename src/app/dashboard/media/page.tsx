'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './media.module.css';
import {
    uploadMedia,
    fetchTranscript,
    createChatSession,
    queryChatWithTranscript
} from '@/actions/ondemand';

interface ChatMessage {
    id: string;
    query: string;
    answer: string;
    timestamp: string;
}

export default function MediaPage() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Chat State
    const [transcript, setTranscript] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isAsking, setIsAsking] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleAnalyze = async () => {
        if (!url) return;
        setLoading(true); setError(null); setResult(null);

        try {
            const response = await uploadMedia(url);
            if (response.success) {
                setResult(response.data);
                // Automatically check if processing is done (since it's sync)
                if (response.data.data.actionStatus === 'completed' && response.data.data.extractedTextUrl) {
                    await handleFetchTranscript(response.data.data.extractedTextUrl);
                }
            } else {
                setError(response.error);
            }
        } catch (err) {
            setError('An unexpected error occurred.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFetchTranscript = async (txtUrl: string) => {
        const res = await fetchTranscript(txtUrl);
        if (res.success && res.text) {
            setTranscript(res.text);
            // Initialize chat session immediately
            const sessionRes = await createChatSession();
            if (sessionRes.success && sessionRes.sessionId) {
                setSessionId(sessionRes.sessionId);
                // Add welcome message
                setMessages([{
                    id: 'welcome',
                    query: '',
                    answer: '✅ Transcript loaded successfully! You can now ask questions about the video content. I\'ll maintain context throughout our conversation.',
                    timestamp: new Date().toISOString()
                }]);
            }
        } else {
            setError("Failed to fetch transcript: " + res.error);
        }
    };

    const handleAskQuestion = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!sessionId || !transcript || !question.trim()) return;

        const currentQuestion = question.trim();
        setQuestion(''); // Clear input immediately
        setIsAsking(true);
        setError(null);

        // Add user message to chat
        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            query: currentQuestion,
            answer: '',
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);

        try {
            const res = await queryChatWithTranscript(sessionId, transcript, currentQuestion);
            if (res.success && res.answer) {
                // Add bot response
                setMessages(prev => [
                    ...prev.slice(0, -1), // Remove temp user message
                    {
                        ...userMessage,
                        answer: res.answer
                    }
                ]);
            } else {
                setError(res.error || 'Failed to get response');
                setMessages(prev => prev.slice(0, -1)); // Remove failed message
            }
        } catch (e: any) {
            setError(e.message);
            setMessages(prev => prev.slice(0, -1)); // Remove failed message
        } finally {
            setIsAsking(false);
        }
    };

    const handleNewVideo = () => {
        // Add separator message to chat history
        if (messages.length > 0) {
            setMessages(prev => [...prev, {
                id: `separator-${Date.now()}`,
                query: '',
                answer: '─────────────────────────────────\n📹 New Video Analysis Session\n─────────────────────────────────',
                timestamp: new Date().toISOString()
            }]);
        }

        // Reset video-related state but keep messages
        setUrl('');
        setTranscript(null);
        setSessionId(null);
        setResult(null);
        setError(null);
        setQuestion('');
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Media Analysis</h1>
                <p className={styles.subtitle}>Unlock insights from YouTube videos with AI-powered processing.</p>
            </header>

            <div className={styles.card}>
                <div className={styles.inputGroup}>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Paste YouTube Link here..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={!!transcript} // Disable after analysis
                    />
                </div>
                {!transcript && (
                    <button
                        className={styles.button}
                        onClick={handleAnalyze}
                        disabled={loading || !url}
                    >
                        {loading ? 'Analyzing...' : 'Analyze Video'}
                    </button>
                )}

                {loading && !isAsking && (
                    <div className={styles.loader}>
                        <div className={styles.spinner}></div>
                    </div>
                )}

                {error && <div className={styles.error}>{error}</div>}

                {/* Chat Interface */}
                {transcript && sessionId && (
                    <div className={styles.resultArea}>
                        {/* Session Info Bar */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px',
                            padding: '12px',
                            background: 'rgba(74, 222, 128, 0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(74, 222, 128, 0.3)'
                        }}>
                            <div>
                                <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '14px' }}>
                                    💬 Chat Active
                                </div>
                                <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '4px' }}>
                                    Ask questions about the video
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={handleNewVideo}
                                    className={styles.button}
                                    style={{
                                        padding: '8px 16px',
                                        fontSize: '13px',
                                        background: 'rgba(168, 85, 247, 0.2)',
                                        border: '1px solid rgba(168, 85, 247, 0.4)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                    disabled={loading}
                                >
                                    🎬 Analyze New Video
                                </button>
                            </div>
                        </div>

                        {/* Messages Container */}
                        <div
                            ref={chatContainerRef}
                            style={{
                                maxHeight: '500px',
                                overflowY: 'auto',
                                marginBottom: '16px',
                                padding: '16px',
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}
                        >
                            {messages.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    color: '#9ca3af',
                                    padding: '40px 20px'
                                }}>
                                    No messages yet. Ask a question to start the conversation!
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div key={msg.id} style={{ marginBottom: '20px' }}>
                                        {/* User Question */}
                                        {msg.query && (
                                            <div style={{
                                                marginBottom: '8px',
                                                textAlign: 'right'
                                            }}>
                                                <div style={{
                                                    display: 'inline-block',
                                                    maxWidth: '80%',
                                                    padding: '10px 14px',
                                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                    borderRadius: '12px 12px 0 12px',
                                                    color: '#fff',
                                                    fontSize: '14px',
                                                    textAlign: 'left'
                                                }}>
                                                    {msg.query}
                                                </div>
                                            </div>
                                        )}
                                        {/* Bot Answer */}
                                        {msg.answer && (
                                            <div style={{
                                                textAlign: 'left'
                                            }}>
                                                <div style={{
                                                    display: 'inline-block',
                                                    maxWidth: '80%',
                                                    padding: '10px 14px',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    borderRadius: '12px 12px 12px 0',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    color: '#e5e7eb',
                                                    fontSize: '14px',
                                                    lineHeight: '1.6',
                                                    whiteSpace: 'pre-wrap'
                                                }}>
                                                    {msg.answer}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                            {isAsking && (
                                <div style={{ textAlign: 'left', marginTop: '12px' }}>
                                    <div style={{
                                        display: 'inline-block',
                                        padding: '10px 14px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#9ca3af',
                                        fontSize: '14px'
                                    }}>
                                        <span className={styles.typing}>AI is thinking</span>...
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleAskQuestion} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder="Ask a question about the video..."
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                disabled={isAsking}
                                style={{
                                    flex: 1,
                                    padding: '16px 20px',
                                    fontSize: '15px',
                                    borderRadius: '12px'
                                }}
                            />
                            <button
                                type="submit"
                                className={styles.button}
                                disabled={isAsking || !question.trim()}
                                style={{
                                    width: 'auto',
                                    padding: '16px 24px',
                                    fontSize: '14px',
                                    minWidth: '80px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                {isAsking ? (
                                    <><span style={{ fontSize: '18px' }}>⏳</span></>
                                ) : (
                                    <><span style={{ fontSize: '18px' }}>📤</span> Send</>
                                )}
                            </button>
                        </form>

                        <details style={{ marginTop: '20px' }}>
                            <summary style={{ color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>
                                📄 View Full Transcript
                            </summary>
                            <pre className={styles.jsonPre} style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '12px' }}>
                                {transcript}
                            </pre>
                        </details>
                    </div>
                )}
            </div>
        </div>
    );
}

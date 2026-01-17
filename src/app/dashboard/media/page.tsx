'use client';

import React, { useState } from 'react';
import styles from './media.module.css';
import { uploadMedia, fetchTranscript, createChatSession, queryChat } from '@/actions/ondemand';

export default function MediaPage() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Chat State
    const [transcript, setTranscript] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [question, setQuestion] = useState('');
    const [chatAnswer, setChatAnswer] = useState<string | null>(null);

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
            }
        } else {
            setError("Failed to fetch transcript: " + res.error);
        }
    };

    const handleAskQuestion = async () => {
        if (!sessionId || !transcript || !question) return;
        setLoading(true);
        try {
            const res = await queryChat(sessionId, transcript, question);
            if (res.success) {
                setChatAnswer(res.answer);
            } else {
                setError(res.error);
            }
        } catch (e: any) { setError(e.message); }
        setLoading(false);
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

                {loading && (
                    <div className={styles.loader}>
                        <div className={styles.spinner}></div>
                    </div>
                )}

                {error && <div className={styles.error}>{error}</div>}

                {/* Initial Result JSON (Hidden if we have transcript for cleaner UI, or kept for debug) */}
                {result && !transcript && (
                    <div className={styles.resultArea}>
                        <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Analysis Status</h3>
                        <pre className={styles.jsonPre}>{JSON.stringify(result, null, 2)}</pre>
                    </div>
                )}

                {/* Chat Interface */}
                {transcript && (
                    <div className={styles.resultArea}>
                        <div style={{ color: '#4ade80', marginBottom: '16px', fontWeight: 'bold' }}>✅ Transcript Ready</div>

                        <div className={styles.inputGroup}>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder="Ask a question (e.g. Is backpropagation explained?)"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                            />
                        </div>
                        <button
                            className={styles.button}
                            onClick={handleAskQuestion}
                            disabled={loading || !question}
                        >
                            {loading ? 'Asking AI...' : 'Ask AI'}
                        </button>

                        {chatAnswer && (
                            <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <h3 style={{ color: '#fff', marginBottom: '10px' }}>Answer:</h3>
                                <p style={{ color: '#ddd', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{chatAnswer}</p>
                            </div>
                        )}

                        <details style={{ marginTop: '20px' }}>
                            <summary style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>View Full Transcript</summary>
                            <pre className={styles.jsonPre} style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {transcript}
                            </pre>
                        </details>
                    </div>
                )}
            </div>
        </div>
    );
}

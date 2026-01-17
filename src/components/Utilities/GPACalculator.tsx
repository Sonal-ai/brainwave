"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import styles from './GPACalculator.module.css';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function GPACalculator() {
    const { user } = useAuth0();
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Hello! I'm your GPA Calculator assistant. I can help you calculate your SGPA for a semester or CGPA across multiple semesters. \n\nYou can type your grades and credits below, or upload a transcript/result sheet and I'll analyze it for you!" }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [externalUserId, setExternalUserId] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() && !selectedFile) return;
        if (isLoading) return;

        const userMsg = inputValue.trim();
        const file = selectedFile;

        setInputValue('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        let displayMsg = userMsg;
        if (file) {
            displayMsg += userMsg ? `\n(Attachment: ${file.name})` : `Uploaded: ${file.name}`;
        }

        setMessages(prev => [...prev, { role: 'user', content: displayMsg }]);
        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append('query', userMsg);
            if (sessionId) formData.append('sessionId', sessionId);
            if (externalUserId) formData.append('externalUserId', externalUserId);
            if (file) formData.append('file', file);

            const response = await fetch('/api/gpa', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.data?.answer) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.data.answer }]);
                if (data.data.sessionId) setSessionId(data.data.sessionId);
                if (data.data.externalUserId) setExternalUserId(data.data.externalUserId);
            } else if (data.error) {
                setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${data.error}` }]);
            }
        } catch (error) {
            console.error("Failed to send message", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't reach the server. Please try again later." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleInfo}>
                    <h2>GPA Calculator 🎓</h2>
                    <p>Calculate your SGPA and CGPA with AI assistance.</p>
                </div>
                <button className={styles.resetBtn} onClick={() => {
                    setMessages([{ role: 'assistant', content: "Hello! I'm your GPA Calculator assistant. How can I help you today?" }]);
                    setSessionId(null);
                }}>Reset Chat</button>
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

            <div className={styles.formWrapper}>
                {selectedFile && (
                    <div className={styles.filePreview}>
                        📎 {selectedFile.name}
                        <button onClick={() => setSelectedFile(null)}>✕</button>
                    </div>
                )}
                <form className={styles.inputArea} onSubmit={handleSendMessage}>
                    <button
                        type="button"
                        className={styles.attachBtn}
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload transcript"
                    >
                        📎
                    </button>
                    <input
                        type="file"
                        hidden
                        ref={fileInputRef}
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <input
                        type="text"
                        placeholder="E.g., Calculate my SGPA..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || (!inputValue.trim() && !selectedFile)}>
                        {isLoading ? '...' : 'Calculate'}
                    </button>
                </form>
            </div>
        </div>
    );
}

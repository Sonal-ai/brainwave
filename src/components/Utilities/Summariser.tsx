"use client";

import React, { useState } from 'react';
import styles from './Summariser.module.css';

export default function Summariser() {
    const [file, setFile] = useState<File | null>(null);
    const [summary, setSummary] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError("");
        }
    };

    const handleSummarise = async () => {
        if (!file) return;

        setIsLoading(true);
        setError("");
        setSummary("");

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/summarise', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok && data.summary) {
                setSummary(data.summary);
            } else {
                setError(data.error || "Failed to generate summary");
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>AI Summariser</h2>
                <p>Upload a document or image to get a concise summary.</p>
            </div>

            <div className={styles.uploadSection}>
                <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg"
                    className={styles.fileInput}
                />
                <button
                    onClick={handleSummarise}
                    disabled={!file || isLoading}
                    className={styles.button}
                >
                    {isLoading ? 'Processing...' : 'Summarise'}
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {summary && (
                <div className={styles.resultSection}>
                    <h3>Summary</h3>
                    <div className={styles.summaryContent}>
                        {summary}
                    </div>
                </div>
            )}
        </div>
    );
}

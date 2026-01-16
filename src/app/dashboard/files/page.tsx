'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FilesPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [uploadType, setUploadType] = useState<'timetable' | 'resource'>('resource');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [newSubject, setNewSubject] = useState('');
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreatingSubject, setIsCreatingSubject] = useState(false);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Status Log State
    const [statusLog, setStatusLog] = useState<string[]>([]);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const addToLog = (msg: string) => setStatusLog(prev => [...prev, msg]);

    // AI Status Modal State
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'>('idle');
    const [processingStep, setProcessingStep] = useState(0); // 1=Upload, 2=Analyze, 3=Done
    const [statusMessages, setStatusMessages] = useState<string[]>([]);

    const uploadToOnDemandClient = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        const apiKey = process.env.NEXT_PUBLIC_ONDEMAND_API_KEY;

        console.log("Client Upload: Preparing...", { fileName: file.name, fileSize: file.size, apiKeyPresent: !!apiKey });

        if (!apiKey) {
            throw new Error("Missing NEXT_PUBLIC_ONDEMAND_API_KEY");
        }

        // Note: Do NOT set Content-Type header. Browser sets it with boundary automatically.
        const res = await fetch("https://api.on-demand.io/media/v1/public/file", {
            method: "POST",
            headers: {
                "apikey": apiKey
            },
            body: formData
        });

        if (!res.ok) {
            const txt = await res.text();
            console.error("Client Upload Failed Body:", txt);
            throw new Error(txt);
        }

        const data = await res.json();
        return data.data?.id || data.media_id || data.id;
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            router.push('/login');
        } else {
            const u = JSON.parse(storedUser);
            setUser(u);
            fetchData(u.username);
        }
    }, [router]);

    const fetchData = async (username: string) => {
        try {
            const res = await fetch(`/api/files?username=${username}`);
            const data = await res.json();
            if (res.ok) {
                setFiles(data.files);
                setSubjects(data.subjects || []);
                if (data.subjects?.length > 0 && !selectedSubject) {
                    setSelectedSubject(data.subjects[0]);
                }
            }
        } catch (e) {
            console.error("Failed to fetch data", e);
        }
    };

    const handleAnalyze = async (fileId: string, fileName: string) => {
        setStatusLog([]);
        setShowStatusModal(true);
        addToLog(`Starting Analysis for ${fileName}...`);

        try {
            const res = await fetch('/api/files/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user.username, fileId })
            });

            if (!res.ok) throw new Error(await res.text());

            const data = await res.json();

            if (data.success) {
                addToLog(`✅ Analysis Complete!`);
                addToLog(`📚 Extracted ${data.subjects.length} Subjects.`);

                // Update Local State
                const updatedUser = {
                    ...user,
                    subjects: [...new Set([...user.subjects, ...data.subjects])],
                    timetable: data.schedule
                };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setSubjects(updatedUser.subjects);

                // Refresh List
                const listRes = await fetch(`/api/files?username=${user.username}`);
                const listData = await listRes.json();
                setFiles(listData.files);
            } else {
                addToLog(`❌ Analysis Failed: ${data.message}`);
            }

        } catch (e: any) {
            addToLog(`❌ Error: ${e.message}`);
        }
    };

    // --- NEW HANDLERS ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUploadAndParse = async () => {
        if (!selectedFile || !user) return;

        setStatusLog([]);
        if (uploadType === 'timetable') {
            setShowStatusModal(true);
        }
        setUploadStatus('uploading');
        setShowStatusModal(true);
        setProcessingStep(1);
        setStatusMessages(["Uploading file to server..."]);

        const lowerName = selectedFile.name.toLowerCase();
        const isTimetable = uploadType === 'timetable' || lowerName.includes('time') || lowerName.includes('schedule') || lowerName.includes('tt');

        try {
            setLoading(true);

            // STEP 1: Upload to Server (Local Store)
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('username', user.username);
            formData.append('type', isTimetable ? 'timetable' : 'resource');

            const res = await fetch('/api/files/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText);
            }

            const data = await res.json();

            if (data.file) {
                addToLog('✅ Upload Success.');

                // STEP 2: Analyze if Timetable
                if (isTimetable) {
                    setStatusMessages(prev => [...prev, "Analysing with Genkit (Gemini)..."]);
                    addToLog('🚀 Triggering AI Analysis...');
                    await handleAnalyze(data.file.id, data.file.name);
                } else {
                    alert("Uploaded successfully!");
                    // Refresh List
                    const listRes = await fetch(`/api/files?username=${user.username}`);
                    const listData = await listRes.json();
                    setFiles(listData.files);
                }
            } else {
                alert('Upload failed: ' + (data.message || 'Unknown error'));
            }
        } catch (e: any) {
            alert('Error: ' + e.message);
            console.error(e);
            setStatusMessages(prev => [...prev, `❌ Error: ${e.message}`]);
        } finally {
            setLoading(false);
            setSelectedFile(null);
            const input = document.getElementById('file-upload') as HTMLInputElement;
            if (input) input.value = '';
        }
    };

    const handleDelete = async (fileId: string) => {
        if (!confirm('Are you sure you want to delete this file?')) return;
        try {
            const res = await fetch(`/api/files/delete?id=${fileId}&username=${user.username}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setFiles(files.filter(f => f.id !== fileId));
            } else {
                alert('Failed to delete file');
            }
        } catch (e) {
            console.error(e);
            alert('Error deleting file');
        }
    };

    const handleCreateSubject = async () => {
        if (!newSubject.trim()) return;
        try {
            const res = await fetch('/api/subjects/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user.username, subject: newSubject.trim() })
            });

            if (res.ok) {
                const data = await res.json();
                setSubjects(data.subjects);
                setSelectedSubject(newSubject.trim());
                setNewSubject('');
                setIsCreatingSubject(false);

                // Update local storage user
                const updatedUser = { ...user, subjects: data.subjects };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
            }
        } catch (e) {
            alert('Failed to create subject');
        }
    };

    if (!user) return null;

    return (
        <div style={{ animation: 'fadeUp 0.6s ease-out' }}>
            {/* Status Modal */}
            {showStatusModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', width: '400px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)', color: 'var(--text-primary)'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>AI Processing Status</h3>
                        <div style={{
                            background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px',
                            height: '200px', overflowY: 'auto', fontSize: '14px', fontFamily: 'monospace',
                            border: '1px solid var(--glass-border)'
                        }}>
                            {statusLog.map((log, i) => (
                                <div key={i} style={{ marginBottom: '4px' }}>{log}</div>
                            ))}
                            {loading && <div style={{ color: 'var(--accent-primary)', marginTop: '8px' }}>Processing...</div>}
                        </div>
                        <div style={{ marginTop: '16px', textAlign: 'right' }}>
                            <button
                                onClick={() => setShowStatusModal(false)}
                                disabled={loading}
                                style={{
                                    padding: '8px 16px', background: 'var(--bg-tertiary)', border: 'none',
                                    borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', color: 'var(--text-primary)'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>File Intelligence</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Upload timetables to generate academic state, or organize notes by subject.</p>
            </header>

            {/* Toggle / Tabs */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
                <button
                    onClick={() => setUploadType('timetable')}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '16px', fontWeight: 600,
                        color: uploadType === 'timetable' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        opacity: uploadType === 'timetable' ? 1 : 0.7
                    }}
                >
                    1. Update Timetable
                </button>
                <button
                    onClick={() => setUploadType('resource')}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '16px', fontWeight: 600,
                        color: uploadType === 'resource' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        opacity: uploadType === 'resource' ? 1 : 0.7
                    }}
                >
                    2. Upload Resources
                </button>
            </div>

            {/* Upload Zone (Redesigned) */}
            <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                padding: '32px',
                marginBottom: '40px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
                        {uploadType === 'timetable' ? 'Upload Timetable' : 'Upload Resources'}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        {uploadType === 'timetable'
                            ? 'Upload a file (PDF, PNG, JPG). The AI will parse it automatically.'
                            : 'Upload notes or slides. Select a subject to organize them.'}
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Native-like File Input Wrapper */}
                    <div style={{
                        border: '1px solid var(--glass-border)',
                        padding: '10px',
                        borderRadius: '6px',
                        background: 'white',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <input
                            type="file"
                            id="file-upload"
                            onChange={handleFileSelect}
                            style={{ flex: 1 }}
                        />
                    </div>

                    {/* Subject Selector for Resources */}
                    {uploadType === 'resource' && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                style={{
                                    padding: '12px', borderRadius: '6px', border: '1px solid var(--glass-border)',
                                    background: 'white', color: 'var(--text-primary)', flex: 1
                                }}
                            >
                                {subjects.length > 0 ? subjects.map(s => <option key={s} value={s}>{s}</option>) : <option value="">No subjects found</option>}
                                <option value="">-- General / Auto-Detect --</option>
                            </select>
                            <button
                                onClick={() => setIsCreatingSubject(!isCreatingSubject)}
                                style={{ fontSize: '12px', color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                                {isCreatingSubject ? 'Cancel' : '+ New Subject'}
                            </button>
                        </div>
                    )}

                    {isCreatingSubject && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                value={newSubject}
                                onChange={(e) => setNewSubject(e.target.value)}
                                placeholder="New Subject Name"
                                style={{ padding: '10px', flex: 1, borderRadius: '6px', border: '1px solid var(--glass-border)' }}
                            />
                            <button
                                onClick={handleCreateSubject}
                                style={{ padding: '10px 16px', background: 'var(--accent-secondary)', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                            >
                                Create
                            </button>
                        </div>
                    )}

                    {/* Big Action Button */}
                    <button
                        onClick={handleUploadAndParse}
                        disabled={loading || !selectedFile}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'var(--accent-primary)',
                            color: 'white',
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '15px',
                            border: 'none',
                            cursor: (loading || !selectedFile) ? 'not-allowed' : 'pointer',
                            opacity: (loading || !selectedFile) ? 0.7 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            transition: 'background 0.2s'
                        }}
                    >
                        {loading ? (
                            <span>Processing...</span>
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                {uploadType === 'timetable' ? 'Parse Timetable' : 'Upload Resource'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Files List */}
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>Your Knowledge Base</h2>
            <div style={{ display: 'grid', gap: '16px' }}>
                {files.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No files uploaded yet.</div>
                ) : (
                    files.map((file: any) => (
                        <div key={file.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '16px', background: 'var(--bg-secondary)',
                            border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '40px', height: '40px', background: 'var(--bg-tertiary)',
                                    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--text-secondary)'
                                }}>
                                    {file.name.endsWith('pdf') ? 'PDF' : 'IMG'}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        <span style={{
                                            background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-primary)',
                                            padding: '2px 6px', borderRadius: '4px', marginRight: '6px'
                                        }}>
                                            {file.subject}
                                        </span>
                                        {file.type === 'timetable' ? 'Control Signal' : 'Resource'} • {(file.size / 1024).toFixed(1)} KB
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    {new Date(file.uploadDate).toLocaleDateString()}
                                </div>
                                {/* Analyze Button Trigger (Manual) */}
                                {file.mediaId && !file.parsed && (
                                    <button
                                        onClick={() => handleAnalyze(file.id, file.name)}
                                        style={{
                                            background: 'var(--accent-primary)', color: '#fff',
                                            padding: '6px 12px', borderRadius: '6px', fontSize: '12px', border: 'none', cursor: 'pointer'
                                        }}
                                    >
                                        Analyze
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(file.id)}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)',
                                        opacity: 0.7, padding: '4px'
                                    }}
                                    title="Delete File"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

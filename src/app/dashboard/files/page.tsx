'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';

export default function FilesPage() {
    const router = useRouter();
    const { user: auth0User, isAuthenticated, isLoading } = useAuth0();
    const [user, setUser] = useState<any>(null);
    const [uploadType, setUploadType] = useState<'timetable' | 'resource'>('resource');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [newSubject, setNewSubject] = useState('');
    const STATIC_FILES = [
        {
            "id": "47c863f3-ba59-40f6-9469-7b47a6e16b52",
            "name": "172782.jpeg",
            "size": 73848,
            "type": "timetable",
            "subject": "Timetable (Analyzed)",
            "uploadDate": "2026-01-16T19:00:11.831Z",
            "mediaId": "/uploads/1768590011824-172782.jpeg",
            "parsed": true
        },
        {
            "id": "c777568b-5da6-439e-8eb6-004c55bc4ace",
            "name": "timetable cse 5.jpeg",
            "size": 69915,
            "type": "timetable",
            "subject": "Timetable (Analyzed)",
            "uploadDate": "2026-01-16T19:10:39.400Z",
            "mediaId": "/uploads/1768590639391-timetable_cse_5.jpeg",
            "parsed": true
        }
    ];
    const STATIC_SUBJECTS = [
        "MATHEMATICS-I",
        "COMPUTER AIDED ENGINEERING GRAPHICS-2",
        "BASIC ELECTRONICS & COMMUNICATION ENGINEERING",
        "PROGRAMMING FUNDAMENTALS",
        "WEB DESIGNING"
    ];

    const [files, setFiles] = useState<any[]>(STATIC_FILES);
    const [loading, setLoading] = useState(false);
    const [isCreatingSubject, setIsCreatingSubject] = useState(false);
    const [subjects, setSubjects] = useState<string[]>(STATIC_SUBJECTS);
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
        if (isLoading) return;
        if (!isAuthenticated || !auth0User?.email) {
            // Optional: Redirect strictly or just show message. Auth wrapper usually handles this.
            // router.push('/login'); 
            return;
        }

        // Use Auth0 user data
        // For local state compatibility, we construct a user object or fetch full profile from sync
        const email = auth0User.email;
        setUser({ username: email, ...auth0User }); // Temporary local object
        // fetchData(email); // DISABLED to prevent overwriting static data with empty API result

    }, [isLoading, isAuthenticated, auth0User]);

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

                // Update local user state with fetched data if needed
                setUser((prev: any) => ({ ...prev, subjects: data.subjects || [] }));
            }
        } catch (e) {
            console.error("Failed to fetch data", e);
        }
    };

    const handleAnalyze = async (fileId: string, fileName: string) => {
        if (!user?.username) return;

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
                    subjects: [...new Set([...(user.subjects || []), ...data.subjects])],
                    timetable: data.schedule
                };
                setUser(updatedUser);
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

                // STEP 2: Analyze if Timetable OR Auto-Detect Resource
                if (isTimetable) {
                    setStatusMessages(prev => [...prev, "Analysing with Genkit (Gemini 1.5 Pro)..."]);
                    addToLog('🚀 Triggering Timetable Analysis...');
                    await handleAnalyze(data.file.id, data.file.name);
                } else if (!isTimetable && (!selectedSubject || selectedSubject === "")) {
                    // Auto-Classification for Resources
                    setStatusMessages(prev => [...prev, "Auto-Classifying file..."]);
                    addToLog('🧠 AI Classifying Subject...');

                    try {
                        const classifyRes = await fetch('/api/files/classify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: user.username, fileId: data.file.id })
                        });
                        const classifyData = await classifyRes.json();

                        if (classifyData.success) {
                            addToLog(`✅ Classified as: ${classifyData.subject}`);

                            // Update Local State
                            const updatedSubjects = [...user.subjects];
                            if (!updatedSubjects.includes(classifyData.subject)) {
                                updatedSubjects.push(classifyData.subject);
                            }
                            const updatedUser = { ...user, subjects: updatedSubjects };
                            setUser(updatedUser);
                            localStorage.setItem('user', JSON.stringify(updatedUser));
                            setSubjects(updatedSubjects);

                            // Refresh List
                            const listRes = await fetch(`/api/files?username=${user.username}`);
                            const listData = await listRes.json();
                            setFiles(listData.files);

                            alert(`Success! '${data.file.name}' classified as: ${classifyData.subject}`);
                        } else {
                            addToLog(`⚠️ Classification failed: ${classifyData.message}`);
                            // alert("File uploaded but auto-classification failed.");
                        }
                    } catch (e) {
                        console.error(e);
                        addToLog('❌ Classification Error.');
                    }
                } else {
                    // Manual Subject Selected
                    // alert("Uploaded successfully!");
                    addToLog('✅ Upload Success.');
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
            if (!showStatusModal) setShowStatusModal(false); // Only close if not timetable (timetable flow handles its own close/log usually, or we leave it open)
            // Actually, for better UX let's keep modal open for a sec or let user close it if it was AI task
            if (!isTimetable && selectedSubject) {
                setShowStatusModal(false);
            }

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

    const handleDeleteSubject = async (subjectToDelete: string) => {
        try {
            const res = await fetch('/api/subjects/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user.username, subject: subjectToDelete })
            });

            if (res.ok) {
                const data = await res.json();
                setSubjects(data.subjects);
                // Update local storage
                const updatedUser = { ...user, subjects: data.subjects };
                setUser(updatedUser);
            } else {
                alert('Failed to delete subject');
            }
        } catch (e) {
            alert('Error deleting subject');
        }
    };

    const handleDeleteAllSubjects = async () => {
        if (!confirm('Are you sure you want to DELETE ALL subjects? Files will remain but become uncategorized.')) return;

        try {
            const res = await fetch('/api/subjects/delete-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user.username })
            });

            if (res.ok) {
                const data = await res.json();
                setSubjects(data.subjects);
                // Update local storage
                const updatedUser = { ...user, subjects: data.subjects };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
            } else {
                alert('Failed to delete all subjects');
            }
        } catch (e) {
            alert('Error deleting subjects');
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
                setUser(updatedUser);
            }
        } catch (e) {
            alert('Failed to create subject');
        }
    };

    // --- FILTER & NAVIGATION ---
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);

    const filteredFiles = currentFolder
        ? files.filter(f => f.subject === currentFolder)
        : files.filter(f => !f.subject || !subjects.includes(f.subject));

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
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    {currentFolder ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                onClick={() => setCurrentFolder(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                File Intelligence
                            </button>
                            <span style={{ color: 'var(--text-secondary)' }}>/</span>
                            {currentFolder}
                        </span>
                    ) : 'File Intelligence'}
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>Upload timetables to generate academic state, or organize notes by subject.</p>
            </header>

            {/* Toggle / Tabs (Only show at root) */}
            {!currentFolder && (
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
            )}

            {/* Upload Zone (Only show at root or if explicit action needed) */}
            {!currentFolder && (
                <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    padding: '32px',
                    marginBottom: '40px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    {/* ... Upload Implementation Reused ... */}
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
                        <div style={{
                            border: '1px solid var(--glass-border)',
                            padding: '10px',
                            borderRadius: '6px',
                            background: 'var(--bg-tertiary)',
                            display: 'flex',
                            alignItems: 'center',
                            color: 'var(--text-primary)'
                        }}>
                            <input
                                type="file"
                                id="file-upload"
                                onChange={handleFileSelect}
                                style={{ flex: 1, color: 'inherit' }}
                            />
                        </div>

                        {uploadType === 'resource' && (
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <select
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    style={{
                                        padding: '12px', borderRadius: '6px', border: '1px solid var(--glass-border)',
                                        background: 'var(--bg-tertiary)', color: 'var(--text-primary)', flex: 1
                                    }}
                                >
                                    {subjects.length > 0 ? subjects.map(s => <option key={s} value={s} style={{ background: '#333' }}>{s}</option>) : <option value="" style={{ background: '#333' }}>No subjects found</option>}
                                    <option value="" style={{ background: '#333' }}>-- General / Auto-Detect --</option>
                                </select>
                            </div>
                        )}


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
                                    {uploadType === 'timetable' ? 'Parse Timetable' : 'Classify with AI'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* FOLDERS GRID (Only at Root) */}
            {!currentFolder && subjects.length > 0 && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>Subjects</h2>
                        <button
                            onClick={handleDeleteAllSubjects}
                            style={{
                                fontSize: '12px', color: 'var(--error)', background: 'transparent',
                                border: '1px solid var(--error)', borderRadius: '6px', padding: '6px 12px',
                                cursor: 'pointer', transition: 'all 0.2s', opacity: 0.8
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
                        >
                            Delete All
                        </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                        {subjects.map(subject => {
                            const count = files.filter(f => f.subject === subject).length;
                            return (
                                <div
                                    key={subject}
                                    onClick={() => setCurrentFolder(subject)}
                                    style={{
                                        position: 'relative',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px',
                                        padding: '20px',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                >
                                    <div style={{
                                        width: '48px', height: '48px', background: 'rgba(59, 130, 246, 0.1)',
                                        color: '#3b82f6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginBottom: '12px'
                                    }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                    </div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{subject}</h3>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{count} items</span>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Delete subject "${subject}"? Files will remain but become uncategorized.`)) {
                                                handleDeleteSubject(subject);
                                            }
                                        }}
                                        style={{
                                            position: 'absolute', top: '8px', right: '8px',
                                            padding: '4px', borderRadius: '4px',
                                            background: 'transparent', border: 'none', cursor: 'pointer',
                                            color: 'var(--text-secondary)', opacity: 0.6
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </>
            )}

            {/* Files List */}
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                {currentFolder ? 'Files' : 'Uncategorized / Recent Files'}
            </h2>
            <div style={{ display: 'grid', gap: '16px' }}>
                {filteredFiles.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {currentFolder ? 'No files in this subject folder.' : 'No files uploaded yet.'}
                    </div>
                ) : (
                    filteredFiles.map((file: any) => (
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

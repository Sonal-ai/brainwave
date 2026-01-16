'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FilesPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'upload' | 'view'>('upload');
    const [uploadType, setUploadType] = useState<'timetable' | 'resource'>('resource');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [newSubject, setNewSubject] = useState('');
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreatingSubject, setIsCreatingSubject] = useState(false);
    const [subjects, setSubjects] = useState<string[]>([]);

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

    const [statusLog, setStatusLog] = useState<string[]>([]);
    const [showStatusModal, setShowStatusModal] = useState(false);

    const addToLog = (msg: string) => setStatusLog(prev => [...prev, msg]);

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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setStatusLog([]);
        // We only show modal if user wants, or we can use a Toast. 
        // For Step 1 (Upload), maybe just a simple generic loading?
        // User asked for "Upload then Parse". 
        // Let's show a text "Uploading..."

        const formData = new FormData();
        formData.append('file', file);
        formData.append('username', user.username);

        let type = 'resource';
        if (file.name.toLowerCase().includes('tim') || file.name.toLowerCase().includes('sch')) {
            type = 'timetable';
        }
        formData.append('type', type);

        try {
            setLoading(true);
            const res = await fetch('/api/files/upload', { method: 'POST', body: formData });
            const data = await res.json();

            if (res.ok) {
                let msg = "File Uploaded. ";
                if (data.file.mediaId) msg += "Ready for Analysis.";
                alert(msg);

                // Refresh List
                const listRes = await fetch(`/api/files?username=${user.username}`);
                const listData = await listRes.json();
                setFiles(listData.files);
            } else {
                alert('Upload failed.');
            }
        } catch (e) {
            alert('Error uploading.');
        } finally {
            setLoading(false);
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
            <header style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>File Intelligence</h1>
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

            {/* Upload Zone */}
            <div style={{
                background: 'var(--bg-secondary)',
                border: '2px dashed var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '48px',
                textAlign: 'center',
                marginBottom: '40px',
                transition: 'all 0.2s'
            }}>
                <div style={{ marginBottom: '24px' }}>
                    <div style={{
                        width: '64px', height: '64px', background: 'var(--bg-tertiary)',
                        borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                        {uploadType === 'timetable' ? 'Upload Timetable / Schedule' : 'Upload Notes, PDFs, or Slides'}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
                        {uploadType === 'timetable'
                            ? 'System will parse this file to extract your subjects and update your academic state.'
                            : 'Select a subject below to tag this file correctly.'}
                    </p>
                </div>

                {uploadType === 'resource' && (
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: 500 }}>
                            <label>Select Subject</label>
                            <button
                                onClick={() => setIsCreatingSubject(!isCreatingSubject)}
                                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
                            >
                                {isCreatingSubject ? 'Cancel' : '+ Create New'}
                            </button>
                        </div>

                        {isCreatingSubject ? (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                <input
                                    type="text"
                                    placeholder="e.g. Artificial Intelligence"
                                    value={newSubject}
                                    onChange={e => setNewSubject(e.target.value)}
                                    style={{
                                        padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)',
                                        background: 'var(--bg-primary)', width: '200px', color: 'var(--text-primary)'
                                    }}
                                />
                                <button
                                    onClick={handleCreateSubject}
                                    style={{
                                        padding: '10px 16px', borderRadius: 'var(--radius-md)', background: 'var(--accent-secondary)',
                                        color: 'white', border: 'none', cursor: 'pointer'
                                    }}
                                >
                                    Add
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <select
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    style={{
                                        padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)',
                                        background: 'var(--bg-primary)', width: '250px', color: 'var(--text-primary)'
                                    }}
                                >
                                    {subjects.length > 0 ? subjects.map(s => <option key={s} value={s}>{s}</option>) : <option value="">No subjects found</option>}
                                    <option value="">-- General / Auto-Detect --</option>
                                </select>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Leave as "General" to let AI infer subject from filename.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <input
                    type="file"
                    id="file-upload"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                    disabled={loading}
                />
                <label
                    htmlFor="file-upload"
                    style={{
                        display: 'inline-block',
                        padding: '12px 24px',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? 'Processing...' : 'Select File'}
                </label>
            </div>

            {/* Files List */}
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Your Knowledge Base</h2>
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

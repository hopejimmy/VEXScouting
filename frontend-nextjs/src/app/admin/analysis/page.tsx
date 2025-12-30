'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Terminal, Plus, Trash2, StopCircle, PlayCircle, Loader2, Upload } from 'lucide-react';

interface LogEntry {
    type: 'info' | 'warn' | 'error' | 'success' | 'process' | 'debug' | 'complete';
    message: string;
    timestamp: string;
}

interface TrackedTeam {
    team_number: string;
    created_at: string;
}

function AnalysisDashboard() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [trackedTeams, setTrackedTeams] = useState<TrackedTeam[]>([]);
    const [newTeam, setNewTeam] = useState('');
    const [importSku, setImportSku] = useState('');

    const [selectedTeams, setSelectedTeams] = useState<string[]>([]); // Selection State
    const router = useRouter();

    const terminalRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<any>(null);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const { token } = useAuth();

    const [isStopping, setIsStopping] = useState(false);

    useEffect(() => {
        if (token) {
            fetchTrackedTeams();
            connectToStream();
            fetchStatus(); // Sync running state on load
        }

        return () => {
            if (eventSourceRef.current && eventSourceRef.current.close) {
                eventSourceRef.current.close();
            }
        };
    }, [token]);

    const fetchStatus = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/analysis/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const status = await res.json();
                setIsRunning(status.isRunning);
            }
        } catch (e) {
            console.error("Failed to fetch status", e);
        }
    };

    // Scroll terminal to bottom
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    const fetchTrackedTeams = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/tracked-teams`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setTrackedTeams(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    const addTeam = async () => {
        if (!newTeam) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/tracked-teams`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ teamNumber: newTeam.toUpperCase(), action: 'add' })
            });

            if (!res.ok) {
                const err = await res.json();
                alert(`Error: ${err.error || 'Failed to add team'}`);
                return;
            }

            setNewTeam('');
            fetchTrackedTeams();
        } catch (e) {
            console.error(e);
            alert('Failed to add team');
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/tracked-teams/upload`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) {
                const err = await res.json();
                alert(`Error: ${err.error || 'Upload failed'}`);
                return;
            }

            const data = await res.json();
            alert(`Success! Found ${data.count} teams, Added ${data.added} new teams.`);
            fetchTrackedTeams();
        } catch (error) {
            console.error(error);
            alert('Upload error');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleImportEvent = async () => {
        if (!importSku) return;
        try {
            // Validation: Allow simple numbers (ID) OR standard SKU format
            const isId = /^\d+$/.test(importSku);
            const isSku = importSku.includes('RE-');

            if (!isId && !isSku) {
                if (!confirm("Input doesn't look like an Event ID (e.g. 60517) or SKU (e.g. RE-VRC-...). Try anyway?")) return;
            }

            const res = await fetch(`${API_BASE_URL}/api/admin/tracked-teams/import-event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ eventSku: importSku })
            });

            if (!res.ok) {
                const err = await res.json();
                alert(`Error: ${err.error || 'Import failed'}`);
                return;
            }

            const data = await res.json();
            alert(data.message);
            setImportSku('');
            fetchTrackedTeams();

        } catch (e) {
            console.error(e);
            alert('Failed to import event');
        }
    };


    const removeTeam = async (team: string) => {
        if (!confirm(`Stop tracking ${team}?`)) return;
        await fetch(`${API_BASE_URL}/api/admin/tracked-teams`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ teamNumber: team, action: 'remove' })
        });
        fetchTrackedTeams();
    };

    const toggleSelection = (team: string) => {
        setSelectedTeams(prev =>
            prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
        );
    };

    const removeSelectedTeams = async () => {
        if (selectedTeams.length === 0) return;
        if (!confirm(`Stop tracking ${selectedTeams.length} teams?`)) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/tracked-teams`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ teamNumber: selectedTeams, action: 'remove' })
            });

            if (res.ok) {
                setSelectedTeams([]);
                fetchTrackedTeams();
            }
        } catch (e) {
            console.error(e);
            alert('Failed to remove teams');
        }
    };

    const toggleSelectAll = () => {
        if (selectedTeams.length === trackedTeams.length) {
            setSelectedTeams([]);
        } else {
            setSelectedTeams(trackedTeams.map(t => t.team_number));
        }
    };

    const connectToStream = async () => {
        if (eventSourceRef.current) {
            console.log('Stream already connected/connecting...');
            return;
        }

        const url = `${API_BASE_URL}/api/admin/analysis/stream?token=${token}`;
        console.log(`📡 Starting Fetch Stream to: ${url}`);

        setLogs(prev => [...prev.slice(-199), {
            type: 'info',
            message: `🔄 Connecting via Fetch Stream at ${new Date().toLocaleTimeString()}...`,
            timestamp: new Date().toLocaleTimeString()
        }]);

        const controller = new AbortController();
        // Use a dummy object for state tracking
        eventSourceRef.current = {
            close: () => {
                console.log('Closing Fetch Stream');
                controller.abort();
                eventSourceRef.current = null;
            }
        };

        try {
            const response = await fetch(url, {
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status} ${response.statusText}`);
            }

            if (!response.body) {
                throw new Error('No response body received');
            }

            setLogs(prev => [...prev.slice(-199), {
                type: 'success',
                message: '✅ Connected! Stream Active.',
                timestamp: new Date().toLocaleTimeString()
            }]);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;

                    const chunks = buffer.split('\n\n');
                    buffer = chunks.pop() || '';

                    for (const block of chunks) {
                        const lines = block.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const jsonStr = line.slice(6);
                                    const data = JSON.parse(jsonStr);
                                    setLogs(prev => [...prev.slice(-199), {
                                        type: data.type,
                                        message: data.message,
                                        timestamp: new Date().toLocaleTimeString()
                                    }]);

                                    if (data.type === 'start') {
                                        setIsRunning(true);
                                        setIsStopping(false);
                                    }
                                    if (data.type === 'complete' || data.type === 'stop') {
                                        setIsRunning(false);
                                        setIsStopping(false);
                                    }
                                } catch (e) {
                                    console.error('Failed to parse SSE data:', line, e);
                                }
                            }
                        }
                    }
                }
            } catch (readError: any) {
                if (readError.name === 'AbortError') throw readError;
                console.error('Stream Read Error:', readError);
                throw readError;
            }

            console.log('Stream closed by server');
            eventSourceRef.current = null;
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Stream aborted manually');
                return;
            }
            console.error('Fetch Stream Error:', error);
            setLogs(prev => [...prev.slice(-199), {
                type: 'error',
                message: `⚠️ Stream Error: ${error.message}`,
                timestamp: new Date().toLocaleTimeString()
            }]);
            eventSourceRef.current = null;
            setTimeout(() => connectToStream(), 5000);
        }
    };

    const handleStart = async () => {
        setIsRunning(true);
        setLogs([]); // Clear logs on new run
        await fetch(`${API_BASE_URL}/api/admin/analysis/start`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
    };

    const handleStop = async () => {
        setIsStopping(true); // Immediate feedback
        await fetch(`${API_BASE_URL}/api/admin/analysis/stop`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
    };

    return (
        <ProtectedRoute requiredPermission="admin:access">
            <div className="p-6 max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <Button
                            variant="ghost"
                            className="mb-2 pl-0 hover:bg-transparent hover:text-blue-600"
                            onClick={() => router.push('/admin')}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Admin
                        </Button>
                        <h1 className="text-3xl font-bold text-gray-900">Analysis Dashboard</h1>
                        <p className="text-gray-500">Manage background processing for team performance analysis.</p>
                    </div>
                    <div className="flex gap-2">
                        {!isRunning ? (
                            <Button onClick={handleStart} className="bg-green-600 hover:bg-green-700">
                                <PlayCircle className="w-4 h-4 mr-2" /> Start Analysis
                            </Button>
                        ) : (
                            <Button onClick={handleStop} variant="destructive" disabled={isStopping}>
                                {isStopping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <StopCircle className="w-4 h-4 mr-2" />}
                                {isStopping ? 'Stopping...' : 'Stop Analysis'}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Tracked Teams Panel */}
                    <Card className="lg:col-span-1 h-fit">
                        <CardHeader>
                            <CardTitle className="text-lg">Tracked Teams ({trackedTeams.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 space-y-2">
                                {selectedTeams.length > 0 && (
                                    <div className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100 mb-2">
                                        <span className="text-sm font-medium text-blue-700">{selectedTeams.length} selected</span>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={removeSelectedTeams}
                                            className="h-7 text-xs"
                                        >
                                            <Trash2 className="w-3 h-3 mr-1" /> Remove
                                        </Button>
                                    </div>
                                )}
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <input
                                            className="flex-1 border rounded px-3 py-2 text-sm"
                                            placeholder="Event ID (60517) or SKU"
                                            value={importSku}
                                            onChange={e => setImportSku(e.target.value)}
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={handleImportEvent}
                                            disabled={!importSku}
                                            className="text-xs"
                                        >
                                            Import
                                        </Button>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="w-full text-xs"
                                        onClick={toggleSelectAll}
                                    >
                                        {selectedTeams.length === trackedTeams.length && trackedTeams.length > 0 ? 'Deselect All' : 'Select All'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full text-xs border-dashed"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="w-3 h-3 mr-2" /> Upload CSV List
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept=".csv,.txt"
                                        className="hidden"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 border rounded px-3 py-2 uppercase"
                                        placeholder="Team #"
                                        value={newTeam}
                                        onChange={e => setNewTeam(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addTeam()}
                                    />
                                    <Button onClick={addTeam} variant="outline" size="icon"><Plus className="w-4 h-4" /></Button>
                                </div>
                            </div>
                            <div className="max-h-[500px] overflow-y-auto space-y-2">
                                {trackedTeams.map(t => (
                                    <div key={t.team_number} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                checked={selectedTeams.includes(t.team_number)}
                                                onCheckedChange={() => toggleSelection(t.team_number)}
                                            />
                                            <span className="font-mono font-bold">{t.team_number}</span>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => removeTeam(t.team_number)} className="text-red-500 hover:text-red-700 h-6 w-6 p-0">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                {trackedTeams.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No teams tracked.</p>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Console / Terminal Panel */}
                    <Card className="lg:col-span-2 bg-slate-950 text-slate-50 border-slate-800 flex flex-col h-[600px]">
                        <CardHeader className="border-b border-slate-800 bg-slate-900/50 py-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Terminal className="w-4 h-4 text-green-400" />
                                    <span className="font-mono text-sm">worker-process.log</span>
                                </div>
                                {isRunning && <span className="flex items-center text-xs text-green-400 animate-pulse"><div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div> Processing...</span>}
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto p-4 font-mono text-xs space-y-1" ref={terminalRef}>
                            {logs.length === 0 && !isRunning && <div className="text-slate-500">Ready to start. Waiting for command...</div>}
                            {logs.map((log, i) => (
                                <div key={i} className={`flex gap-3 ${log.type === 'error' ? 'text-red-400' :
                                    log.type === 'warn' ? 'text-yellow-400' :
                                        log.type === 'success' ? 'text-green-400' :
                                            log.type === 'process' ? 'text-blue-400 font-bold' :
                                                log.type === 'debug' ? 'text-slate-500' : 'text-slate-300'
                                    }`}>
                                    <span className="text-slate-600 select-none">[{log.timestamp}]</span>
                                    <span>{log.message}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </ProtectedRoute>
    );
}

export default AnalysisDashboard;

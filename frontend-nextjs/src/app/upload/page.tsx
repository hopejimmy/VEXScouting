'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Program } from '@/types/skills';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function UploadPageContent() {
    const [file, setFile] = useState<File | null>(null);
    const [selectedMatchType, setSelectedMatchType] = useState<string>('VRC');
    const [status, setStatus] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isClient, setIsClient] = useState(false);
    const router = useRouter();
    const { token } = useAuth();

    // Fetch available programs
    const { data: programs = [], isLoading: isProgramsLoading } = useQuery<Program[]>({
        queryKey: ['programs'],
        queryFn: async () => {
            const response = await fetch(`${API_BASE_URL}/api/programs`);
            if (!response.ok) {
                throw new Error('Failed to fetch programs');
            }
            return response.json();
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Use useEffect to mark when component is mounted on client
    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('');
            setError('');
        }
    };

    const handleMatchTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedMatchType(e.target.value);
        setStatus('');
        setError('');
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a CSV file');
            return;
        }

        if (!selectedMatchType) {
            setError('Please select a match type');
            return;
        }

        if (!token) {
            setError('You must be logged in to upload files');
            return;
        }

        setStatus('Uploading...');
        setError('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('matchType', selectedMatchType);

        try {
            const response = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed');
            }

            setStatus(`Success! ${result.message} (${result.recordsProcessed} records processed)`);
            setFile(null);
            if (document.querySelector<HTMLInputElement>('input[type="file"]')) {
                (document.querySelector<HTMLInputElement>('input[type="file"]')!).value = '';
            }
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
            setStatus('');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={() => router.push('/')}
                    className="mb-4 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Search
                </button>

                <div className="bg-white p-8 rounded-lg shadow">
                    <h1 className="text-2xl font-bold mb-6">Upload Team Data</h1>
                    
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold mb-2">Instructions:</h2>
                        <ol className="list-decimal list-inside space-y-2 text-gray-700">
                            <li>Select the match type for your data (VEXIQ, VRC, or VEXU)</li>
                            <li>Prepare a CSV file with the following headers:
                                <code className="block bg-gray-50 p-2 mt-1 rounded text-sm">
                                    Rank,Score,Autonomous Coding Skills,Driver Skills,Highest Autonomous Coding Skills,Highest Driver Skills,Team Number,Team Name,Organization
                                </code>
                            </li>
                            <li>Make sure all team numbers and names are correct</li>
                            <li>Numeric fields should contain only numbers</li>
                            <li>Select your file and click Upload</li>
                        </ol>
                    </div>

                    {isClient && (
                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Match Type *
                                </label>
                                <select
                                    value={selectedMatchType}
                                    onChange={handleMatchTypeChange}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    disabled={isProgramsLoading}
                                >
                                    {isProgramsLoading ? (
                                        <option>Loading programs...</option>
                                    ) : (
                                        programs.map((program) => (
                                            <option key={program.id} value={program.code}>
                                                {program.name}
                                            </option>
                                        ))
                                    )}
                                </select>
                                <p className="mt-1 text-sm text-gray-500">
                                    Select the VEX competition type that this data belongs to
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select CSV File *
                                </label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-gray-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-md file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-blue-50 file:text-blue-700
                                        hover:file:bg-blue-100"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!file || !selectedMatchType}
                                className={`w-full py-2 px-4 rounded-md text-white font-medium
                                    ${!file || !selectedMatchType
                                        ? 'bg-gray-400 cursor-not-allowed' 
                                        : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                Upload
                            </button>
                        </form>
                    )}

                    {status && (
                        <div className="mt-4 p-3 bg-green-50 text-green-800 rounded">
                            {status}
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-800 rounded">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function UploadPage() {
    return (
        <ProtectedRoute requiredPermission="upload:create">
            <UploadPageContent />
        </ProtectedRoute>
    );
} 
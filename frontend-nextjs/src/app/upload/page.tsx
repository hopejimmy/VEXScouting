'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function UploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isClient, setIsClient] = useState(false);
    const router = useRouter();

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

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a CSV file');
            return;
        }

        setStatus('Uploading...');
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:3000/api/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed');
            }

            setStatus(`Success! ${result.message}`);
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
                                    Select CSV File
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
                                disabled={!file}
                                className={`w-full py-2 px-4 rounded-md text-white font-medium
                                    ${!file 
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
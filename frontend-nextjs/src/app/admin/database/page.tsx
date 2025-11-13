'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Database, Activity, HardDrive, Users, FileText, RefreshCw, AlertTriangle, CheckCircle, Play, Code } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface DatabaseStats {
  connection_status: 'healthy' | 'warning' | 'error';
  total_tables: number;
  total_records: number;
  database_size: string;
  last_backup: string;
  uptime: string;
  performance: {
    avg_query_time: string;
    active_connections: number;
    max_connections: number;
  };
  tables: {
    name: string;
    rows: number;
    size: string;
    last_updated: string;
  }[];
}

function DatabaseStatusContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // SQL Query Runner state
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryMode, setQueryMode] = useState<'SELECT' | 'WRITE'>('SELECT');
  const [schema, setSchema] = useState<any[]>([]);
  const [showSchema, setShowSchema] = useState(false);

  useEffect(() => {
    fetchDatabaseStats();
  }, []);

  const fetchDatabaseStats = async () => {
    try {
      setLoading(true);
      // TODO: Implement API call to fetch database statistics
      // const response = await authApi.get('/admin/database/stats');
      // setStats(response.data);
      
      // Mock data for now
      setTimeout(() => {
        setStats({
          connection_status: 'healthy',
          total_tables: 12,
          total_records: 15247,
          database_size: '142.5 MB',
          last_backup: '2024-12-19T02:00:00Z',
          uptime: '15 days, 8 hours',
          performance: {
            avg_query_time: '23ms',
            active_connections: 8,
            max_connections: 100
          },
          tables: [
            { name: 'teams', rows: 1205, size: '8.2 MB', last_updated: '2024-12-19T14:30:00Z' },
            { name: 'matches', rows: 3891, size: '45.6 MB', last_updated: '2024-12-19T13:45:00Z' },
            { name: 'events', rows: 287, size: '12.1 MB', last_updated: '2024-12-19T11:20:00Z' },
            { name: 'users', rows: 23, size: '156 KB', last_updated: '2024-12-19T09:15:00Z' },
            { name: 'roles', rows: 5, size: '24 KB', last_updated: '2024-12-15T10:30:00Z' },
            { name: 'permissions', rows: 15, size: '48 KB', last_updated: '2024-12-15T10:30:00Z' },
            { name: 'favorites', rows: 145, size: '892 KB', last_updated: '2024-12-19T12:10:00Z' },
            { name: 'compare_lists', rows: 67, size: '425 KB', last_updated: '2024-12-19T10:55:00Z' }
          ]
        });
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to fetch database stats:', error);
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDatabaseStats();
    setRefreshing(false);
  };

  const handleBackup = async () => {
    if (confirm('Create a database backup? This may take a few minutes.')) {
      try {
        // TODO: Implement backup API call
        alert('Backup initiated. You will be notified when it completes.');
      } catch (error) {
        console.error('Failed to create backup:', error);
      }
    }
  };

  // SQL Query Runner functions
  const fetchSchema = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/admin/database/schema`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch schema');
      }
      
      const data = await response.json();
      setSchema(data.columns || []);
      setShowSchema(true);
    } catch (error) {
      console.error('Error fetching schema:', error);
      alert('Failed to load table schema');
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) {
      setQueryError('Query cannot be empty');
      return;
    }
    
    setIsExecuting(true);
    setQueryError(null);
    setQueryResult(null);
    
    try {
      const token = localStorage.getItem('authToken');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const endpoint = queryMode === 'SELECT' 
        ? `${baseUrl}/api/admin/database/query` 
        : `${baseUrl}/api/admin/database/execute`;
      
      const body = queryMode === 'SELECT'
        ? { query, limit: 1000 }
        : { query, confirm: 'EXECUTE' };
      
      if (queryMode === 'WRITE') {
        const operation = query.trim().toUpperCase().split(' ')[0];
        if (!confirm(`Are you sure you want to execute this ${operation} query? This action cannot be undone.`)) {
          setIsExecuting(false);
          return;
        }
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setQueryError(data.error || data.details || 'Query execution failed');
        setQueryResult(null);
      } else {
        setQueryResult(data);
        setQueryError(null);
      }
    } catch (error: any) {
      setQueryError(error.message || 'Error executing query');
      setQueryResult(null);
    } finally {
      setIsExecuting(false);
    }
  };

  const loadExampleQuery = (example: string) => {
    setQuery(example);
    setQueryMode('SELECT');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return AlertTriangle;
      default: return Database;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="mb-4 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Admin Dashboard
          </button>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Status</h1>
                <p className="text-gray-600">Monitor database health and performance</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  onClick={handleBackup}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
                >
                  <HardDrive className="w-4 h-4 mr-2" />
                  Backup
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading database statistics...</p>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getStatusColor(stats.connection_status)}`}>
                    {(() => {
                      const StatusIcon = getStatusIcon(stats.connection_status);
                      return <StatusIcon className="w-6 h-6" />;
                    })()}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Connection</p>
                    <p className="text-2xl font-bold text-gray-900 capitalize">{stats.connection_status}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Records</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_records.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <HardDrive className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Database Size</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.database_size}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Uptime</p>
                    <p className="text-lg font-bold text-gray-900">{stats.uptime}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Performance Metrics</h2>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Average Query Time</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{stats.performance.avg_query_time}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Active Connections</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                      {stats.performance.active_connections}
                      <span className="text-lg text-gray-400">/{stats.performance.max_connections}</span>
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Last Backup</p>
                    <p className="text-sm text-gray-900 mt-2">{formatDate(stats.last_backup)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tables Overview */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Tables Overview</h2>
                <p className="text-sm text-gray-600">Database tables and their statistics</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rows</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.tables.map((table) => (
                      <tr key={table.name} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Database className="w-4 h-4 text-gray-400 mr-3" />
                            <span className="text-sm font-medium text-gray-900">{table.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {table.rows.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {table.size}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(table.last_updated)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Maintenance Actions */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Maintenance Actions</h2>
                <p className="text-sm text-gray-600">Database maintenance and optimization tools</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={() => alert('Optimization started (this is a demo)')}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <Activity className="w-6 h-6 text-blue-600 mb-2" />
                    <h3 className="text-sm font-medium text-gray-900">Optimize Tables</h3>
                    <p className="text-xs text-gray-500">Optimize database tables for better performance</p>
                  </button>

                  <button
                    onClick={() => alert('Cleanup started (this is a demo)')}
                    className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left"
                  >
                    <RefreshCw className="w-6 h-6 text-green-600 mb-2" />
                    <h3 className="text-sm font-medium text-gray-900">Clean Up</h3>
                    <p className="text-xs text-gray-500">Remove orphaned records and temporary data</p>
                  </button>

                  <button
                    onClick={() => alert('Reindex started (this is a demo)')}
                    className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-left"
                  >
                    <Database className="w-6 h-6 text-purple-600 mb-2" />
                    <h3 className="text-sm font-medium text-gray-900">Rebuild Indexes</h3>
                    <p className="text-xs text-gray-500">Rebuild database indexes for optimal query performance</p>
                  </button>
                </div>
              </div>
            </div>

            {/* SQL Query Runner - skills_standings table only */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">SQL Query Runner</h2>
                    <p className="text-sm text-gray-600">Execute SQL queries on skills_standings table (read-only and write operations)</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={fetchSchema}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center space-x-1"
                    >
                      <Code className="w-4 h-4" />
                      <span>View Schema</span>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Query Mode Toggle */}
                <div className="flex items-center space-x-2 border-b border-gray-200 pb-4">
                  <button
                    onClick={() => {
                      setQueryMode('SELECT');
                      setQueryError(null);
                      setQueryResult(null);
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      queryMode === 'SELECT'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    SELECT (Read)
                  </button>
                  <button
                    onClick={() => {
                      setQueryMode('WRITE');
                      setQueryError(null);
                      setQueryResult(null);
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      queryMode === 'WRITE'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    INSERT/UPDATE/DELETE (Write)
                  </button>
                </div>

                {/* Example Queries */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm font-medium text-gray-700">Quick Examples:</span>
                  <button
                    onClick={() => loadExampleQuery("SELECT * FROM skills_standings WHERE matchType = 'VRC' LIMIT 10;")}
                    className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                  >
                    Select VRC Teams
                  </button>
                  <button
                    onClick={() => loadExampleQuery("SELECT * FROM skills_standings WHERE matchType = 'VRC' ORDER BY score DESC LIMIT 10;")}
                    className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                  >
                    Top 10 VRC Teams
                  </button>
                  <button
                    onClick={() => loadExampleQuery("SELECT COUNT(*) as total, matchType FROM skills_standings GROUP BY matchType;")}
                    className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                  >
                    Count by MatchType
                  </button>
                  {queryMode === 'WRITE' && (
                    <button
                      onClick={() => loadExampleQuery("DELETE FROM skills_standings WHERE matchType = 'VRC' AND teamNumber = '12345A';")}
                      className="px-2 py-1 text-xs bg-orange-50 text-orange-700 rounded hover:bg-orange-100 transition-colors"
                    >
                      Delete Example
                    </button>
                  )}
                </div>

                {/* Query Editor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SQL Query {queryMode === 'WRITE' && <span className="text-orange-600 font-bold">(Write Mode - Use with caution)</span>}
                  </label>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Enter your ${queryMode} query here...\n\nExample SELECT:\nSELECT * FROM skills_standings WHERE matchType = 'VRC' LIMIT 10;\n\nExample DELETE:\nDELETE FROM skills_standings WHERE matchType = 'VRC' AND teamName = 'Duplicate Team';\n\nNote: Only queries on skills_standings table are allowed.`}
                    className="w-full h-48 px-4 py-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    spellCheck={false}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {queryMode === 'SELECT' 
                        ? 'Read-only queries. Results limited to 5000 rows. Only skills_standings table is allowed.'
                        : 'Write queries require confirmation. Dangerous operations (DROP, TRUNCATE, ALTER) are blocked. Only skills_standings table is allowed.'}
                    </p>
                    <button
                      onClick={executeQuery}
                      disabled={isExecuting || !query.trim()}
                      className={`px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors ${
                        queryMode === 'WRITE'
                          ? 'bg-orange-600 hover:bg-orange-700 text-white disabled:bg-orange-400'
                          : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400'
                      } disabled:cursor-not-allowed`}
                    >
                      <Play className="w-4 h-4" />
                      <span>{isExecuting ? 'Executing...' : 'Execute Query'}</span>
                    </button>
                  </div>
                </div>

                {/* Schema Display */}
                {showSchema && schema.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-900">skills_standings Table Schema</h3>
                      <button
                        onClick={() => setShowSchema(false)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Hide
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Column Name</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Data Type</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Nullable</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Default</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {schema.map((col: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-mono text-gray-900">{col.column_name}</td>
                              <td className="px-3 py-2 text-gray-700">{col.data_type}</td>
                              <td className="px-3 py-2 text-gray-700">{col.is_nullable === 'YES' ? 'Yes' : 'No'}</td>
                              <td className="px-3 py-2 text-gray-700 font-mono">{col.column_default || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {queryError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <h3 className="text-sm font-medium text-red-800">Query Error</h3>
                    </div>
                    <p className="text-sm text-red-700">{queryError}</p>
                  </div>
                )}

                {/* Results Display */}
                {queryResult && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <h3 className="text-sm font-medium text-green-800">Query Executed Successfully</h3>
                        </div>
                        <div className="text-sm text-green-700">
                          {queryResult.message} • {queryResult.executionTime}
                          {queryResult.rowCount !== undefined && ` • ${queryResult.rowCount} row(s)`}
                        </div>
                      </div>
                    </div>
                    
                    {queryResult.rows && queryResult.rows.length > 0 && (
                      <div className="overflow-x-auto border border-gray-200 rounded-md">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {queryResult.columns.map((col: string) => (
                                <th key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {queryResult.rows.slice(0, 100).map((row: any, idx: number) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                {queryResult.columns.map((col: string) => (
                                  <td key={col} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                    {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-gray-400">NULL</span>}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {queryResult.rows.length > 100 && (
                          <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600 border-t border-gray-200">
                            Showing first 100 of {queryResult.rows.length} rows
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Database Statistics</h3>
            <p className="text-gray-500 mb-4">Unable to connect to the database or fetch statistics.</p>
            <button
              onClick={handleRefresh}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DatabaseStatusPage() {
  return (
    <ProtectedRoute requiredPermission="admin:database">
      <DatabaseStatusContent />
    </ProtectedRoute>
  );
} 
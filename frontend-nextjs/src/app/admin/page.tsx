'use client';

import { useRouter } from 'next/navigation';
import { Users, Shield, ArrowLeft, Database, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

function AdminDashboardContent() {
  const router = useRouter();
  const { user } = useAuth();

  const adminCards = [
    {
      title: 'User Management',
      description: 'Create, edit, and manage user accounts',
      icon: Users,
      path: '/admin/users',
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Role & Permissions',
      description: 'Manage roles and assign permissions',
      icon: Shield,
      path: '/admin/roles',
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'System Settings',
      description: 'Configure application settings',
      icon: Settings,
      path: '/admin/settings',
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Database Status',
      description: 'View database statistics and health',
      icon: Database,
      path: '/admin/database',
      color: 'from-orange-500 to-orange-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </button>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">
              Welcome back, <span className="font-semibold">{user?.username}</span>. 
              Manage your VEX Scouting platform from here.
            </p>
          </div>
        </div>

        {/* Admin Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {adminCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.path}
                onClick={() => router.push(card.path)}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group border border-gray-200 hover:border-gray-300"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${card.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {card.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {card.description}
                  </p>
                  <div className="mt-4 flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700">
                    <span>Manage</span>
                    <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-600">Total Users</p>
                  <p className="text-2xl font-bold text-blue-900">-</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <Shield className="w-8 h-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-600">Active Roles</p>
                  <p className="text-2xl font-bold text-purple-900">-</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <Database className="w-8 h-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-600">Teams in DB</p>
                  <p className="text-2xl font-bold text-green-900">-</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute requiredPermission="admin:access">
      <AdminDashboardContent />
    </ProtectedRoute>
  );
} 
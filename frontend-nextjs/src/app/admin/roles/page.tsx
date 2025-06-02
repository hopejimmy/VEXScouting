'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Plus, Edit, Trash2, Users, Key, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface Permission {
  id: number;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  user_count: number;
  permissions: Permission[];
  created_at: string;
}

function RoleManagementContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRoles, setExpandedRoles] = useState<Set<number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const fetchRolesAndPermissions = async () => {
    try {
      setLoading(true);
      // TODO: Implement API calls
      // const [rolesResponse, permissionsResponse] = await Promise.all([
      //   authApi.get('/admin/roles'),
      //   authApi.get('/admin/permissions')
      // ]);
      
      // Mock data for now
      const mockPermissions: Permission[] = [
        { id: 1, name: 'admin:access', description: 'Access admin dashboard', category: 'Admin' },
        { id: 2, name: 'admin:users', description: 'Manage users', category: 'Admin' },
        { id: 3, name: 'admin:roles', description: 'Manage roles and permissions', category: 'Admin' },
        { id: 4, name: 'upload:create', description: 'Upload match data', category: 'Data' },
        { id: 5, name: 'data:view', description: 'View match data', category: 'Data' },
        { id: 6, name: 'team:favorite', description: 'Favorite teams', category: 'Teams' },
      ];

      const mockRoles: Role[] = [
        {
          id: 1,
          name: 'Administrator',
          description: 'Full system access with all permissions',
          user_count: 1,
          permissions: mockPermissions,
          created_at: '2024-01-15T10:30:00Z'
        },
        {
          id: 2,
          name: 'Coach',
          description: 'Team coach with data upload and management capabilities',
          user_count: 3,
          permissions: mockPermissions.filter(p => ['upload:create', 'data:view', 'team:favorite'].includes(p.name)),
          created_at: '2024-02-01T09:15:00Z'
        },
        {
          id: 3,
          name: 'Scout',
          description: 'Team scout with viewing permissions only',
          user_count: 5,
          permissions: mockPermissions.filter(p => ['data:view', 'team:favorite'].includes(p.name)),
          created_at: '2024-02-15T14:20:00Z'
        }
      ];

      setPermissions(mockPermissions);
      setRoles(mockRoles);
    } catch (error) {
      console.error('Failed to fetch roles and permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRoleExpanded = (roleId: number) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(roleId)) {
      newExpanded.delete(roleId);
    } else {
      newExpanded.add(roleId);
    }
    setExpandedRoles(newExpanded);
  };

  const handleDeleteRole = async (roleId: number) => {
    if (confirm('Are you sure you want to delete this role?')) {
      try {
        // TODO: Implement API call to delete role
        setRoles(roles.filter(r => r.id !== roleId));
      } catch (error) {
        console.error('Failed to delete role:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

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
          
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Role & Permissions</h1>
                <p className="text-gray-600">Manage user roles and their associated permissions</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Role
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading roles and permissions...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Roles List */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Roles ({roles.length})</h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {roles.map((role) => (
                  <div key={role.id}>
                    <div className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => toggleRoleExpanded(role.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {expandedRoles.has(role.id) ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </button>
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <Shield className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{role.name}</h3>
                            <p className="text-sm text-gray-500">{role.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="flex items-center text-sm text-gray-500">
                              <Users className="w-4 h-4 mr-1" />
                              {role.user_count} users
                            </div>
                            <div className="text-xs text-gray-400">
                              Created {formatDate(role.created_at)}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {/* TODO: Edit role */}}
                              className="text-purple-600 hover:text-purple-900 p-1"
                              title="Edit role"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRole(role.id)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete role"
                              disabled={role.id === 1} // Can't delete admin role
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {expandedRoles.has(role.id) && (
                      <div className="px-6 pb-4 bg-gray-50">
                        <div className="pl-9">
                          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                            <Key className="w-4 h-4 mr-2" />
                            Permissions ({role.permissions.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {role.permissions.map((permission) => (
                              <div
                                key={permission.id}
                                className="bg-white border border-gray-200 rounded-lg p-3"
                              >
                                <div className="text-sm font-medium text-gray-900">{permission.name}</div>
                                <div className="text-xs text-gray-500">{permission.description}</div>
                                <div className="text-xs text-purple-600 mt-1">{permission.category}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Available Permissions */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Available Permissions</h2>
                <p className="text-sm text-gray-600">System permissions that can be assigned to roles</p>
              </div>
              
              <div className="p-6">
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category} className="mb-6 last:mb-0">
                    <h3 className="text-md font-medium text-gray-900 mb-3">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {perms.map((permission) => (
                        <div
                          key={permission.id}
                          className="border border-gray-200 rounded-lg p-3 hover:border-purple-300 transition-colors"
                        >
                          <div className="text-sm font-medium text-gray-900">{permission.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{permission.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Create Role Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Create New Role</h3>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter role name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={3}
                      placeholder="Enter role description"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
                    <div className="space-y-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                      {Object.entries(groupedPermissions).map(([category, perms]) => (
                        <div key={category}>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">{category}</h4>
                          <div className="space-y-2 ml-4">
                            {perms.map((permission) => (
                              <label key={permission.id} className="flex items-start space-x-2">
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                                <div>
                                  <div className="text-sm text-gray-900">{permission.name}</div>
                                  <div className="text-xs text-gray-500">{permission.description}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {/* TODO: Create role */}}
                  className="px-4 py-2 text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  Create Role
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoleManagementPage() {
  return (
    <ProtectedRoute requiredPermission="admin:roles">
      <RoleManagementContent />
    </ProtectedRoute>
  );
} 
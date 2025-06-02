'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings, Save, Key, Globe, Database, Shield, Mail, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface SystemSettings {
  robotevents_api_token: string;
  current_season_id: string;
  jwt_expires_in: string;
  admin_email: string;
  site_name: string;
  maintenance_mode: boolean;
  allow_registration: boolean;
  default_role_id: string;
  session_timeout: string;
  max_upload_size: string;
}

function SystemSettingsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>({
    robotevents_api_token: '',
    current_season_id: '190',
    jwt_expires_in: '7d',
    admin_email: 'admin@vexscouting.com',
    site_name: 'VEX Scouting Platform',
    maintenance_mode: false,
    allow_registration: false,
    default_role_id: '3',
    session_timeout: '24h',
    max_upload_size: '10MB'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // TODO: Implement API call to fetch settings
      // const response = await authApi.get('/admin/settings');
      // setSettings(response.data);
      
      // Mock loading delay
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      // TODO: Implement API call to save settings
      // await authApi.put('/admin/settings', settings);
      
      // Mock save delay
      setTimeout(() => {
        setSaving(false);
        alert('Settings saved successfully!');
      }, 1500);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof SystemSettings, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const tabs = [
    { id: 'general', name: 'General', icon: Globe },
    { id: 'api', name: 'API Configuration', icon: Key },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
              <input
                type="text"
                value={settings.site_name}
                onChange={(e) => updateSetting('site_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="VEX Scouting Platform"
              />
              <p className="text-sm text-gray-500 mt-1">The name displayed in the header and browser title</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
              <input
                type="email"
                value={settings.admin_email}
                onChange={(e) => updateSetting('admin_email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="admin@vexscouting.com"
              />
              <p className="text-sm text-gray-500 mt-1">Primary contact email for system notifications</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Role for New Users</label>
              <select
                value={settings.default_role_id}
                onChange={(e) => updateSetting('default_role_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="2">Coach</option>
                <option value="3">Scout</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">Role automatically assigned to new user registrations</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Upload Size</label>
              <select
                value={settings.max_upload_size}
                onChange={(e) => updateSetting('max_upload_size', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="5MB">5 MB</option>
                <option value="10MB">10 MB</option>
                <option value="25MB">25 MB</option>
                <option value="50MB">50 MB</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">Maximum file size for data uploads</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Maintenance Mode</h4>
                  <p className="text-sm text-gray-500">Temporarily disable access for maintenance</p>
                </div>
                <button
                  onClick={() => updateSetting('maintenance_mode', !settings.maintenance_mode)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                    settings.maintenance_mode ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.maintenance_mode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Allow Registration</h4>
                  <p className="text-sm text-gray-500">Allow new users to create accounts</p>
                </div>
                <button
                  onClick={() => updateSetting('allow_registration', !settings.allow_registration)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                    settings.allow_registration ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.allow_registration ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">RobotEvents API Token</label>
              <input
                type="password"
                value={settings.robotevents_api_token}
                onChange={(e) => updateSetting('robotevents_api_token', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."
              />
              <p className="text-sm text-gray-500 mt-1">
                API token from <a href="https://www.robotevents.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">RobotEvents.com</a> for fetching team and event data
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Season ID</label>
              <input
                type="text"
                value={settings.current_season_id}
                onChange={(e) => updateSetting('current_season_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="190"
              />
              <p className="text-sm text-gray-500 mt-1">
                VRC season ID for the current competition year (High Stakes = 190)
              </p>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">JWT Token Expiration</label>
              <select
                value={settings.jwt_expires_in}
                onChange={(e) => updateSetting('jwt_expires_in', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="1h">1 Hour</option>
                <option value="6h">6 Hours</option>
                <option value="24h">24 Hours</option>
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">How long authentication tokens remain valid</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout</label>
              <select
                value={settings.session_timeout}
                onChange={(e) => updateSetting('session_timeout', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="1h">1 Hour</option>
                <option value="6h">6 Hours</option>
                <option value="24h">24 Hours</option>
                <option value="7d">7 Days</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">Automatically log users out after this period of inactivity</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">Security Recommendations</h4>
                  <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                    <li>• Use shorter token expiration times for production</li>
                    <li>• Regularly rotate API tokens</li>
                    <li>• Monitor failed login attempts</li>
                    <li>• Keep the system updated</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">Notification Settings</h4>
                  <p className="text-sm text-blue-700 mt-1">Configure system notifications and alerts (Coming Soon)</p>
                </div>
              </div>
            </div>

            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Email Notifications</h3>
              <p className="text-gray-500">Email notification settings will be available in a future update.</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="mb-4 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Admin Dashboard
          </button>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">System Settings</h1>
                <p className="text-gray-600">Configure application settings and preferences</p>
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading settings...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                        activeTab === tab.id
                          ? 'border-green-500 text-green-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {renderTabContent()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SystemSettingsPage() {
  return (
    <ProtectedRoute requiredPermission="admin:settings">
      <SystemSettingsContent />
    </ProtectedRoute>
  );
} 
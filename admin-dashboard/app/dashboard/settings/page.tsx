'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { Settings as SettingsIcon, Bell, Shield, Database } from 'lucide-react';

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure application settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <Bell className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            </div>
            <p className="text-gray-600 text-sm">Configure notification preferences and rules</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Security</h3>
            </div>
            <p className="text-gray-600 text-sm">Manage security settings and access controls</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <Database className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Database</h3>
            </div>
            <p className="text-gray-600 text-sm">Database backup and maintenance options</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <SettingsIcon className="w-6 h-6 text-amber-600" />
              <h3 className="text-lg font-semibold text-gray-900">General</h3>
            </div>
            <p className="text-gray-600 text-sm">General application configuration</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

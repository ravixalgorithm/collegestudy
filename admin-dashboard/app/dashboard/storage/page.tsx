'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { FolderOpen, HardDrive } from 'lucide-react';

export default function StoragePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">File Storage</h1>
          <p className="text-gray-600 mt-1">Manage uploaded files and storage usage</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <HardDrive className="w-10 h-10 text-blue-500 mb-3" />
            <p className="text-sm text-gray-600">Storage Used</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">2.4 GB</p>
            <p className="text-sm text-gray-500 mt-1">of 10 GB</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <FolderOpen className="w-10 h-10 text-green-500 mb-3" />
            <p className="text-sm text-gray-600">Total Files</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">1,234</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <FolderOpen className="w-10 h-10 text-purple-500 mb-3" />
            <p className="text-sm text-gray-600">File Types</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">PDF, DOCX</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
          <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">File Browser</h3>
          <p className="text-gray-600">Browse and manage all uploaded files</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

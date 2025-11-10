'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { HelpCircle, Book, MessageCircle, FileText } from 'lucide-react';

export default function HelpPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Help & Support</h1>
          <p className="text-gray-600 mt-1">Get help and access documentation</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
            <Book className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Documentation</h3>
            <p className="text-gray-600 text-sm">Complete guide to using the admin dashboard</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-green-300 transition-colors cursor-pointer">
            <MessageCircle className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Support</h3>
            <p className="text-gray-600 text-sm">Contact support team for assistance</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
            <FileText className="w-12 h-12 text-purple-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Changelog</h3>
            <p className="text-gray-600 text-sm">View recent updates and changes</p>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Quick Tips</h3>
          <ul className="space-y-2 text-blue-800">
            <li>• Use the search bar to quickly find users, notes, or events</li>
            <li>• Click on stats cards to view detailed breakdowns</li>
            <li>• Use keyboard shortcuts for faster navigation</li>
            <li>• Export data as CSV for external analysis</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}

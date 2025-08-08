'use client';

import { Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TechnicianAutoAssign from '../../../../../components/technician-auto-assign';

export default function TechnicianAutoAssignTab() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <Bot className="w-6 h-6 text-blue-600" />
          Technician Auto Assignment
        </h2>
        <p className="text-slate-600 mt-2">
          Configure global load balancing settings for automatic technician assignment
        </p>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        <TechnicianAutoAssign />
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type Strategy = 'load_balancing' | 'round_robin' | 'random' | 'least_load';

export default function TechnicianAutoAssign() {
  const [strategy, setStrategy] = useState<Strategy>('load_balancing');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings/auto-assign');
        if (res.ok) {
          const data = await res.json();
          if (data?.strategy) setStrategy(data.strategy === 'least_load' ? 'load_balancing' : data.strategy);
        }
      } catch (e) {
        console.error('Failed to load auto-assign strategy', e);
      }
    })();
  }, []);

  const saveStrategy = async (val: Strategy) => {
    try {
      setSaving(true);
      const res = await fetch('/api/settings/auto-assign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
  // Normalize to new value; backend also normalizes legacy values
  body: JSON.stringify({ strategy: val === 'least_load' ? 'load_balancing' : val })
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      setStrategy(data.strategy);
  const disp = String(data.strategy).replace('_', ' ');
  toast?.({ title: 'Saved', description: `Global strategy set to ${disp}` });
    } catch (e) {
      console.error(e);
      toast?.({ title: 'Error', description: 'Failed to save strategy', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
              Global Auto Assignment
            </CardTitle>
            <p className="text-xs text-slate-600 mt-1">
              Choose one strategy to assign technicians across all templates
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Global Auto-Assign Strategy</label>
          <div className="flex items-center gap-3">
            <Select
              value={strategy}
              onValueChange={(val) => saveStrategy(val as Strategy)}
              disabled={saving}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="load_balancing">Load Balancing</SelectItem>
                <SelectItem value="round_robin">Round Robin</SelectItem>
                <SelectItem value="random">Random</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-xs">Current: {String(strategy === 'least_load' ? 'load_balancing' : strategy).replace('_', ' ')}</Badge>
          </div>
          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Settings className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Global Auto Assignment</p>
                <p className="text-blue-700">
                  This strategy is used for all templates when auto-assignment runs. If a template has specific support groups, the same strategy will be applied to those groups.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

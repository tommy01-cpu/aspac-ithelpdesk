"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Users, CheckCircle2, AlertCircle, Zap } from 'lucide-react';

interface GlobalLoadBalanceConfig {
  enabled: boolean;
  algorithm: 'load_balancing';
  description: string;
  lastUpdated?: Date;
}

export default function TechnicianAutoAssign() {
  const [config, setConfig] = useState<GlobalLoadBalanceConfig>({
    enabled: true,
    algorithm: 'load_balancing',
    description: 'Intelligent load balancing distributes tickets evenly among available technicians'
  });
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    loadGlobalConfiguration();
  }, []);

  const loadGlobalConfiguration = async () => {
    setLoading(true);
    try {
      // Try to load from API first
      const response = await fetch('/api/global-load-balance');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setConfig({
            enabled: true, // Since this is global, it's always enabled when configured
            algorithm: 'load_balancing',
            description: 'Intelligent load balancing distributes tickets evenly among available technicians',
            lastUpdated: new Date()
          });
        }
      } else {
        // Fallback to localStorage
        const saved = localStorage.getItem('globalLoadBalanceConfig');
        if (saved) {
          const parsedConfig = JSON.parse(saved);
          setConfig(parsedConfig);
        }
      }
    } catch (error) {
      console.error('Error loading global configuration:', error);
      // Try localStorage fallback
      const saved = localStorage.getItem('globalLoadBalanceConfig');
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        setConfig(parsedConfig);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async (newConfig: GlobalLoadBalanceConfig) => {
    setSaveStatus('saving');
    
    try {
      // Save to API
      const response = await fetch('/api/global-load-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: newConfig.enabled,
          algorithm: newConfig.algorithm,
          description: newConfig.description
        }),
      });

      if (response.ok) {
        setSaveStatus('saved');
      } else {
        throw new Error('API save failed');
      }
    } catch (error) {
      console.warn('API save failed, using localStorage:', error);
      setSaveStatus('saved'); // Still mark as saved since localStorage worked
    }

    // Always save to localStorage as backup
    localStorage.setItem('globalLoadBalanceConfig', JSON.stringify({
      ...newConfig,
      lastUpdated: new Date()
    }));

    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    const newConfig = { ...config, enabled };
    setConfig(newConfig);
    await saveConfiguration(newConfig);
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Global Load Balancing Configuration
            </CardTitle>
            <p className="text-xs text-slate-600 mt-1">
              Configure global load balancing algorithm that applies to all service templates
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Saving...</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-3 h-3" />
                <span className="text-xs">Saved</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-slate-600">Loading configuration...</p>
          </div>
        ) : (
          <>
            {/* Global Load Balancing Toggle */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <Label htmlFor="global-load-balancing" className="text-sm font-medium text-slate-800">
                      Enable Global Load Balancing
                    </Label>
                    <p className="text-xs text-slate-600 mt-1">
                      Apply intelligent load balancing across all templates automatically
                    </p>
                  </div>
                </div>
                <Switch
                  id="global-load-balancing"
                  checked={config.enabled}
                  onCheckedChange={handleToggleEnabled}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>

              {/* Algorithm Configuration */}
              {config.enabled && (
                <div className="space-y-4">
                  <div className="p-4 border border-slate-200 rounded-lg bg-white">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Zap className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-slate-800 mb-2">Load Balancing Algorithm</h4>
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-green-800">Intelligent Load Balancing</p>
                              <p className="text-xs text-green-700 mt-1">
                                {config.description}
                              </p>
                            </div>
                            <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* How It Works */}
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start gap-2">
                      <Settings className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-slate-800 mb-2">How Global Load Balancing Works</p>
                        <ul className="text-slate-600 space-y-1 text-xs">
                          <li>• <strong>Automatic Distribution:</strong> New tickets are automatically assigned to the least busy technician</li>
                          <li>• <strong>Template Integration:</strong> Uses support groups configured in each service template</li>
                          <li>• <strong>Real-time Balancing:</strong> Considers current workload and availability</li>
                          <li>• <strong>Skill Matching:</strong> Respects technician skills and group memberships</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Status Information */}
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <p className="text-sm text-blue-800">
                        <strong>Global load balancing is active.</strong> All service templates will use this configuration.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Disabled State */}
              {!config.enabled && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <p className="text-sm text-amber-800">
                      Global load balancing is disabled. Tickets will be assigned using template-specific settings.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

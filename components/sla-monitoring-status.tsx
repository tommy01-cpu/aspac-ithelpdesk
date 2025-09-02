"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, Database, Play, RefreshCw } from 'lucide-react';

interface ServiceStatus {
  basic: {
    isProcessing: boolean;
    isAutoClosing: boolean;
    lastRun: string;
    uptime: string;
    instance: string;
  };
  health: {
    status: 'healthy' | 'processing' | 'error';
    slaMonitoring: {
      isRunning: boolean;
      lastCheck: string;
      nextCheck: string;
    };
    autoClose: {
      isRunning: boolean;
      lastCheck: string;
      nextCheck: string;
    };
    database: {
      connected: boolean;
      error?: string;
    };
    timestamp: string;
  };
  service: {
    name: string;
    version: string;
    environment: string;
  };
}

export default function SLAMonitoringStatus() {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sla-monitoring/status');
      const result = await response.json();
      
      if (result.success) {
        setStatus(result.data);
        setLastUpdated(new Date());
      } else {
        console.error('Failed to fetch status:', result.error);
      }
    } catch (error) {
      console.error('Error fetching SLA monitoring status:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerAction = async (action: 'trigger-sla' | 'trigger-autoclose') => {
    setTriggering(action);
    try {
      const response = await fetch('/api/sla-monitoring/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`${action} triggered successfully:`, result.result);
        // Refresh status after trigger
        setTimeout(() => fetchStatus(), 1000);
      } else {
        console.error(`Failed to trigger ${action}:`, result.error);
      }
    } catch (error) {
      console.error(`Error triggering ${action}:`, error);
    } finally {
      setTriggering(null);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Healthy</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  if (!status) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Loading SLA monitoring status...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SLA Monitoring Status</h1>
          <p className="text-gray-600">Real-time status of the SLA monitoring service</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Service Overview
            {getStatusBadge(status.health.status)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Service Name</p>
              <p className="font-semibold">{status.service.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Version</p>
              <p className="font-semibold">{status.service.version}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Environment</p>
              <p className="font-semibold capitalize">{status.service.environment}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Uptime</p>
              <p className="font-semibold">{status.basic.uptime}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="flex items-center gap-2">
                {status.health.database.connected ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Connected
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    Disconnected
                  </>
                )}
              </p>
              {status.health.database.error && (
                <p className="text-sm text-red-600 mt-1">{status.health.database.error}</p>
              )}
            </div>
            <Badge variant={status.health.database.connected ? "default" : "destructive"}>
              {status.health.database.connected ? "Online" : "Offline"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* SLA Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle>SLA Monitoring Process</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Current Status</p>
                <p className="text-sm text-gray-600">
                  {status.basic.isProcessing ? 'Currently processing SLA checks...' : 'Waiting for next check cycle'}
                </p>
              </div>
              <Badge variant={status.basic.isProcessing ? "default" : "secondary"}>
                {status.basic.isProcessing ? "Running" : "Idle"}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Last Check</p>
                <p className="font-semibold">{formatTime(status.health.slaMonitoring.lastCheck)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Next Check</p>
                <p className="font-semibold">{formatTime(status.health.slaMonitoring.nextCheck)}</p>
              </div>
            </div>

            <Button 
              onClick={() => triggerAction('trigger-sla')}
              disabled={triggering === 'trigger-sla' || status.basic.isProcessing}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {triggering === 'trigger-sla' ? 'Triggering...' : 'Trigger SLA Check'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Close Process */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Close Process</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Current Status</p>
                <p className="text-sm text-gray-600">
                  {status.basic.isAutoClosing ? 'Currently processing auto-close...' : 'Waiting for next auto-close cycle'}
                </p>
              </div>
              <Badge variant={status.basic.isAutoClosing ? "default" : "secondary"}>
                {status.basic.isAutoClosing ? "Running" : "Idle"}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Last Check</p>
                <p className="font-semibold">{formatTime(status.health.autoClose.lastCheck)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Next Check</p>
                <p className="font-semibold">{formatTime(status.health.autoClose.nextCheck)}</p>
              </div>
            </div>

            <Button 
              onClick={() => triggerAction('trigger-autoclose')}
              disabled={triggering === 'trigger-autoclose' || status.basic.isAutoClosing}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {triggering === 'trigger-autoclose' ? 'Triggering...' : 'Trigger Auto-Close'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {lastUpdated?.toLocaleString() || 'Never'} • 
        Auto-refresh every 30 seconds
      </div>
    </div>
  );
}

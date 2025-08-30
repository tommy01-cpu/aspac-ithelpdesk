'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface ServiceStatus {
  initialized: boolean;
  services: Record<string, { status: string; details?: any }>;
  totalServices: number;
  timestamp?: string;
}

export default function BackgroundServiceMonitor() {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/background-services');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data);
      } else {
        console.error('Failed to fetch status:', data.error);
      }
    } catch (error) {
      console.error('Error fetching service status:', error);
    }
  };

  const handleAction = async (action: string, service?: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/background-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, service })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: `${action} completed successfully`,
        });
        
        // Refresh status after action
        setTimeout(fetchStatus, 1000);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Operation failed',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to perform action',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (serviceStatus: string) => {
    switch (serviceStatus) {
      case 'running':
        return <Badge className="bg-green-100 text-green-800">Running</Badge>;
      case 'stopped':
        return <Badge variant="secondary">Stopped</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🔄 Loading Background Service Status...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
          ⚙️ Background Service Monitor
          <Badge variant={status.initialized ? "default" : "secondary"}>
            {status.initialized ? 'Initialized' : 'Not Initialized'}
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Last updated: {status.timestamp ? new Date(status.timestamp).toLocaleString() : 'Unknown'}
        </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={() => handleAction('status')} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              🔄 Refresh Status
            </Button>
            <Button 
              onClick={() => handleAction('initialize')} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              🚀 Initialize Services
            </Button>
            <Button 
              onClick={() => handleAction('shutdown')} 
              variant="destructive" 
              size="sm"
              disabled={loading}
            >
              🛑 Stop All Services
            </Button>
          </div>

          <Separator />

          {/* Service Status */}
          <div>
            <h3 className="font-semibold mb-3">Services ({status.totalServices})</h3>
            <div className="space-y-3">
              {Object.entries(status.services).map(([serviceName, serviceData]) => (
                <Card key={serviceName} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium capitalize">
                        {serviceName === 'holidays' ? '🎉 Holiday Generator' : 
                         serviceName === 'approvals' ? '📧 Approval Reminders' : 
                         `🔧 ${serviceName}`}
                      </span>
                      {getStatusBadge(serviceData.status)}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleAction('trigger', serviceName)} 
                        variant="outline" 
                        size="sm"
                        disabled={loading}
                      >
                        ▶️ Test Run
                      </Button>
                      <Button 
                        onClick={() => handleAction('restart', serviceName)} 
                        variant="outline" 
                        size="sm"
                        disabled={loading}
                      >
                        🔄 Restart
                      </Button>
                    </div>
                  </div>
                  
                  {serviceData.details && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {typeof serviceData.details === 'string' ? 
                        serviceData.details : 
                        JSON.stringify(serviceData.details)}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {Object.keys(status.services).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No background services detected. Click "Initialize Services" to start them.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Schedules Info */}
      <Card>
        <CardHeader>
          <CardTitle>📅 Service Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <h4 className="font-medium">🎉 Holiday Generator</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Runs daily at <strong>12:00 AM (midnight)</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Automatically generates recurring holidays for the coming year when Q4 starts
              </p>
            </div>
            
            <div className="p-3 border rounded-lg">
              <h4 className="font-medium">📧 Approval Reminders</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Runs daily at <strong>8:00 AM</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Sends email reminders for pending approvals (max 5 emails per batch)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

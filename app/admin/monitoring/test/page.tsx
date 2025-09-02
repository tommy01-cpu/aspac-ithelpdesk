"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SLATestPage() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testEndpoint = async (endpoint: string, method = 'GET', body?: any) => {
    setLoading(true);
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(endpoint, options);
      const result = await response.json();
      
      setResults({
        endpoint,
        method,
        status: response.status,
        success: response.ok,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setResults({
        endpoint,
        method,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SLA Monitoring Service Test</h1>
        <p className="text-gray-600">Test the SLA monitoring service endpoints</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Button 
          onClick={() => testEndpoint('/api/sla-monitoring/status')}
          disabled={loading}
          className="h-20 flex flex-col items-center justify-center"
        >
          <span className="font-semibold">Test Status</span>
          <span className="text-xs">GET /api/sla-monitoring/status</span>
        </Button>

        <Button 
          onClick={() => testEndpoint('/api/sla-monitoring/status', 'POST', { action: 'trigger-sla' })}
          disabled={loading}
          variant="outline"
          className="h-20 flex flex-col items-center justify-center"
        >
          <span className="font-semibold">Trigger SLA</span>
          <span className="text-xs">POST trigger-sla</span>
        </Button>

        <Button 
          onClick={() => testEndpoint('/api/sla-monitoring/status', 'POST', { action: 'trigger-autoclose' })}
          disabled={loading}
          variant="outline"
          className="h-20 flex flex-col items-center justify-center"
        >
          <span className="font-semibold">Trigger Auto-Close</span>
          <span className="text-xs">POST trigger-autoclose</span>
        </Button>
      </div>

      {loading && (
        <div className="text-center">
          <p>Testing endpoint...</p>
        </div>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Test Results
              <span className={`px-2 py-1 rounded text-sm ${results.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {results.success ? 'SUCCESS' : 'FAILED'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <strong>Endpoint:</strong> {results.method} {results.endpoint}
              </div>
              <div>
                <strong>Status:</strong> {results.status}
              </div>
              <div>
                <strong>Timestamp:</strong> {new Date(results.timestamp).toLocaleString()}
              </div>
              {results.error && (
                <div>
                  <strong>Error:</strong> 
                  <pre className="bg-red-50 p-2 rounded mt-1 text-sm">{results.error}</pre>
                </div>
              )}
              {results.data && (
                <div>
                  <strong>Response:</strong>
                  <pre className="bg-gray-50 p-2 rounded mt-1 text-sm overflow-auto max-h-96">
                    {JSON.stringify(results.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How to Test</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>Test Status:</strong> Checks if the SLA monitoring service is running</li>
            <li><strong>Trigger SLA:</strong> Manually triggers SLA compliance checking</li>
            <li><strong>Trigger Auto-Close:</strong> Manually triggers auto-close of resolved requests</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Bell, Mail, CheckCircle, XCircle } from 'lucide-react';

export default function NotificationTestPage() {
  const [loading, setLoading] = useState(false);
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [notificationResult, setNotificationResult] = useState<{ success: boolean; message: string } | null>(null);

  const testEmail = async () => {
    setLoading(true);
    setEmailResult(null);
    
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email' }),
      });
      
      const data = await response.json();
      setEmailResult({ success: data.success, message: data.message });
      
      if (data.success) {
        toast({ title: 'Success', description: data.message });
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (error) {
      setEmailResult({ success: false, message: 'Failed to test email' });
      toast({ title: 'Error', description: 'Failed to test email', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async () => {
    setLoading(true);
    setNotificationResult(null);
    
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'notification' }),
      });
      
      const data = await response.json();
      setNotificationResult({ success: data.success, message: data.message });
      
      if (data.success) {
        toast({ title: 'Success', description: data.message });
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (error) {
      setNotificationResult({ success: false, message: 'Failed to test notification' });
      toast({ title: 'Error', description: 'Failed to test notification', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const ResultIndicator = ({ result }: { result: { success: boolean; message: string } | null }) => {
    if (!result) return null;
    
    return (
      <div className={`flex items-center mt-2 p-2 rounded ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {result.success ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
        <span className="text-sm">{result.message}</span>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Notification System Test</h1>
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="w-5 h-5 mr-2 text-blue-600" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Test the email notification system. This will send a test email to your registered address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testEmail} disabled={loading} className="w-full">
              {loading ? 'Sending...' : 'Send Test Email'}
            </Button>
            <ResultIndicator result={emailResult} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="w-5 h-5 mr-2 text-green-600" />
              In-App Notifications
            </CardTitle>
            <CardDescription>
              Test the in-app notification system. This will create a test notification you can see in the notification dropdown.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testNotification} disabled={loading} className="w-full">
              {loading ? 'Creating...' : 'Create Test Notification'}
            </Button>
            <ResultIndicator result={notificationResult} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How to Test the Full System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">1. Test Notifications:</h3>
            <p className="text-sm text-muted-foreground">
              Click the buttons above to test individual notification components.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold">2. Test Request Creation with Approvals:</h3>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
              <li>Go to the request creation page</li>
              <li>Select a service request template (which requires approval)</li>
              <li>Add approvers in the "Select Approvers" field</li>
              <li>Submit the request</li>
              <li>Check for notifications in the bell icon (top right)</li>
              <li>Check your email for approval notifications</li>
            </ol>
          </div>
          
          <div>
            <h3 className="font-semibold">3. Expected Notifications:</h3>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li><strong>Requester:</strong> "Your request has been created" (email + in-app)</li>
              <li><strong>Approvers:</strong> "Approval required for Request #X" (email + in-app)</li>
              <li><strong>CC Recipients:</strong> Email notifications (if any specified)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

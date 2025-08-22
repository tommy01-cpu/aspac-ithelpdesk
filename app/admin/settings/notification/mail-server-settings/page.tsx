'use client';

import { useState, useEffect } from 'react';
import { Save, TestTube, Mail, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface SMTPSettings {
  serverName: string;
  alternateServerName?: string;
  senderName: string;
  replyTo: string;
  protocol: string;
  port: number;
  username: string;
  password: string;
}

const defaultSettings: SMTPSettings = {
  serverName: 'smtp.gmail.com',
  alternateServerName: '',
  senderName: 'IT Helpdesk',
  replyTo: 'no-reply@aspacphils.com.ph',
  protocol: 'SMTP',
  port: 587,
  username: '',
  password: ''
};

export default function MailServerSettings() {
  const [settings, setSettings] = useState<SMTPSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const { toast } = useToast();

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/mail-settings');
      
      if (response.ok) {
        const data = await response.json();
        const mergedSettings = { ...defaultSettings, ...data };
        setSettings(mergedSettings);
      } else {
        console.error('Failed to load settings, response not ok:', response.status);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleInputChange = (field: keyof SMTPSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear connection status when settings change
    if (connectionStatus !== 'unknown') {
      setConnectionStatus('unknown');
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/mail-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Settings Saved",
          description: "Mail server settings have been saved to the database successfully.",
        });
        console.log('Email configuration saved:', result);
        // Reset connection status after saving new settings
        setConnectionStatus('unknown');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!testEmail) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to test the connection.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection(true);
    try {
      const response = await fetch('/api/admin/mail-settings/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings,
          testEmail
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setConnectionStatus('success');
        toast({
          title: "Test Successful",
          description: "Test email sent successfully! Check your inbox.",
        });
      } else {
        setConnectionStatus('error');
        toast({
          title: "Test Failed",
          description: result.error || "Failed to send test email.",
          variant: "destructive",
        });
        console.error('Email test error:', result.error);
      }
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "Test Failed",
        description: "An error occurred while testing the connection.",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Mail Server Settings
              </CardTitle>
              <CardDescription>
                Configure SMTP settings for sending email notifications
              </CardDescription>
            </div>
            {connectionStatus === 'success' && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
            {connectionStatus === 'error' && (
              <Badge variant="destructive">
                <AlertCircle className="w-3 h-3 mr-1" />
                Connection Error
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* All Settings in One Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Server Name */}
            <div className="space-y-2">
              <Label htmlFor="serverName">Server Name / IP Address *</Label>
              <Input
                id="serverName"
                value={settings.serverName}
                onChange={(e) => handleInputChange('serverName', e.target.value)}
                placeholder="smtp.gmail.com"
              />
            </div>
            
            {/* Alternate Server */}
            <div className="space-y-2">
              <Label htmlFor="alternateServerName">Alternate Server Name/IP Address</Label>
              <Input
                id="alternateServerName"
                value={settings.alternateServerName || ''}
                onChange={(e) => handleInputChange('alternateServerName', e.target.value)}
                placeholder="Optional backup server"
              />
            </div>

            {/* Sender Name */}
            <div className="space-y-2">
              <Label htmlFor="senderName">Sender Name</Label>
              <Input
                id="senderName"
                value={settings.senderName}
                onChange={(e) => handleInputChange('senderName', e.target.value)}
                placeholder="IT Helpdesk"
              />
            </div>
            
            {/* Reply To */}
            <div className="space-y-2">
              <Label htmlFor="replyTo">Reply to *</Label>
              <Input
                id="replyTo"
                value={settings.replyTo}
                onChange={(e) => handleInputChange('replyTo', e.target.value)}
                placeholder="no-reply@aspacphils.com.ph"
              />
            </div>

            {/* Protocol */}
            <div className="space-y-2">
              <Label htmlFor="protocol">Protocol</Label>
              <Select
                value={settings.protocol}
                onValueChange={(value) => handleInputChange('protocol', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SMTP">SMTP</SelectItem>
                  <SelectItem value="SMTPS">SMTPS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Port */}
            <div className="space-y-2">
              <Label htmlFor="port">Port *</Label>
              <Input
                id="port"
                type="number"
                value={settings.port}
                onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 587)}
                placeholder="587"
              />
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={settings.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="your-email@gmail.com"
              />
              <p className="text-xs text-gray-500">For Gmail, use your full email address</p>
            </div>
            
            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={settings.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter password or app password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500">For Gmail, use an App Password instead of your regular password</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Test Mail Server Connection
          </CardTitle>
          <CardDescription>
            Send a test email to verify your configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="testEmail">Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleTestConnection}
                disabled={isTestingConnection || !testEmail}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <TestTube className="w-4 h-4" />
                {isTestingConnection ? 'Testing...' : 'Send a sample mail'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="flex items-center gap-2 px-6"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

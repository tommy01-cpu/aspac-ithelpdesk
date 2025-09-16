"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Save, Database, Clock, FolderOpen } from "lucide-react";

interface BackupSettings {
  id: number;
  backup_directory: string;
  backup_time: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export default function AutoBackupPage() {
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    backup_directory: "C:\\BackupDB",
    backup_time: "00:00",
    is_enabled: true
  });

  // Load current settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/backup-settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
          setFormData({
            backup_directory: data.settings.backup_directory || "C:\\BackupDB",
            backup_time: data.settings.backup_time || "00:00",
            is_enabled: data.settings.is_enabled ?? true
          });
        }
      }
    } catch (error) {
      console.error('Error loading backup settings:', error);
      toast({
        title: "Error",
        description: "Failed to load backup settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate time format
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(formData.backup_time)) {
        toast({
          title: "Invalid Time Format",
          description: "Please enter time in HH:MM format (24-hour)",
          variant: "destructive"
        });
        return;
      }

      // Validate directory
      if (!formData.backup_directory.trim()) {
        toast({
          title: "Invalid Directory",
          description: "Please enter a backup directory path",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch('/api/admin/backup-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        toast({
          title: "Success",
          description: "Backup settings saved successfully"
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving backup settings:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save backup settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Loading backup settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Auto Backup Configuration</h1>
        <p className="text-gray-600">Configure automatic database backup settings</p>
      </div>

      <div className="grid gap-6">
        {/* Main Settings Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              <CardTitle>Backup Settings</CardTitle>
            </div>
            <CardDescription>
              Configure backup directory and schedule time for automatic database backups
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable Backup */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">Enable Auto Backup</Label>
                <p className="text-sm text-gray-500">
                  Turn automatic backup on or off
                </p>
              </div>
              <Switch
                checked={formData.is_enabled}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, is_enabled: checked }))
                }
              />
            </div>

            {/* Backup Directory */}
            <div className="space-y-2">
              <Label htmlFor="backup_directory" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Backup Directory
              </Label>
              <Input
                id="backup_directory"
                type="text"
                value={formData.backup_directory}
                onChange={(e) => 
                  setFormData(prev => ({ ...prev, backup_directory: e.target.value }))
                }
                placeholder="C:\BackupDB"
                className="font-mono"
              />
              <p className="text-sm text-gray-500">
                Full path where backup files will be stored
              </p>
            </div>

            {/* Backup Time */}
            <div className="space-y-2">
              <Label htmlFor="backup_time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Backup Time
              </Label>
              <Input
                id="backup_time"
                type="time"
                value={formData.backup_time}
                onChange={(e) => 
                  setFormData(prev => ({ ...prev, backup_time: e.target.value }))
                }
                className="w-40"
              />
              <p className="text-sm text-gray-500">
                Daily backup time in 24-hour format (server time)
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Backup Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Databases to backup:</span>
                <ul className="mt-1 space-y-1 text-gray-600">
                  <li>• ithelpdesk_db</li>
                  <li>• ithelpdesk_attachments</li>
                </ul>
              </div>
              <div>
                <span className="font-medium text-gray-700">Backup format:</span>
                <p className="mt-1 text-gray-600">PostgreSQL custom format (.backup)</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">File naming:</span>
                <p className="mt-1 text-gray-600">YYMMDD [database_name].backup</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Current status:</span>
                <p className="mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    formData.is_enabled 
                      ? "bg-green-100 text-green-800" 
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {formData.is_enabled ? "Enabled" : "Disabled"}
                  </span>
                </p>
              </div>
            </div>
            
            {settings && (
              <div className="pt-3 border-t">
                <p className="text-xs text-gray-500">
                  Last updated: {new Date(settings.updated_at).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

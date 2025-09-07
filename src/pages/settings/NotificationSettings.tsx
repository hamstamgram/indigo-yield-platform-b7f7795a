import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Bell, Save } from 'lucide-react';
import { getNotificationPrefs, updateNotificationPrefs } from '@/server/lp';
import { useAuth } from '@/context/AuthContext';

export default function NotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    dailyYieldEmail: true,
    monthlyStatementEmail: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const prefs = await getNotificationPrefs(user.id);
      setSettings(prefs);
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    try {
      setSaving(true);
      const result = await updateNotificationPrefs(user.id, settings);
      
      if (result.success) {
        toast.success('Notification preferences saved');
      } else {
        toast.error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="h-8 w-48 bg-gray-200 rounded mb-6 animate-pulse"></div>
          <Card>
            <CardContent className="p-6 space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 w-60 bg-gray-100 rounded animate-pulse"></div>
                  </div>
                  <div className="h-6 w-10 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Notification Settings</h1>
          <p className="text-gray-600">Manage how and when you receive notifications</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Email Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="daily-yield">Daily Yield Reports</Label>
                  <p className="text-sm text-gray-500">
                    Receive daily summaries of your yield earnings
                  </p>
                </div>
                <Switch
                  id="daily-yield"
                  checked={settings.dailyYieldEmail}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, dailyYieldEmail: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="monthly-statement">Monthly Statements</Label>
                  <p className="text-sm text-gray-500">
                    Receive monthly account statements and performance reports
                  </p>
                </div>
                <Switch
                  id="monthly-statement"
                  checked={settings.monthlyStatementEmail}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, monthlyStatementEmail: checked }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Preferences</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

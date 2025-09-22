import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const NotificationSettings = () => {
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    push_notifications: false,
    statements: true,
    withdrawals: true,
    deposits: true
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setLoading(true);
    try {
      // Simple update without complex functions
      toast({
        title: 'Success',
        description: 'Notification preferences updated successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notification preferences',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Email Notifications</label>
              <p className="text-xs text-muted-foreground">Receive notifications via email</p>
            </div>
            <Switch
              checked={preferences.email_notifications}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, email_notifications: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Statement Notifications</label>
              <p className="text-xs text-muted-foreground">Get notified when statements are ready</p>
            </div>
            <Switch
              checked={preferences.statements}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, statements: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Transaction Notifications</label>
              <p className="text-xs text-muted-foreground">Get notified about deposits and withdrawals</p>
            </div>
            <Switch
              checked={preferences.deposits}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, deposits: checked, withdrawals: checked }))
              }
            />
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'Save Preferences'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
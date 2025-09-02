import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, Monitor, Smartphone, Laptop, Tablet, LogOut, AlertTriangle, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { UserSession, AccessLog, AccessEvent } from '@/types/phase3Types';
import { formatDistanceToNow } from 'date-fns';

const DEVICE_ICONS: Record<string, React.ComponentType<{className?: string}>> = {
  desktop: Monitor,
  mobile: Smartphone,
  laptop: Laptop,
  tablet: Tablet,
  unknown: Monitor,
};

const ACCESS_EVENT_LABELS: Record<AccessEvent, string> = {
  login: 'Login',
  logout: 'Logout',
  '2fa_setup': '2FA Setup',
  '2fa_verify': '2FA Verification',
  session_revoked: 'Session Revoked',
  password_change: 'Password Change',
};

interface SessionWithLogs extends UserSession {
  access_logs?: AccessLog[];
}

const SessionManagementPage: React.FC = () => {
  const [sessions, setSessions] = useState<SessionWithLogs[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSessionData();
    loadAccessLogs();
  }, []);

  const loadSessionData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sessionsData, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .order('last_seen_at', { ascending: false });

      if (error) throw error;

      // Add current session if not in database
      if (sessionsData) {
        const currentSession: UserSession = {
          id: 'current',
          user_id: user.id,
          device_label: getCurrentDeviceLabel(),
          user_agent: navigator.userAgent,
          ip: '', // Would be populated by Edge Function
          created_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          revoked_at: undefined,
          revoked_by: undefined,
        };

        setSessions([currentSession, ...sessionsData]);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load session information',
        variant: 'destructive',
      });
    }
  };

  const loadAccessLogs = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: logsData, error } = await supabase
        .from('access_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (logsData) {
        setAccessLogs(logsData);
      }
    } catch (error) {
      console.error('Error loading access logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load access logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentDeviceLabel = (): string => {
    const ua = navigator.userAgent;
    if (ua.includes('Mobile') || ua.includes('Android')) return 'Mobile Device';
    if (ua.includes('iPad') || ua.includes('Tablet')) return 'Tablet';
    if (ua.includes('Macintosh')) return 'Mac';
    if (ua.includes('Windows')) return 'Windows PC';
    if (ua.includes('Linux')) return 'Linux PC';
    return 'Unknown Device';
  };

  const getDeviceType = (userAgent: string | undefined): string => {
    if (!userAgent) return 'unknown';
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android')) return 'mobile';
    if (ua.includes('ipad') || ua.includes('tablet')) return 'tablet';
    if (ua.includes('macintosh') || ua.includes('windows') || ua.includes('linux')) return 'laptop';
    return 'desktop';
  };

  const getDeviceIcon = (userAgent: string | undefined) => {
    const deviceType = getDeviceType(userAgent);
    const IconComponent = DEVICE_ICONS[deviceType];
    return <IconComponent className="w-5 h-5" />;
  };

  const getBrowserName = (userAgent: string | undefined): string => {
    if (!userAgent) return 'Unknown Browser';
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    if (ua.includes('opera')) return 'Opera';
    return 'Unknown Browser';
  };

  const getLocationFromIP = (ip: string | undefined): string => {
    // In a real implementation, this would use an IP geolocation service
    if (!ip) return 'Unknown Location';
    return 'Location Protected'; // For privacy
  };

  const revokeSession = async (sessionId: string) => {
    try {
      setRevokingSession(sessionId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      if (sessionId === 'current') {
        // Sign out current session
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        toast({
          title: 'Session Revoked',
          description: 'You have been signed out of this device',
        });
        return;
      }

      // Revoke other session
      const { error } = await supabase
        .from('user_sessions')
        .update({ 
          revoked_at: new Date().toISOString(),
          revoked_by: user.id
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Log the session revocation
      await supabase.from('access_logs').insert({
        user_id: user.id,
        event: 'session_revoked',
        device_label: 'Admin Action',
        success: true,
      });

      // Remove from UI
      setSessions(prev => prev.filter(session => session.id !== sessionId));

      toast({
        title: 'Session Revoked',
        description: 'The selected session has been terminated',
      });

    } catch (error) {
      console.error('Error revoking session:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke session',
        variant: 'destructive',
      });
    } finally {
      setRevokingSession(null);
    }
  };

  const revokeAllOtherSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('user_sessions')
        .update({ 
          revoked_at: new Date().toISOString(),
          revoked_by: user.id
        })
        .eq('user_id', user.id)
        .is('revoked_at', null);

      if (error) throw error;

      // Log the bulk session revocation
      await supabase.from('access_logs').insert({
        user_id: user.id,
        event: 'session_revoked',
        device_label: 'Bulk Revocation',
        success: true,
      });

      // Keep only current session in UI
      setSessions(prev => prev.filter(session => session.id === 'current'));

      toast({
        title: 'Sessions Revoked',
        description: 'All other sessions have been terminated',
      });

    } catch (error) {
      console.error('Error revoking all sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke other sessions',
        variant: 'destructive',
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Session Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage your active sessions and view recent account activity
          </p>
        </div>
        
        {sessions.length > 1 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Revoke All Others
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke All Other Sessions?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will sign you out of all other devices and browsers. 
                  You will remain signed in on this device.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={revokeAllOtherSessions}>
                  Revoke All Others
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Active Sessions ({sessions.length})
          </CardTitle>
          <CardDescription>
            Devices and browsers where you're currently signed in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    {getDeviceIcon(session.user_agent)}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {session.device_label || 'Unknown Device'}
                      </h4>
                      {session.id === 'current' && (
                        <Badge variant="default">Current Session</Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>{getBrowserName(session.user_agent)}</p>
                      <p className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {getLocationFromIP(session.ip)}
                      </p>
                      <p className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last active: {formatTimeAgo(session.last_seen_at)}
                      </p>
                      {session.created_at !== session.last_seen_at && (
                        <p className="text-xs text-gray-500">
                          Started: {formatTimeAgo(session.created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={revokingSession === session.id}
                    >
                      {revokingSession === session.id ? (
                        'Revoking...'
                      ) : session.id === 'current' ? (
                        'Sign Out'
                      ) : (
                        'Revoke'
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {session.id === 'current' ? 'Sign Out?' : 'Revoke Session?'}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {session.id === 'current' 
                          ? 'You will be signed out of this device and redirected to the login page.'
                          : 'This will immediately sign out the selected device. The user will need to sign in again.'
                        }
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => revokeSession(session.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {session.id === 'current' ? 'Sign Out' : 'Revoke Session'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Access Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Recent sign-ins and security events on your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {accessLogs.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Recent Activity
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Your account activity will appear here
                </p>
              </div>
            ) : (
              accessLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${log.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {log.success ? (
                        <Shield className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                    </div>
                    
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {ACCESS_EVENT_LABELS[log.event]}
                      </p>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {log.device_label && <span>{log.device_label} • </span>}
                        {log.ip && <span>{getLocationFromIP(log.ip)} • </span>}
                        <span>{formatTimeAgo(log.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Badge variant={log.success ? 'default' : 'destructive'}>
                    {log.success ? 'Success' : 'Failed'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Security Best Practices
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Regularly review and revoke sessions you don't recognize</li>
                <li>• Always sign out when using shared or public computers</li>
                <li>• Enable two-factor authentication for additional security</li>
                <li>• Report any suspicious activity to our support team immediately</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionManagementPage;

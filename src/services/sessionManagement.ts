import { supabase } from '@/integrations/supabase/client';

export interface SessionInfo {
  id: string;
  user_id: string;
  device_name: string;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  ip_address: string;
  location?: string;
  created_at: string;
  last_active_at: string;
  expires_at: string;
  is_current: boolean;
}

export interface SessionLimits {
  maxConcurrentSessions: number;
  sessionTimeout: number; // in minutes
  idleTimeout: number; // in minutes
  absoluteTimeout: number; // in hours
}

export class SessionManagementService {
  private static readonly DEFAULT_LIMITS: SessionLimits = {
    maxConcurrentSessions: 3,
    sessionTimeout: 30, // 30 minutes of inactivity
    idleTimeout: 15, // 15 minutes idle warning
    absoluteTimeout: 24, // 24 hours absolute timeout
  };

  /**
   * Create a new session for a user
   */
  static async createSession(userId: string, deviceInfo: Partial<SessionInfo>): Promise<SessionInfo> {
    // Check concurrent session limit
    const activeSessions = await this.getActiveSessions(userId);
    if (activeSessions.length >= this.DEFAULT_LIMITS.maxConcurrentSessions) {
      // Terminate oldest session
      await this.terminateSession(activeSessions[0].id);
    }

    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.DEFAULT_LIMITS.absoluteTimeout * 60 * 60 * 1000);

    const session: SessionInfo = {
      id: sessionId,
      user_id: userId,
      device_name: deviceInfo.device_name || 'Unknown Device',
      device_type: deviceInfo.device_type || 'unknown',
      browser: deviceInfo.browser || 'Unknown',
      os: deviceInfo.os || 'Unknown',
      ip_address: deviceInfo.ip_address || '',
      location: deviceInfo.location,
      created_at: now.toISOString(),
      last_active_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      is_current: true,
    };

    // Store session in database
    const { error } = await supabase
      .from('user_sessions')
      .insert(session);

    if (error) {
      throw new Error('Failed to create session');
    }

    // Log session creation
    await this.logSessionEvent(userId, sessionId, 'session_created', deviceInfo);

    return session;
  }

  /**
   * Get all active sessions for a user
   */
  static async getActiveSessions(userId: string): Promise<SessionInfo[]> {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error('Failed to fetch sessions');
    }

    return data || [];
  }

  /**
   * Update session activity
   */
  static async updateSessionActivity(sessionId: string): Promise<void> {
    const now = new Date();
    
    const { error } = await supabase
      .from('user_sessions')
      .update({
        last_active_at: now.toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      throw new Error('Failed to update session activity');
    }
  }

  /**
   * Check if session is expired
   */
  static async isSessionExpired(sessionId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('last_active_at, expires_at')
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      return true;
    }

    const now = new Date();
    const lastActive = new Date(data.last_active_at);
    const expiresAt = new Date(data.expires_at);

    // Check absolute timeout
    if (now > expiresAt) {
      return true;
    }

    // Check idle timeout
    const idleTime = now.getTime() - lastActive.getTime();
    const idleTimeoutMs = this.DEFAULT_LIMITS.sessionTimeout * 60 * 1000;
    
    return idleTime > idleTimeoutMs;
  }

  /**
   * Terminate a session
   */
  static async terminateSession(sessionId: string): Promise<void> {
    const { data: session } = await supabase
      .from('user_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();

    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      throw new Error('Failed to terminate session');
    }

    if (session) {
      await this.logSessionEvent(session.user_id, sessionId, 'session_terminated');
    }
  }

  /**
   * Terminate all sessions for a user
   */
  static async terminateAllSessions(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error('Failed to terminate sessions');
    }

    await this.logSessionEvent(userId, 'all', 'all_sessions_terminated');
  }

  /**
   * Get session limits for a user
   */
  static async getSessionLimits(userId: string): Promise<SessionLimits> {
    // Could be customized per user or role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    // Admin users might have different limits
    if (profile?.role === 'admin') {
      return {
        ...this.DEFAULT_LIMITS,
        maxConcurrentSessions: 5,
        absoluteTimeout: 48,
      };
    }

    return this.DEFAULT_LIMITS;
  }

  /**
   * Log session events for audit trail
   */
  private static async logSessionEvent(
    userId: string,
    sessionId: string,
    event: string,
    metadata?: any
  ): Promise<void> {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: event,
        resource_type: 'session',
        resource_id: sessionId,
        metadata: metadata,
        ip_address: metadata?.ip_address,
        user_agent: metadata?.browser,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to log session event:', error);
    }
  }

  /**
   * Get device info from user agent
   */
  static parseUserAgent(userAgent: string): Partial<SessionInfo> {
    const deviceInfo: Partial<SessionInfo> = {};

    // Parse browser
    if (userAgent.includes('Chrome')) deviceInfo.browser = 'Chrome';
    else if (userAgent.includes('Firefox')) deviceInfo.browser = 'Firefox';
    else if (userAgent.includes('Safari')) deviceInfo.browser = 'Safari';
    else if (userAgent.includes('Edge')) deviceInfo.browser = 'Edge';
    else deviceInfo.browser = 'Unknown';

    // Parse OS
    if (userAgent.includes('Windows')) deviceInfo.os = 'Windows';
    else if (userAgent.includes('Mac')) deviceInfo.os = 'macOS';
    else if (userAgent.includes('Linux')) deviceInfo.os = 'Linux';
    else if (userAgent.includes('Android')) deviceInfo.os = 'Android';
    else if (userAgent.includes('iOS')) deviceInfo.os = 'iOS';
    else deviceInfo.os = 'Unknown';

    // Parse device type
    if (userAgent.includes('Mobile')) deviceInfo.device_type = 'mobile';
    else if (userAgent.includes('Tablet')) deviceInfo.device_type = 'tablet';
    else deviceInfo.device_type = 'desktop';

    // Generate device name
    deviceInfo.device_name = `${deviceInfo.browser} on ${deviceInfo.os}`;

    return deviceInfo;
  }

  /**
   * Monitor idle time and warn user
   */
  static startIdleMonitoring(
    onIdle: () => void,
    onActive: () => void,
    idleTimeMinutes: number = 15
  ): () => void {
    let idleTimer: NodeJS.Timeout | null = null;
    const idleTimeMs = idleTimeMinutes * 60 * 1000;

    const resetTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      onActive();
      
      idleTimer = setTimeout(() => {
        onIdle();
      }, idleTimeMs);
    };

    // Events to track activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // Start the timer
    resetTimer();

    // Return cleanup function
    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }
}

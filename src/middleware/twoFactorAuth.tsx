import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';

interface MFAStatus {
  enrolled: boolean;
  verified: boolean;
  factors: Array<{
    id: string;
    type: 'totp';
    status: 'verified' | 'unverified';
  }>;
}

export async function checkMFAStatus(): Promise<MFAStatus> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { enrolled: false, verified: false, factors: [] };
    }

    // Check MFA factors
    const { data: factors, error } = await supabase.auth.mfa.listFactors();
    
    if (error) {
      console.error('Error checking MFA factors:', error);
      return { enrolled: false, verified: false, factors: [] };
    }

    const verifiedFactors = factors?.totp?.filter(f => f.status === 'verified') || [];
    
    return {
      enrolled: factors?.totp?.length > 0,
      verified: verifiedFactors.length > 0,
      factors: factors?.totp?.map(f => ({ 
        ...f, 
        type: 'totp' as const, 
        status: f.status as 'verified' | 'unverified' 
      })) || [],
    };
  } catch (error) {
    console.error('MFA status check failed:', error);
    return { enrolled: false, verified: false, factors: [] };
  }
}

export async function enforceAdminMFA(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }

  // Check if user is admin/staff
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return true; // Not an admin, no MFA required
  }

  // Check MFA status
  const mfaStatus = await checkMFAStatus();
  
  if (!mfaStatus.verified) {
    console.warn('Admin user without verified MFA attempted access');
    return false;
  }

  return true;
}

export async function setupMFA() {
  try {
    // Enroll TOTP factor
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Indigo Yield Platform',
    });

    if (error) {
      throw error;
    }

    return {
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      factorId: data.id,
    };
  } catch (error) {
    console.error('MFA enrollment failed:', error);
    throw error;
  }
}

export async function verifyMFA(factorId: string, code: string) {
  try {
    // First create a challenge
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId
    });

    if (challengeError) throw challengeError;

    // Then verify with the challenge ID
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('MFA verification failed:', error);
    return { success: false, error };
  }
}

export async function challengeMFA() {
  try {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    
    if (!factors?.totp?.length) {
      throw new Error('No MFA factors enrolled');
    }

    const verifiedFactor = factors.totp.find(f => f.status === 'verified');
    
    if (!verifiedFactor) {
      throw new Error('No verified MFA factors');
    }

    const { data, error } = await supabase.auth.mfa.challenge({
      factorId: verifiedFactor.id,
    });

    if (error) {
      throw error;
    }

    return { challengeId: data.id, factorId: verifiedFactor.id };
  } catch (error) {
    console.error('MFA challenge failed:', error);
    throw error;
  }
}

export async function verifyMFAChallenge(challengeId: string, code: string) {
  try {
    const { data, error } = await supabase.auth.mfa.verify({
      factorId: challengeId,
      challengeId: challengeId,
      code,
    });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('MFA challenge verification failed:', error);
    return { success: false, error };
  }
}

// React component for MFA-protected routes
export function MFAProtectedRoute({ children }: { children: React.ReactNode }) {
  const [mfaVerified, setMfaVerified] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkMFA = async () => {
      const verified = await enforceAdminMFA();
      setMfaVerified(verified);
      setLoading(false);
    };

    checkMFA();
  }, []);

  if (loading) {
    return <div>Verifying authentication...</div>;
  }

  if (!mfaVerified) {
    return <Navigate to="/mfa-setup" replace />;
  }

  return <>{children}</>;
}
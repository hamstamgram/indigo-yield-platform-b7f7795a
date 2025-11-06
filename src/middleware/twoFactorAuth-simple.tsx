import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface SimpleTwoFactorProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export function SimpleTwoFactorAuth({ onSuccess, onCancel }: SimpleTwoFactorProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // For now, just simulate 2FA verification
      // In a real implementation, this would verify the TOTP code
      if (code === '123456') {
        toast({
          title: "Success",
          description: "Two-factor authentication verified successfully.",
        });
        onSuccess();
      } else {
        setError('Invalid verification code');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
      console.error('2FA verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            type="text"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="text-center text-2xl tracking-widest"
            maxLength={6}
          />
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex gap-2">
          <Button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className="flex-1"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
        
        <div className="text-sm text-muted-foreground text-center">
          For testing, use code: 123456
        </div>
      </CardContent>
    </Card>
  );
}

export async function checkMFAStatus() {
  return { enrolled: false, verified: false, factors: [] };
}

export async function verifyMFA(_factorId: string, code: string) {
  return { success: code === '123456' };
}

export default SimpleTwoFactorAuth;
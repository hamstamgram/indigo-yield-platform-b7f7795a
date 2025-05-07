
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createTestInvestor } from '@/scripts/createTestInvestor';
import { Loader2, UserPlus, Copy, Check } from 'lucide-react';

const CreateTestUser = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCreateTestUser = async () => {
    try {
      setIsLoading(true);
      const result = await createTestInvestor();
      
      if (result.success) {
        setCreatedUser({
          email: result.email,
          password: result.password
        });
        
        toast({
          title: 'Success',
          description: 'Test investor account created successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create test investor account',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating test user:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const copyCredentials = () => {
    if (!createdUser) return;
    
    const text = `Email: ${createdUser.email}\nPassword: ${createdUser.password}`;
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        toast({
          title: 'Copied',
          description: 'Credentials copied to clipboard',
        });
        
        // Reset copy icon after 2 seconds
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        toast({
          title: 'Error',
          description: 'Failed to copy credentials',
          variant: 'destructive',
        });
      });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Test Investor</CardTitle>
        <CardDescription>
          Create a test investor account for demonstration purposes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {createdUser ? (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-md p-4 border border-green-200 dark:border-green-800">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium">Test Investor Created</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0" 
                onClick={copyCredentials}
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mb-1"><span className="font-medium">Email:</span> {createdUser.email}</p>
            <p><span className="font-medium">Password:</span> {createdUser.password}</p>
            <p className="text-sm mt-2 text-green-700 dark:text-green-400">
              You can use these credentials to login as a test investor.
            </p>
          </div>
        ) : (
          <p>
            Click the button below to create a test investor account with sample portfolio data.
            This is useful for testing the investor dashboard.
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleCreateTestUser} 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Create Test Investor
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CreateTestUser;

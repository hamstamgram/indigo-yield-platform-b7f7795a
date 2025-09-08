import * as Sentry from '@sentry/react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Bug, Info, Activity } from 'lucide-react';
import { useState } from 'react';

/**
 * Sentry Test Component
 * Use this to verify Sentry error tracking is working correctly
 */
export function SentryTestButton() {
  const [testStatus, setTestStatus] = useState<string>('');

  const testError = () => {
    setTestStatus('Throwing test error...');
    throw new Error('This is a test error from Indigo Yield Platform!');
  };

  const testWarning = () => {
    setTestStatus('Sending warning...');
    Sentry.captureMessage('This is a test warning message', 'warning');
    setTimeout(() => setTestStatus('Warning sent to Sentry!'), 500);
  };

  const testInfo = () => {
    setTestStatus('Sending info...');
    Sentry.captureMessage('This is a test info message', 'info');
    setTimeout(() => setTestStatus('Info sent to Sentry!'), 500);
  };

  const testTransaction = () => {
    setTestStatus('Testing performance...');
    const transaction = Sentry.startTransaction({
      op: 'test',
      name: 'Test Transaction',
    });

    Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction));

    setTimeout(() => {
      transaction.finish();
      setTestStatus('Performance test sent to Sentry!');
    }, 1000);
  };

  const testWithContext = () => {
    setTestStatus('Sending error with context...');
    
    Sentry.withScope((scope) => {
      scope.setTag('test', true);
      scope.setLevel('error');
      scope.setContext('test_context', {
        timestamp: new Date().toISOString(),
        environment: import.meta.env.MODE,
        user_action: 'testing_sentry',
      });
      
      Sentry.captureException(new Error('Test error with additional context'));
    });
    
    setTimeout(() => setTestStatus('Error with context sent!'), 500);
  };

  const testBreadcrumbs = () => {
    setTestStatus('Adding breadcrumbs...');
    
    // Add some breadcrumbs
    Sentry.addBreadcrumb({
      message: 'User clicked test button',
      category: 'user-action',
      level: 'info',
    });
    
    Sentry.addBreadcrumb({
      message: 'Preparing to send test data',
      category: 'test',
      level: 'debug',
    });
    
    // Then trigger an error
    Sentry.captureException(new Error('Error after breadcrumbs'));
    setTimeout(() => setTestStatus('Error with breadcrumbs sent!'), 500);
  };

  return (
    <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Bug className="h-5 w-5" />
        Sentry Error Tracking Test
      </h3>
      
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Click these buttons to test different Sentry features. Check your Sentry dashboard to verify the events are being captured.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={testError}
            variant="destructive"
            size="sm"
            className="flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            Throw Error
          </Button>

          <Button
            onClick={testWarning}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            Send Warning
          </Button>

          <Button
            onClick={testInfo}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Info className="h-4 w-4" />
            Send Info
          </Button>

          <Button
            onClick={testTransaction}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Activity className="h-4 w-4" />
            Test Performance
          </Button>

          <Button
            onClick={testWithContext}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Bug className="h-4 w-4" />
            Error + Context
          </Button>

          <Button
            onClick={testBreadcrumbs}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Bug className="h-4 w-4" />
            Error + Breadcrumbs
          </Button>
        </div>

        {testStatus && (
          <div className="mt-4 p-2 bg-blue-100 dark:bg-blue-900/20 rounded text-sm">
            {testStatus}
          </div>
        )}

        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs">
          <p className="font-semibold mb-1">Sentry Configuration:</p>
          <p>DSN: {import.meta.env.VITE_SENTRY_DSN ? '✅ Configured' : '❌ Not configured'}</p>
          <p>Environment: {import.meta.env.MODE}</p>
          <p>Release: {import.meta.env.VITE_APP_VERSION || '1.0.0'}</p>
        </div>
      </div>
    </div>
  );
}

// Error Boundary wrapper for testing
export const SentryErrorBoundary = Sentry.ErrorBoundary;

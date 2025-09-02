import * as Sentry from '@sentry/react';

// Add this button component to your app to test Sentry's error tracking
export function SentryErrorButton() {
  const handleTestError = () => {
    try {
      throw new Error('This is your first error!');
    } catch (error) {
      // This will be caught by Sentry's error boundary
      throw error;
    }
  };

  const handleTestMessage = () => {
    Sentry.captureMessage('Test message from Indigo Yield Platform', 'info');
    console.log('Test message sent to Sentry');
  };

  const handleTestException = () => {
    const testError = new Error('Handled test error from Indigo Yield Platform');
    Sentry.captureException(testError);
    console.log('Test exception sent to Sentry');
  };

  return (
    <div style={{ 
      padding: '20px', 
      margin: '20px', 
      border: '2px dashed #e74c3c',
      borderRadius: '8px',
      backgroundColor: '#fff5f5',
      textAlign: 'center'
    }}>
      <h3 style={{ color: '#e74c3c', marginBottom: '15px' }}>
        🧪 Sentry Error Testing
      </h3>
      <p style={{ marginBottom: '15px', color: '#666' }}>
        Click the buttons below to test Sentry integration:
      </p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleTestError}
          style={{
            padding: '10px 20px',
            backgroundColor: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'background-color 0.3s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c0392b'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#e74c3c'}
        >
          💥 Break the world
        </button>
        
        <button
          onClick={handleTestMessage}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'background-color 0.3s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2980b9'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3498db'}
        >
          📨 Send Test Message
        </button>
        
        <button
          onClick={handleTestException}
          style={{
            padding: '10px 20px',
            backgroundColor: '#f39c12',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'background-color 0.3s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e67e22'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f39c12'}
        >
          ⚠️ Send Exception
        </button>
      </div>
      <p style={{ marginTop: '15px', fontSize: '12px', color: '#999' }}>
        After clicking, check your Sentry dashboard for the events
      </p>
    </div>
  );
}

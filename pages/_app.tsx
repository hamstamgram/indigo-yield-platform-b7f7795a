import { AppProps } from 'next/app';
import { BrowserRouter } from 'react-router-dom';
import { useEffect, useState } from 'react';
import '../src/index.css';

/**
 * Next.js Custom App Component
 *
 * This wraps the Vite SPA App component to provide:
 * 1. BrowserRouter for react-router-dom routing (client-side only)
 * 2. Global styles from index.css
 * 3. Proper integration between Next.js and the existing Vite SPA
 *
 * Note: BrowserRouter is only rendered on the client to avoid SSR errors
 */
function MyApp({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Render nothing on server, only render on client
  if (!mounted) {
    return null;
  }

  return (
    <BrowserRouter>
      <Component {...pageProps} />
    </BrowserRouter>
  );
}

export default MyApp;

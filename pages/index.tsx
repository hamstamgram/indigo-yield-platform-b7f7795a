import App from '../src/App';

/**
 * Next.js Root Page
 *
 * This is the entry point for Next.js that renders the Vite SPA.
 * The App component from src/App.tsx contains all the react-router-dom
 * routing logic and is wrapped by BrowserRouter in _app.tsx.
 */
export default function Home() {
  return <App />;
}

import React from 'react';

/**
 * Skip navigation link for keyboard users
 * Provides quick access to main content, bypassing navigation
 */
export const SkipLink: React.FC = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] bg-indigo-600 text-white px-4 py-2 rounded-md shadow-lg hover:bg-indigo-700 transition-colors"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const mainContent = document.getElementById('main-content');
          if (mainContent) {
            mainContent.focus();
            mainContent.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }}
    >
      Skip to main content
    </a>
  );
};

export default SkipLink;

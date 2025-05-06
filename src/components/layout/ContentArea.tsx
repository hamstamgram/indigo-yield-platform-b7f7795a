
import { ReactNode } from 'react';

type ContentAreaProps = {
  children: ReactNode;
};

const ContentArea = ({ children }: ContentAreaProps) => {
  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-100 dark:bg-gray-900">
      {children}
    </main>
  );
};

export default ContentArea;

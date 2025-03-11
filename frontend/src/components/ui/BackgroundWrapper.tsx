// components/ui/BackgroundWrapper.tsx
import { ReactNode } from 'react';

interface BackgroundWrapperProps {
  children: ReactNode;
}

const BackgroundWrapper: React.FC<BackgroundWrapperProps> = ({ children }) => {
  return (
    <div className="relative min-h-screen bg-[url('assets/EXPORT-BG.png')] bg-no-repeat bg-cover">
      {children}
    </div>
  );
};

export default BackgroundWrapper;

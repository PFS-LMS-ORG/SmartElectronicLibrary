// components/ui/BackgroundWrapper.tsx
import { ReactNode } from 'react';

interface BackgroundWrapperProps {
  children: ReactNode;
  className?: string; // <-- Accept additional classNames
}

const BackgroundWrapper: React.FC<BackgroundWrapperProps> = ({ children, className = "" }) => {
  return (
    <div
      className={`relative min-h-screen bg-[url('assets/EXPORT-BG.png')] bg-no-repeat bg-cover ${className}`}
    >
      {children}
    </div>
  );
};

export default BackgroundWrapper;

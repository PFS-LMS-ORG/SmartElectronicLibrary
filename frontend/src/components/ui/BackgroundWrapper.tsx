// components/ui/BackgroundWrapper.tsx
import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LoadingScreen from './LoadingScreen';

interface BackgroundWrapperProps {
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
  loadingMessage?: string;
}

const BackgroundWrapper: React.FC<BackgroundWrapperProps> = ({ 
  children, 
  className = "", 
  isLoading = false,
  loadingMessage
}) => {
  return (
    <div
      className={`relative min-h-screen bg-[url('assets/EXPORT-BG.png')] bg-no-repeat bg-cover ${className}`}
    >
      <AnimatePresence>
        {isLoading && (
          <LoadingScreen message={loadingMessage} />
        )}
      </AnimatePresence>
      
      <AnimatePresence mode="wait">
        <motion.div
          key="content"
          initial={{ opacity: isLoading ? 0 : 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default BackgroundWrapper;

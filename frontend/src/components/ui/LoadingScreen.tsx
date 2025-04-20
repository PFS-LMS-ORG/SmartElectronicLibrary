import React from 'react';
import { Book } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = "Loading your library..." }) => {
  return (
    <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div 
        className="flex flex-col items-center p-8 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative mb-6">
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, -2, 0, 2, 0] 
            }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            className="relative z-10"
          >
            <Book className="h-16 w-16 text-amber-400" strokeWidth={1.5} />
          </motion.div>
          <motion.div
            className="absolute inset-0 bg-amber-400 blur-xl opacity-20 rounded-full"
            animate={{ 
              scale: [1, 1.3, 1],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
          />
        </div>

        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-lg font-medium text-white mb-3"
        >
          {message}
        </motion.div>

        <div className="flex items-center space-x-3">
          {[0, 1, 2].map((dot) => (
            <motion.div
              key={dot}
              className="h-2 w-2 bg-amber-400 rounded-full"
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                delay: dot * 0.3,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;
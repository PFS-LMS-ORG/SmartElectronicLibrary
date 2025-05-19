import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText } from 'lucide-react';

interface SummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    coverImageUrl: string;
    category: string;
    summary: string;
}

const SummaryModal: React.FC<SummaryModalProps> = ({
    isOpen,
    onClose,
    title,
    coverImageUrl,
    category,
    summary,
}) => {
    return (
        <AnimatePresence>
        {isOpen && (
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={onClose}
            >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full max-w-3xl bg-gray-900 rounded-xl shadow-2xl border border-gray-700/50 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-amber-500 scrollbar-track-gray-800 scrollbar-thumb-rounded-full"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors duration-200 z-[1001] p-2 rounded-full hover:bg-gray-700/50"
                aria-label="Close summary modal"
                >
                <X className="h-6 w-6" />
                </button>

                {/* Cover Image */}
                <div className="relative h-48 w-full">
                <img
                    src={coverImageUrl}
                    alt={title}
                    className="w-full h-full object-cover rounded-t-xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent z-10"></div>
                <div className="absolute bottom-4 left-4 flex items-center gap-2 z-20">
                    <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-400 text-gray-900 text-sm font-medium rounded-full shadow-md">
                    {category}
                    </span>
                    <span className="flex items-center text-gray-200 text-sm font-medium backdrop-blur-sm bg-gray-900/50 px-3 py-1 rounded-full shadow-sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Full Summary
                    </span>
                </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 md:p-8">
                {/* Title */}
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight tracking-tight">
                    {title}
                </h2>

                {/* Summary */}
                <div className="text-gray-200 text-base md:text-lg font-light leading-relaxed">
                    {summary}
                </div>
                </div>
            </motion.div>
            </motion.div>
        )}
        </AnimatePresence>
    );
};

export default SummaryModal;
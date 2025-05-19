import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    perPage: number;
    itemsPerPageOptions?: number[];
    itemLabel?: string;
    onPageChange: (page: number) => void;
    onPerPageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    colorScheme?: 'blue' | 'indigo' | 'amber' | 'green' | 'purple';
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    totalItems,
    perPage,
    itemsPerPageOptions,
    itemLabel,
    onPageChange,
    onPerPageChange,
    colorScheme = 'indigo'
    }) => {
    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const pages = [];
        const maxPagesToShow = 5; // Show at most 5 page numbers
        
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        
        // Adjust start page if necessary
        if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
        }
        
        return pages;
    };

    // Color mappings for different themes
    const colorMappings = {
        blue: {
        activeBg: 'bg-blue-600/50',
        activeText: 'text-blue-200',
        activeBorder: 'border-blue-700'
        },
        indigo: {
        activeBg: 'bg-indigo-600/50',
        activeText: 'text-indigo-200',
        activeBorder: 'border-indigo-700'
        },
        amber: {
        activeBg: 'bg-amber-600/50', 
        activeText: 'text-amber-200',
        activeBorder: 'border-amber-700'
        },
        green: {
        activeBg: 'bg-green-600/50',
        activeText: 'text-green-200',
        activeBorder: 'border-green-700'
        },
        purple: {
        activeBg: 'bg-purple-600/50',
        activeText: 'text-purple-200',
        activeBorder: 'border-purple-700'
        }
    };

    const { activeBg, activeText, activeBorder } = colorMappings[colorScheme];

    return (
        <div className="p-4 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-sm text-gray-400 flex flex-col sm:flex-row items-center gap-2">
            <div>
            Showing{" "}
            <span className="font-medium text-gray-300">
                {totalItems > 0 
                ? `${(currentPage - 1) * perPage + 1}-${Math.min(currentPage * perPage, totalItems)}` 
                : "0"}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-300">{totalItems}</span>{" "}
                {itemLabel || "items"}
            </div>
            
            <div className="flex items-center sm:ml-4">
            <span className="mr-2 text-gray-400">Show:</span>
            <select
                value={perPage}
                onChange={onPerPageChange}
                className="bg-gray-700 border border-gray-600 text-gray-300 rounded px-2 py-1"
            >
                {itemsPerPageOptions?.map((option) => (
                <option key={option} value={option}>
                    {option}
                </option>
                ))}
            </select>
            </div>
        </div>

        {totalPages > 1 && (
            <div className="flex items-center gap-1">
            <button
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-md ${
                currentPage === 1
                    ? "text-gray-500 cursor-not-allowed"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
                title="First page"
            >
                <ChevronsLeft size={16} />
            </button>
            
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-md ${
                currentPage === 1
                    ? "text-gray-500 cursor-not-allowed"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
                title="Previous page"
            >
                <ChevronLeft size={16} />
            </button>
            
            {getPageNumbers().map((pageNum) => (
                <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`px-3 py-1 rounded-md ${
                    currentPage === pageNum
                    ? `${activeBg} ${activeText} border ${activeBorder}`
                    : "text-gray-300 hover:bg-gray-700"
                }`}
                >
                {pageNum}
                </button>
            ))}
            
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-md ${
                currentPage === totalPages
                    ? "text-gray-500 cursor-not-allowed"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
                title="Next page"
            >
                <ChevronRight size={16} />
            </button>
            
            <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-md ${
                currentPage === totalPages
                    ? "text-gray-500 cursor-not-allowed"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
                title="Last page"
            >
                <ChevronsRight size={16} />
            </button>
            </div>
        )}
        </div>
    );
};

export default Pagination;
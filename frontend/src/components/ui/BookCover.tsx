// components/ui/BookCover.tsx
import React from 'react';

interface BookCoverProps {
  coverImage: string;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const BookCover: React.FC<BookCoverProps> = ({ coverImage, title, size = 'md', className = '' }) => {
  // Size classes
  const sizeClasses = {
    sm: "h-64", // Small for grid view
    md: "h-80", // Medium for list view
    lg: "h-96", // Large for detail view
  };

  // Shadow styles
  const shadowStyle = {
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.5)"
  };

  return (
    <div className={`relative ${className}`}>
      <img 
        src={coverImage} 
        alt={title} 
        className={`rounded-lg object-cover w-full ${sizeClasses[size]} transition-transform duration-300 hover:scale-105`}
        style={shadowStyle}
      />
    </div>
  );
};

export default BookCover;
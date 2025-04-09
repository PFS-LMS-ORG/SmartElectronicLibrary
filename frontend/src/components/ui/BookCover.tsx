// components/ui/BookCover.tsx
import React from 'react';
import { Link } from 'react-router-dom';

interface BookCoverProps {
  id: number;
  title: string;
  cover_url: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const BookCover: React.FC<BookCoverProps> = ({id, cover_url, title, size = 'md', className = '' }) => {
  // Size classes
  const sizeClasses = {
    sm: "h-64", // Small for grid view
    md: "h-80", // Medium for list view
    lg: "h-96", // Large for detail view
  };


  return (
    <Link to={`/book/${id}`} className={`relative ${className}`}>
      <img 
        src={cover_url} 
        alt={title} 
        className={`rounded-lg object-cover w-full ${sizeClasses[size]} transition-transform duration-300 hover:scale-105`}
      />
    </Link>
  );
};

export default BookCover;
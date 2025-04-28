import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

export interface BookRecommendation {
  id: number;
  title: string;
  author: string;
  category: string;
  rating: number;
  cover_url: string;
  reason: string;
}

interface BookRecommendationItemProps {
  book: BookRecommendation;
  language: 'en' | 'fr' | 'ar';
  onClick: (bookId: number) => void;
}

// Individual compact book card component
export const BookRecommendationItem: React.FC<BookRecommendationItemProps> = ({ 
  book, 
  language, 
  onClick 
}) => {
  return (
    <motion.div
      className="rounded-lg overflow-hidden bg-gradient-to-br from-gray-800/80 to-gray-900/80 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex h-24"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(book.id)}
    >
      {/* Book Cover Image */}
      <div className="h-full w-16 bg-gray-700 overflow-hidden flex-shrink-0">
        <img 
          src={book.cover_url} 
          alt={book.title} 
          className="h-full w-full object-cover transform group-hover:scale-105 transition-transform duration-300"
          onError={(e) => (e.currentTarget.src = '/default_cover.jpg')}
        />
      </div>
      
      {/* Book Details */}
      <div className="flex-1 p-2 flex flex-col justify-between overflow-hidden">
        <div>
          <h3 className="text-white font-medium text-sm truncate">
            {book.title}
          </h3>
          
          <p className="text-gray-400 text-xs truncate mt-0.5">
            {book.author}
          </p>
        </div>
        
        <div className="flex items-center">
          <Star className="h-3 w-3 text-amber-400 mr-1" />
          <span className="text-amber-400 text-xs font-medium">{book.rating.toFixed(1)}</span>
        </div>
      </div>
    </motion.div>
  );
};

interface BookRecommendationsProps {
  recommendations: BookRecommendation[] | undefined;
  language: 'en' | 'fr' | 'ar';
  onBookClick: (bookId: number) => void;
}

// Main component for displaying book recommendations in a grid
const BookRecommendations: React.FC<BookRecommendationsProps> = ({ 
  recommendations, 
  language, 
  onBookClick 
}) => {
  if (!recommendations || recommendations.length === 0) return null;
  
  const translations = {
    en: "Book Recommendations",
    fr: "Recommandations de Livres",
    ar: "توصيات الكتب"
  };
  
  return (
    <div className="mt-2 mb-3">
      <p className="text-xs text-indigo-300 mb-2 font-medium">
        {translations[language]}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {recommendations.map((book) => (
          <BookRecommendationItem 
            key={book.id} 
            book={book} 
            language={language}
            onClick={onBookClick}
          />
        ))}
      </div>
    </div>
  );
};

export default BookRecommendations;
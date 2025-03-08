// components/ui/BookCover.tsx
// import BookCoverSvg from '@/components/ui/BookCoverSvg';
import React from 'react';

interface BookCoverProps {
  coverImage: string;
  title: string;
}

const BookCover: React.FC<BookCoverProps> = ({ coverImage, title }) => {
  return (
    <div className="w-full md:w-1/3 flex justify-center items-start relative">
      <div className="relative top-0 left-0">
        {/* Main cover */}
        {/* <BookCoverSvg coverColor="#CAD7DB"/> */}
        <img 
          src={coverImage} 
          alt={title} 
          className="rounded-lg shadow-2xl h-96 object-cover"
          style={{
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.5)"
          }}
        />
      </div>
    </div>
  );
};

export default BookCover;

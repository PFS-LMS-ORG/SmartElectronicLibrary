import React, { useEffect, useState } from "react";

const BookGallery: React.FC = () => {
  const [books, setBooks] = useState<{ id: string; title: string; cover: string }[]>([]);

  useEffect(() => {
    fetchBooks("computer science");
  }, []);

  const fetchBooks = async (query: string) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=16`
      );
      const data = await response.json();
      
      if (data.items) {
        const bookData = data.items.map((book: any) => ({
          id: book.id,
          title: book.volumeInfo.title,
          cover: book.volumeInfo.imageLinks?.thumbnail || "https://placehold.co/150x200",
        }));

        setBooks(bookData);
      }
    } catch (error) {
      console.error("Error fetching books:", error);
    }
  };


  return (
    <div className="hidden md:block md:w-3/5 bg-gray-100 relative overflow-hidden p-[-6]">
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-transparent z-10"></div>
  
      {/* Dynamic Grid Layout with Varying Column and Row Spans */}
      <div className="grid grid-cols-4 gap-4 auto-rows-[200px] relative z-20">
        {books.map((book) => {
          return (
            <div
              key={book.id}
              className={`relative rounded-lg overflow-hidden shadow-lg`}
            >
              {/* Dark Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900 opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
  
              {/* Book Cover */}
              <img
                src={book.cover}
                alt={book.title}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
  
  

};

export default BookGallery;

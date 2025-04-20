import React, { useEffect, useState } from "react";

const BookGallery: React.FC = () => {
  const [books, setBooks] = useState<{ id: string; title: string; cover: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchBooks("computer science");
  }, []);

  const fetchBooks = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=12`
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
    } finally {
      setIsLoading(false);
    }
  };

  // Create size classes for a more dynamic and premium layout
  const getRandomSize = (index: number) => {
    // Create a predictable pattern based on index
    const patterns = [
      "col-span-1 row-span-1",
      "col-span-1 row-span-2",
      "col-span-2 row-span-1",
      "col-span-1 row-span-1",
    ];
    return patterns[index % patterns.length];
  };

  return (
    <div className="hidden md:block md:w-3/5 bg-gradient-to-br from-gray-800 via-gray-900 to-black relative overflow-hidden">
      {/* Abstract background elements */}
      <div className="absolute w-full h-full overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-l from-gray-900/80 via-gray-900/50 to-transparent z-10"></div>
      
      {/* Logo Watermark */}
      <div className="absolute top-8 right-8 z-20 opacity-10">
        <svg className="w-32 h-32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
        </svg>
      </div>
      
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-white mt-4">Loading collection...</p>
          </div>
        </div>
      )}

      {/* Dynamic Grid Layout with Varying Column and Row Spans */}
      <div className="grid grid-cols-4 gap-6 auto-rows-[180px] p-16 relative z-20">
        {books.map((book, index) => {
          return (
            <div
              key={book.id}
              className={`${getRandomSize(index)} relative rounded-xl overflow-hidden shadow-2xl transform transition-all duration-500 hover:scale-105 group`}
            >
              {/* Book Cover */}
              <img
                src={book.cover}
                alt={book.title}
                className="w-full h-full object-cover rounded-xl"
              />
              
              {/* Glass Morphism Effect on Hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
              
              {/* Book Title - Only Visible on Hover */}
              <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                <div className="backdrop-blur-sm bg-black/30 p-3 rounded-lg">
                  <h3 className="text-white text-sm font-medium truncate">{book.title}</h3>
                  <div className="flex items-center mt-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Premium Corner Ribbon */}
              {index % 4 === 0 && (
                <div className="absolute top-0 right-0">
                  <div className="bg-amber-500 text-xs font-bold px-2 py-1 transform rotate-0 text-gray-900">
                    NEW
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Bottom text */}
      <div className="absolute bottom-6 left-6 z-20">
        <p className="text-white/40 text-xs">Discover thousands of books in our collection</p>
      </div>
    </div>
  );
};

export default BookGallery;
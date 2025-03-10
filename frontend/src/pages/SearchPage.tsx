// SearchPage.jsx
import React, { useState } from 'react';
import { Search } from 'lucide-react';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import BookCover from '@/components/ui/BookCover';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"


const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('Thriller Mystery');
  // const [currentPage, setCurrentPage] = useState(1);
  
  // Use your dummy data
  const books = [
    { id: 1, title: "Origin", author: "Dan Brown", coverImage: "https://th.bing.com/th/id/OIP._nr-URRb3s2MWuZwe1N5AgHaLj?rs=1&pid=ImgDetMain", category: "Thriller / Mystery" },
    { id: 2, title: "The Fury", author: "Alex Michaelides", coverImage: "https://th.bing.com/th/id/R.0236080380cecfbb88b31137b3884702?rik=mYNHB3E0PfVAgQ&pid=ImgRaw&r=0", category: "Psychological Thriller" },
    { id: 3, title: "The Maidens", author: "Alex Michaelides", coverImage: "https://th.bing.com/th/id/OIP.QgMgOIcvBT9ciSRLPuy55wHaLb?rs=1&pid=ImgDetMain", category: "Psychological Thriller" },
    { id: 4, title: "Gerald's Game", author: "Stephen King", coverImage: "https://hachette.imgix.net/books/9781848940710.jpg?auto=compress,format", category: "Horror Game" },
    { id: 5, title: "Don't Turn Around", author: "Jessica Barry", coverImage: "https://th.bing.com/th/id/R.fe08f2a0a8cbd00466e200cacfda6374?rik=fajyD%2fySWxiALw&pid=ImgRaw&r=0", category: "Thriller / Suspense" },
    { id: 6, title: "Don't Turn Around", author: "Jessica Barry", coverImage: "https://th.bing.com/th/id/R.fe08f2a0a8cbd00466e200cacfda6374?rik=fajyD%2fySWxiALw&pid=ImgRaw&r=0", category: "Thriller / Suspense" }
  ];

  // Duplicate books to match the UI (showing 2 rows)
  const displayBooks = [...books, ...books];


  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(e.target.value);
  };

  return (
    <BackgroundWrapper>
      <div className="min-h-screen bg-opacity-95 text-white">
        
        <main className="p-4 px-8 lg:px-16 pt-8 pb-16">
          {/* Header */}
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-widest mb-2">DISCOVER YOUR NEXT GREAT READ:</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">
              Explore and Search for
            </h1>
            <h2 className="text-4xl md:text-5xl font-bold text-amber-200">
              Any Book In Our Library
            </h2>
          </div>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto mb-12 relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full bg-gray-800 rounded-lg border border-gray-700 py-3 px-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="Search for books, authors, or genres..."
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Search Results</h2>
            <div className="flex items-center">
              <span className="mr-2">Filter by:</span>
              <Button variant="outline" className="border-gray-600 text-white flex items-center">
                Department
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Books Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
            {displayBooks.map((book) => (
              <div key={`${book.id}-${Math.random()}`} className="flex flex-col">
                <div className="mb-3">
                  <BookCover 
                    coverImage={book.coverImage} 
                    title={book.title}
                    size="sm"
                  />
                </div>
                <h3 className="font-bold text-sm">{book.title} - By {book.author}</h3>
                <p className="text-xs text-gray-400">{book.category}</p>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">1</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
        </Pagination>

        </main>
      </div>
    </BackgroundWrapper>
  );
};

export default SearchPage;
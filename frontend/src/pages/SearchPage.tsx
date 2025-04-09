import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import Mask from "../assets/Mask.png"
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import BookCover from '@/components/ui/BookCover';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

// Define the Book interface
interface Book {
  id: number;
  title: string;
  cover_url: string;
  description: string;
  rating: number;
  summary: string;
  authors: { name: string }[];
  categories: { name: string }[];
}

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [books, setBooks] = useState<Book[]>([]); // State to hold book data
  const [category , setCategory] = useState<string>(''); // State to hold selected category
  const [categories, setCategories] = useState<string[]>([]); // State for available categories

  // Fetch books from the API
  useEffect(() => {
    const fetchBooks = async () => {
      const response = await fetch(`/api/books?search=${searchQuery}`);
      const data: Book[] = await response.json();
      setBooks(data); // Update the state with fetched books
    };

    fetchBooks();
  }, [searchQuery]); // Re-fetch when search query changes

  useEffect(() => {
    const fetchBooks = async () => {
      const response = await fetch(`/api/books/category?search=${category}`);
      const data: Book[] = await response.json();
      setBooks(data); 
    };

    fetchBooks();
  }, [category]); // Re-fetch when category changes

  useEffect(() => {
    const fetchCategories = async () => {
      const response = await fetch('/api/books/categories');
      const data = await response.json();
      setCategories(data.map((category: { name: string }) => category.name));
    };

    fetchCategories();
  }, []);


  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(e.target.value);
  };

  return (
    <BackgroundWrapper>
      <div className="min-h-screen bg-opacity-95 text-white">
        <main className="p-4 px-8 lg:px-16 pt-8 pb-16">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-widest mb-2">DISCOVER YOUR NEXT GREAT READ:</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">Explore and Search for</h1>
            <h2 className="text-4xl md:text-5xl font-bold text-amber-200">Any Book In Our Library</h2>
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
                placeholder="Search for books..."
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Search Results</h2>
            {/* Category Dropdown */}
          <div className="mb-8">
            <select
            className="bg-gray-800 rounded-lg border border-gray-700 py-3 px-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            onChange={(e) => setCategory(e.target.value)}
              value={category}
            >
              <option value="">Select Category</option>
              {categories.map((cat, index) => (
                <option key={index} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          </div>

          
          {/* Books Grid */}
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8 ">
  {books.length > 0 ? (
    books.map((book) => (
      <div key={book.id} className="flex flex-col">
        <div className="mb-3">
          <BookCover 
            id={book.id}
            cover_url={book.cover_url} 
            title={book.title}
            size="sm"
          />
        </div>
        <h3 className="font-bold text-sm">{book.title} - By {book.authors.toString()}</h3>
        <p className="text-xs text-gray-400">{book.categories.toString()}</p>
      </div>
    ))
  ) : (
    <div className="col-span-full flex flex-col items-center justify-center text-center p-4 ">
      <img src={Mask} alt="No Results Found" className="w-24 h-24 mb-4" />
      <h2 className="font-bold text-xl">No Results Found</h2>
      <p className="text-gray-500">We couldn’t find any books matching your search. Try using different keywords or check for typos.</p>
    </div>
  )}
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
                <PaginationLink href="#">2</PaginationLink>
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

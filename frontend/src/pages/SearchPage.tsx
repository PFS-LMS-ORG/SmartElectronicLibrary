import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import Mask from "../assets/Mask.png";
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import BookCover from '@/components/ui/BookCover';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Define the Book interface to match backend response
interface Book {
  id: number;
  title: string;
  cover_url: string;
  description: string;
  rating: number;
  summary: string;
  authors: string[];
  categories: string[];
  borrow_count: number;
  total_books: number;
  available_books: number;
}

// Define the Category interface to match backend response
interface Category {
  books: number;
  id: number;
  name: string;
}

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const booksPerPage = 12;
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Fetch categories after authentication
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;

    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No token found');
        }
        console.log('Fetching categories');
        const response = await axios.get('/api/books/categories', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log('Categories response:', response.data);
        // Map the response to extract category names
        const categoryNames = (response.data || []).map((cat: Category) => cat.name);
        setCategories(categoryNames);
      } catch (error: any) {
        console.error('Error fetching categories:', error.response?.data || error.message);
        setCategories([]);
      }
    };
    fetchCategories();
  }, [isAuthLoading, isAuthenticated]);

  // Fetch books based on search query, category, and page
  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      window.location.href = '/login';
      return;
    }

    const fetchBooks = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No token found');
        }

        const params: any = {
          page: currentPage,
          per_page: booksPerPage,
        };
        if (searchQuery) params.search = searchQuery;
        if (category) params.category = category;

        console.log('Fetching books with params:', params);
        const response = await axios.get('/api/books', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params,
        });

        console.log('Books response:', response.data);
        setBooks(response.data.books || []);
        setTotalPages(response.data.total_pages || 1);
      } catch (error: any) {
        console.error('Error fetching books:', error.response?.data || error.message);
        setBooks([]);
        setTotalPages(1);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooks();
  }, [searchQuery, category, currentPage, isAuthenticated, isAuthLoading]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setCategory(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

          {/* Search Results Header and Category Filter */}
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Search Results</h2>
            <div>
              <select
                className="bg-gray-800 rounded-lg border border-gray-700 py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                onChange={handleCategoryChange}
                value={category}
              >
                <option value="">All Categories</option>
                {categories.map((cat, index) => (
                  <option key={index} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Books Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex flex-col animate-pulse">
                  <div className="relative mb-4 h-60 bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2 mb-1"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </div>
              ))
            ) : books.length > 0 ? (
              books.map((book) => (
                <div key={book.id} className="flex flex-col">
                  <div className="relative mb-4 h-60 group cursor-pointer">
                    <BookCover
                      id={book.id}
                      cover_url={book.cover_url}
                      title={book.title}
                      size="sm"
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-white truncate">{book.title}</h3>
                  <p className="text-xs text-gray-300 uppercase tracking-wide mb-1">
                    By {book.authors.join(', ')}
                  </p>
                  <p className="text-xs text-gray-200 uppercase font-bold tracking-wide">
                    {book.categories.join(' • ')}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center text-center p-4">
                <img src={Mask} alt="No Results Found" className="w-24 h-24 mb-4" />
                <h2 className="font-bold text-xl">No Results Found</h2>
                <p className="text-gray-500">We couldn’t find any books matching your search. Try using different keywords or check for typos.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {books.length > 0 && totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(currentPage - 1);
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(page);
                      }}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(currentPage + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </main>
      </div>
    </BackgroundWrapper>
  );
};

export default SearchPage;
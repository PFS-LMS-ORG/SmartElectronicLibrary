import React, { useState, useEffect } from 'react';
import { Search, Book, X, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Star } from 'lucide-react';
import Mask from "../assets/Mask.png";
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import BookCover from '@/components/ui/BookCover';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalBooks, setTotalBooks] = useState<number>(0);
  const [booksPerPage, setBooksPerPage] = useState<number>(12);
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('title');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch categories after authentication
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;

    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No token found');
        }
        const response = await axios.get('/api/books/categories', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
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
      navigate('/login');
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
          sort: sortBy,
        };
        if (debouncedSearch) params.search = debouncedSearch;
        if (category) params.category = category;
        if (availableOnly) params.available = true;

        const response = await axios.get('/api/books', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params,
        });

        setBooks(response.data.books || []);
        setTotalPages(response.data.total_pages || 1);
        setTotalBooks(response.data.total_count || 0);
      } catch (error: any) {
        console.error('Error fetching books:', error.response?.data || error.message);
        setBooks([]);
        setTotalPages(1);
        setTotalBooks(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooks();
  }, [debouncedSearch, category, currentPage, booksPerPage, isAuthenticated, isAuthLoading, availableOnly, sortBy, navigate]);

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

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setSortBy(e.target.value);
    setCurrentPage(1);
  };

  const handleBooksPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setBooksPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setCategory('');
    setAvailableOnly(false);
    setSortBy('title');
    setCurrentPage(1);
  };

  const handleBookClick = (bookId: number) => {
    navigate(`/book/${bookId}`);
  };

  // Generate page numbers for pagination with ellipsis
  const getPageNumbers = () => {
    const maxPagesToShow = 5;
    const pages = [];
    
    if (totalPages <= maxPagesToShow) {
      // If we have fewer pages than maxPagesToShow, show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      // Calculate middle pages
      const leftBoundary = Math.max(2, currentPage - 1);
      const rightBoundary = Math.min(totalPages - 1, currentPage + 1);
      
      // Add ellipsis before middle pages if needed
      if (leftBoundary > 2) {
        pages.push(-1); // -1 represents ellipsis
      }
      
      // Add middle pages
      for (let i = leftBoundary; i <= rightBoundary; i++) {
        pages.push(i);
      }
      
      // Add ellipsis after middle pages if needed
      if (rightBoundary < totalPages - 1) {
        pages.push(-2); // -2 represents ellipsis (using different value to ensure unique keys)
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  // Function to render star ratings
  const renderRating = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <Star className="h-3 w-3 text-gray-400" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            </div>
          </div>
        );
      } else {
        stars.push(<Star key={i} className="h-3 w-3 text-gray-400" />);
      }
    }

    return (
      <div className="flex">{stars}</div>
    );
  };

  return (
    <BackgroundWrapper>
      <div className="min-h-screen text-white">
        <main className="px-4 sm:px-6 lg:px-8 pt-8 pb-16 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 mb-4 rounded-full bg-amber-900/30 text-amber-200 text-xs font-medium tracking-widest uppercase">
              Library Collection
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-3 leading-tight">
              Discover Your <span className="text-amber-300">Next Great Read</span>
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Browse through our extensive collection of books across various genres and find your perfect match.
            </p>
          </div>

          {/* Search Bar and Filters Toggle */}
          <div className="max-w-4xl mx-auto mb-8 relative">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 py-3 px-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-lg"
                  placeholder="Search by title, author, or keyword..."
                />
                {searchQuery && (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setDebouncedSearch('');
                    }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="md:w-auto w-full px-4 py-3 bg-amber-700/80 hover:bg-amber-600/80 backdrop-blur-sm text-white rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
              >
                <Filter size={16} />
                <span>Filters</span>
              </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 p-6 bg-gray-800/90 backdrop-blur-md rounded-xl border border-gray-700 shadow-xl transition-all">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="w-full md:w-1/3">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                    <select
                      className="w-full bg-gray-700 rounded-lg border border-gray-600 py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      onChange={handleCategoryChange}
                      value={category}
                    >
                      <option value="">All Categories</option>
                      {categories.map((cat, index) => (
                        <option key={index} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="w-full md:w-1/3">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                    <select
                      className="w-full bg-gray-700 rounded-lg border border-gray-600 py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      onChange={handleSortChange}
                      value={sortBy}
                    >
                      <option value="title">Title (A-Z)</option>
                      <option value="-title">Title (Z-A)</option>
                      <option value="-rating">Highest Rating</option>
                      <option value="-borrow_count">Most Popular</option>
                      <option value="-created_at">Newest Additions</option>
                    </select>
                  </div>
                  
                  <div className="w-full md:w-1/3">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Books Per Page</label>
                    <select
                      className="w-full bg-gray-700 rounded-lg border border-gray-600 py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      onChange={handleBooksPerPageChange}
                      value={booksPerPage}
                    >
                      <option value="6">6</option>
                      <option value="12">12</option>
                      <option value="18">18</option>
                      <option value="24">24</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center mt-6">
                  <input
                    type="checkbox"
                    id="availableOnly"
                    checked={availableOnly}
                    onChange={() => setAvailableOnly(!availableOnly)}
                    className="h-4 w-4 rounded border-gray-700 text-amber-600 focus:ring-amber-500 bg-gray-700"
                  />
                  <label htmlFor="availableOnly" className="ml-2 text-sm text-gray-300">
                    Show only available books
                  </label>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search Results Header */}
          <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Library Collection</h2>
              <p className="text-gray-400">
                {totalBooks > 0 
                  ? `Showing ${(currentPage - 1) * booksPerPage + 1}-${Math.min(currentPage * booksPerPage, totalBooks)} of ${totalBooks} books`
                  : "No results found"}
              </p>
            </div>
            
            {/* Active Filters Display */}
            {(category || availableOnly || sortBy !== 'title') && (
              <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
                {category && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-900/30 text-amber-200 text-xs">
                    Category: {category}
                    <button onClick={() => setCategory('')} className="ml-2 text-gray-400 hover:text-white">
                      <X size={14} />
                    </button>
                  </div>
                )}
                {availableOnly && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-900/30 text-green-200 text-xs">
                    Available Only
                    <button onClick={() => setAvailableOnly(false)} className="ml-2 text-gray-400 hover:text-white">
                      <X size={14} />
                    </button>
                  </div>
                )}
                {sortBy !== 'title' && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-900/30 text-blue-200 text-xs">
                    Sorted by: {sortBy.startsWith('-') ? sortBy.substring(1) : sortBy}
                    <button onClick={() => setSortBy('title')} className="ml-2 text-gray-400 hover:text-white">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Books Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-12">
            {isLoading ? (
              Array.from({ length: booksPerPage }).map((_, index) => (
                <div key={index} className="flex flex-col animate-pulse">
                  <div className="relative mb-4 h-64 bg-gray-700 rounded-lg"></div>
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </div>
              ))
            ) : books.length > 0 ? (
              books.map((book) => (
                <div
                  key={book.id}
                  className="flex flex-col rounded-xl overflow-hidden shadow-xl transition-all duration-300 hover:shadow-amber-900/20 hover:translate-y-[-4px] bg-gray-800/50 border border-gray-700/50 hover:border-amber-700/50 backdrop-blur-sm cursor-pointer"
                  onClick={() => handleBookClick(book.id)}
                >
                  <div className="relative h-64 overflow-hidden">
                    <BookCover id={book.id} cover_url={book.cover_url} title={book.title} size="sm" />
                    {book.available_books <= 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                        <span className="px-3 py-1 bg-red-900/80 text-red-200 text-xs font-medium rounded-full">
                          Unavailable
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-md font-semibold text-white line-clamp-2">{book.title}</h3>
                    </div>
                    <p className="text-xs text-gray-400 italic mb-2 line-clamp-1">
                      By {book.authors.join(', ')}
                    </p>
                    {book.rating > 0 && (
                      <div className="mb-3">
                        {renderRating(book.rating)}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-auto">
                      {book.categories.slice(0, 2).map((category) => (
                        <span
                          key={category}
                          className="inline-block bg-gray-700/70 text-gray-300 text-xs px-2 py-0.5 rounded-full"
                        >
                          {category}
                        </span>
                      ))}
                      {book.categories.length > 2 && (
                        <span className="inline-block bg-gray-700/70 text-gray-300 text-xs px-2 py-0.5 rounded-full">
                          +{book.categories.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                  {book.available_books > 0 && (
                    <div className="px-4 py-2 border-t border-gray-700/50 flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {book.available_books}/{book.total_books} available
                      </span>
                      <span className="px-2 py-0.5 bg-green-900/30 text-green-300 text-xs rounded-full">
                        Available
                      </span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center text-center p-8 py-12 bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50">
                <img src={Mask} alt="No Results Found" className="w-24 h-24 mb-4 opacity-60" />
                <h2 className="font-bold text-xl mb-2">No Results Found</h2>
                <p className="text-gray-400 mb-6 max-w-lg">
                  We couldn't find any books matching your search criteria. Try adjusting your search terms or filters.
                </p>
                <button 
                  onClick={clearFilters}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>

          {/* Enhanced Pagination */}
          {books.length > 0 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-400">
                Page {currentPage} of {totalPages}
              </p>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-md ${
                    currentPage === 1
                      ? "text-gray-600 cursor-not-allowed"
                      : "text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                  aria-label="First page"
                >
                  <ChevronsLeft size={18} />
                </button>
                
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-md ${
                    currentPage === 1
                      ? "text-gray-600 cursor-not-allowed"
                      : "text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={18} />
                </button>
                
                <div className="flex items-center">
                  {getPageNumbers().map((page, index) => (
                    page < 0 ? (
                      <span key={`ellipsis-${page}`} className="px-2 text-gray-500">...</span>
                    ) : (
                      <button
                        key={`page-${page}`}
                        onClick={() => handlePageChange(page)}
                        className={`min-w-[36px] h-9 rounded-md ${
                          currentPage === page
                            ? "bg-amber-700 text-white"
                            : "text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  ))}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-md ${
                    currentPage === totalPages
                      ? "text-gray-600 cursor-not-allowed"
                      : "text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                  aria-label="Next page"
                >
                  <ChevronRight size={18} />
                </button>
                
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-md ${
                    currentPage === totalPages
                      ? "text-gray-600 cursor-not-allowed"
                      : "text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                  aria-label="Last page"
                >
                  <ChevronsRight size={18} />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </BackgroundWrapper>
  );
};

export default SearchPage;
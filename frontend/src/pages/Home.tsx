import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import BookCover from '@/components/ui/BookCover';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';
import { Star, BookOpen, TrendingUp, Calendar, ChevronRight, Loader2, Book, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import Chatbot from './Chatbot';

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
  created_at?: string;
}

interface RentalRequest {
  id: number;
  book_id: number;
  status: "pending" | "approved" | "rejected";
}

const Home = () => {
  const [featuredBook, setFeaturedBook] = useState<Book | null>(null);
  const [popularBooks, setPopularBooks] = useState<Book[]>([]);
  const [newestBooks, setNewestBooks] = useState<Book[]>([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);
  const [isLoadingNewest, setIsLoadingNewest] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [filteredPopularBooks, setFilteredPopularBooks] = useState<Book[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>(['All']);
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const [borrowLoading, setBorrowLoading] = useState<number | null>(null);
  const [userRequests, setUserRequests] = useState<Record<number, string>>({});
  const [activeRental, setActiveRental] = useState<any>(null); // Track active rental for featured book

  const navigate = useNavigate();

  // Extract unique categories from books
  useEffect(() => {
    if (popularBooks.length > 0) {
      const categories = new Set<string>();
      categories.add('All');
      
      popularBooks.forEach(book => {
        book.categories.forEach(category => {
          categories.add(category);
        });
      });
      
      setAllCategories(Array.from(categories));
    }
  }, [popularBooks]);

  // Filter books by selected category
  useEffect(() => {
    if (activeCategory === 'All') {
      setFilteredPopularBooks(popularBooks);
    } else {
      const filtered = popularBooks.filter(book => 
        book.categories.includes(activeCategory)
      );
      setFilteredPopularBooks(filtered);
    }
  }, [activeCategory, popularBooks]);

  // Check rental status for the featured book
  const checkRentalStatus = async (bookId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user) {
        throw new Error('No token or user found');
      }

      const rentalResponse = await axios.get(`/api/rentals/specific_rental/${user.id}/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // If the book is currently rented (returned_at is null), set activeRental
      if (rentalResponse.data && rentalResponse.data.returned_at === null) {
        setActiveRental(rentalResponse.data);
      } else {
        setActiveRental(null);
        // Clear the request from userRequests if it exists
        setUserRequests(prev => {
          const updated = { ...prev };
          delete updated[bookId];
          return updated;
        });
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error checking rental status:', error.response?.data || error.message);
      }
      setActiveRental(null);
      // Clear the request from userRequests if no active rental
      setUserRequests(prev => {
        const updated = { ...prev };
        delete updated[bookId];
        return updated;
      });
    }
  };

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchPopularBooks = async () => {
      try {
        setIsLoadingPopular(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');
        
        const response = await axios.get('/api/books/popular', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        setPopularBooks(response.data || []);
      } catch (error: any) {
        console.error('Error fetching popular books:', error.response?.data || error.message);
        setPopularBooks([]);
      } finally {
        setIsLoadingPopular(false);
      }
    };

    const fetchFeaturedBook = async () => {
      try {
        setIsLoadingFeatured(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');
        
        const response = await axios.get('/api/books/featured', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        setFeaturedBook(response.data || null);
      } catch (error: any) {
        console.error('Error fetching featured book:', error.response?.data || error.message);
        setFeaturedBook(null);
      } finally {
        setIsLoadingFeatured(false);
      }
    };

    const fetchNewestBooks = async () => {
      try {
        setIsLoadingNewest(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');
        
        const response = await axios.get('/api/books', {
          headers: { Authorization: `Bearer ${token}` },
          params: { sort: '-created_at', per_page: 5 }
        });
        
        setNewestBooks(response.data.books || []);
      } catch (error: any) {
        console.error('Error fetching newest books:', error.response?.data || error.message);
        setNewestBooks([]);
      } finally {
        setIsLoadingNewest(false);
      }
    };

    const fetchUserRentalRequests = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');
        
        const response = await axios.get('/api/rental_requests/my_requests?page=1&per_page=100', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const requestMap: Record<number, string> = {};
        if (response.data.requests && Array.isArray(response.data.requests)) {
          response.data.requests.forEach((req: any) => {
            if (req.status !== 'rejected') {
              requestMap[req.book_id] = req.status;
            }
          });
        }
        setUserRequests(requestMap);
      } catch (error: any) {
        console.error('Error fetching user rental requests:', error.response?.data || error.message);
      }
    };

    fetchFeaturedBook();
    fetchPopularBooks();
    fetchNewestBooks();
    fetchUserRentalRequests();
  }, [isAuthenticated, isAuthLoading, navigate]);

  // Check rental status for featured book after it's loaded
  useEffect(() => {
    if (featuredBook && user) {
      checkRentalStatus(featuredBook.id);
    }
  }, [featuredBook, user]);

  const renderRating = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <Star className="h-4 w-4 text-gray-500" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
        );
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-gray-500" />);
      }
    }

    return (
      <div className="flex items-center">
        <div className="flex mr-1">{stars}</div>
        <span className="text-sm text-amber-400">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const handleBorrowRequest = async (bookId: number) => {
    if (borrowLoading === bookId || userRequests[bookId] || activeRental) return;
    
    setBorrowLoading(bookId);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');
  
      const response = await axios.post(
        '/api/rental_requests',
        { book_id: bookId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setUserRequests(prev => ({
        ...prev,
        [bookId]: 'pending'
      }));
      
      setPopularBooks(prev => 
        prev.map(book => 
          book.id === bookId 
            ? { ...book, available_books: Math.max(0, book.available_books - 1) } 
            : book
        )
      );
      
      if (featuredBook && featuredBook.id === bookId) {
        setFeaturedBook(prev => 
          prev ? { ...prev, available_books: Math.max(0, prev.available_books - 1) } : prev
        );
      }
      
      toast.success('Rental request created successfully! Awaiting admin approval.');

      // Re-check rental status after making a request
      await checkRentalStatus(bookId);
    } catch (error: any) {
      console.error('Error creating rental request:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.error || 'Failed to create rental request.';
      toast.error(errorMsg);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setBorrowLoading(null);
    }
  };

  const handleViewAllBooks = () => {
    navigate('/search');
  };

  const handleBookClick = (bookId: number) => {
    navigate(`/book/${bookId}`);
  };

  if (isAuthLoading) {
    return (
      <BackgroundWrapper>
        <div className="flex h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-amber-400" />
            <p className="text-xl text-white">Loading your personal library...</p>
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Hero Section with Featured Book */}
        <section className="mb-16">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-900/40 to-gray-900/70 backdrop-blur-sm border border-amber-900/20 shadow-2xl">
            {isLoadingFeatured ? (
              <div className="flex flex-col md:flex-row p-8 md:p-12 animate-pulse gap-8">
                <div className="flex-1">
                  <div className="h-16 bg-gray-700/50 rounded-lg w-3/4 mb-4"></div>
                  <div className="h-6 bg-gray-700/50 rounded-lg w-1/2 mb-6"></div>
                  <div className="h-4 bg-gray-700/50 rounded-lg w-full mb-2"></div>
                  <div className="h-4 bg-gray-700/50 rounded-lg w-full mb-2"></div>
                  <div className="h-4 bg-gray-700/50 rounded-lg w-2/3 mb-6"></div>
                  <div className="flex gap-6 mb-6">
                    <div className="h-8 bg-gray-700/50 rounded-lg w-24"></div>
                    <div className="h-8 bg-gray-700/50 rounded-lg w-24"></div>
                  </div>
                  <div className="h-12 bg-gray-700/50 rounded-lg w-48"></div>
                </div>
                <div className="md:w-1/3 h-96 bg-gray-700/50 rounded-lg"></div>
              </div>
            ) : featuredBook ? (
              <div className="flex flex-col md:flex-row gap-8 p-8 md:p-12">
                <div className="flex-1 text-white">
                  <div className="inline-block px-3 py-1 mb-4 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium">
                    Featured Book
                  </div>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-3 text-white leading-tight">
                    {featuredBook.title}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1 text-amber-400" />
                      <span className="text-gray-300">By{" "}
                        <span className="text-white">{featuredBook.authors.join(', ')}</span>
                      </span>
                    </div>
                    
                    <span className="text-gray-500">•</span>
                    
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1 text-amber-400" />
                      <span className="text-gray-300">Categories:{" "}
                        <span className="text-white">{featuredBook.categories.slice(0, 2).join(', ')}</span>
                        {featuredBook.categories.length > 2 && <span> +{featuredBook.categories.length - 2}</span>}
                      </span>
                    </div>
                  </div>
                  
                  {renderRating(featuredBook.rating)}
                  
                  <div className="flex gap-6 my-6">
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-sm">Total Copies</span>
                      <span className="text-xl font-semibold">{featuredBook.total_books}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-sm">Available</span>
                      <span className={`text-xl font-semibold ${featuredBook.available_books > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {featuredBook.available_books}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-sm">Popularity</span>
                      <span className="text-xl font-semibold flex items-center">
                        <TrendingUp className="h-4 w-4 mr-1 text-amber-400" />
                        {featuredBook.borrow_count}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-8 line-clamp-3">{featuredBook.description}</p>
                  
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => handleBorrowRequest(featuredBook.id)}
                      className="px-6 py-6 bg-amber-500 hover:bg-amber-600 text-gray-900 font-medium transition-colors shadow-lg"
                      disabled={featuredBook.available_books <= 0 || activeRental || userRequests[featuredBook.id] === 'pending' || borrowLoading === featuredBook.id}
                    >
                      <BookOpen className="mr-2 h-5 w-5" />
                      {borrowLoading === featuredBook.id
                        ? "Requesting..."
                        : activeRental
                        ? "Currently Borrowed"
                        : userRequests[featuredBook.id] === 'pending'
                        ? "Request Pending"
                        : featuredBook.available_books === 0
                        ? "Currently Unavailable"
                        : "Borrow This Book"}
                    </Button>
                    
                    <Button
                      onClick={() => handleBookClick(featuredBook.id)}
                      className="px-6 py-6 bg-gray-800/70 hover:bg-gray-700 text-white transition-colors"
                      variant="outline"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
                
                <div 
                  className="relative flex-shrink-0 md:w-1/3 min-h-[384px] md:min-h-[450px] cursor-pointer"
                  onClick={() => handleBookClick(featuredBook.id)}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent rounded-xl opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                    <span className="text-white text-sm font-medium">Click to view details</span>
                  </div>
                  <BookCover
                    id={featuredBook.id}
                    cover_url={featuredBook.cover_url}
                    title={featuredBook.title}
                    className="rounded-xl shadow-2xl h-full"
                  />
                  {featuredBook.available_books <= 0 && (
                    <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      OUT OF STOCK
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 md:p-12 text-center text-white">
                <div className="inline-block p-4 rounded-full bg-amber-500/20 text-amber-300 mb-4">
                  <Book className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold mb-2">No Featured Book Available</h2>
                <p className="text-gray-400 mb-6">Our librarians are currently selecting the next featured book.</p>
                <Button onClick={handleViewAllBooks} className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                  Browse All Books
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Category filter for popular books */}
        <section className="mb-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Popular Books</h2>
              <p className="text-gray-400">Discover our most borrowed titles</p>
            </div>
            <Button 
              onClick={handleViewAllBooks}
              variant="link" 
              className="text-amber-400 hover:text-amber-300 px-0 py-0 h-auto flex items-center"
            >
              View all books
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
            {allCategories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === category
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Popular Books Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {isLoadingPopular ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col animate-pulse bg-gray-800/50 rounded-lg overflow-hidden shadow-md"
                >
                  <div className="relative h-56 bg-gray-700/50"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-700/50 rounded w-1/2 mb-3"></div>
                    <div className="flex gap-1">
                      <div className="h-3 w-3 bg-gray-700/50 rounded-full"></div>
                      <div className="h-3 w-3 bg-gray-700/50 rounded-full"></div>
                      <div className="h-3 w-3 bg-gray-700/50 rounded-full"></div>
                      <div className="h-3 w-3 bg-gray-700/50 rounded-full"></div>
                      <div className="h-3 w-3 bg-gray-700/50 rounded-full"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : filteredPopularBooks.length > 0 ? (
              filteredPopularBooks.map((book) => (
                <div
                  key={book.id}
                  className="flex flex-col bg-gray-800/40 backdrop-blur-sm rounded-lg overflow-hidden shadow-lg hover:shadow-amber-900/20 border border-gray-700/50 hover:border-amber-700/30 transition-all duration-300 hover:translate-y-[-4px] cursor-pointer"
                  onClick={() => handleBookClick(book.id)}
                >
                  <div className="relative h-56">
                    <BookCover 
                      id={book.id} 
                      cover_url={book.cover_url} 
                      title={book.title} 
                      size="sm"
                      className="h-full w-full object-cover"
                    />
                    {book.available_books <= 0 && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <span className="px-2 py-1 bg-red-900/80 text-red-200 text-xs font-medium rounded-full">
                          Unavailable
                        </span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-gray-900/70 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium text-white flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1 text-amber-400" />
                      {book.borrow_count}
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col">
                    <h3 className="font-medium text-white mb-1 line-clamp-2">{book.title}</h3>
                    <p className="text-xs text-gray-400 mb-2 line-clamp-1">
                      By {book.authors.join(', ')}
                    </p>
                    {renderRating(book.rating)}
                    
                    <div className="mt-auto pt-3 flex justify-between items-center">
                      <span className="text-xs text-gray-400">
                        {book.available_books}/{book.total_books}
                      </span>
                      {book.available_books > 0 && !userRequests[book.id] ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBorrowRequest(book.id);
                          }}
                          className={`text-xs px-3 py-1 rounded-full ${
                            borrowLoading === book.id
                              ? "bg-gray-700 text-gray-300"
                              : "bg-amber-600 hover:bg-amber-500 text-white"
                          }`}
                          disabled={borrowLoading === book.id}
                        >
                          {borrowLoading === book.id ? "..." : "Borrow"}
                        </button>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          userRequests[book.id]
                            ? 'bg-blue-900/30 text-blue-300'
                            : book.available_books > 0 
                              ? 'bg-green-900/30 text-green-300' 
                              : 'bg-red-900/30 text-red-300'
                        }`}>
                          {userRequests[book.id]
                            ? userRequests[book.id] === "pending" ? "Pending" : "Borrowed"
                            : book.available_books > 0 ? 'Available' : 'Unavailable'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-8 text-center bg-gray-800/30 rounded-lg border border-gray-700/50">
                <Book className="h-12 w-12 text-gray-600 mb-3" strokeWidth={1} />
                <h3 className="text-xl font-medium text-white mb-2">No books found</h3>
                <p className="text-gray-400 mb-4">
                  {activeCategory !== 'All' 
                    ? `No books found in the "${activeCategory}" category.` 
                    : 'No popular books available at the moment.'}
                </p>
                {activeCategory !== 'All' && (
                  <Button onClick={() => setActiveCategory('All')} variant="secondary">
                    View All Categories
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Newest Additions Section */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">New Arrivals</h2>
              <p className="text-gray-400">The latest additions to our library</p>
            </div>
            <Button 
              onClick={handleViewAllBooks}
              variant="link" 
              className="text-amber-400 hover:text-amber-300 px-0 py-0 h-auto flex items-center"
            >
              View all
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden shadow-lg">
            {isLoadingNewest ? (
              <div className="animate-pulse p-6 divide-y divide-gray-700/50">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="h-24 w-16 bg-gray-700/50 rounded"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-700/50 rounded w-1/2 mb-3"></div>
                      <div className="flex gap-2">
                        <div className="h-6 w-16 bg-gray-700/50 rounded-full"></div>
                        <div className="h-6 w-16 bg-gray-700/50 rounded-full"></div>
                      </div>
                    </div>
                    <div className="w-24 h-8 bg-gray-700/50 rounded self-center"></div>
                  </div>
                ))}
              </div>
            ) : newestBooks.length > 0 ? (
              <div className="divide-y divide-gray-700/50">
                {newestBooks.map((book) => (
                  <div 
                    key={book.id} 
                    className="flex p-6 gap-4 hover:bg-gray-700/20 transition-colors cursor-pointer"
                    onClick={() => handleBookClick(book.id)}
                  >
                    <div className="flex-shrink-0 w-16">
                      <BookCover
                        id={book.id}
                        cover_url={book.cover_url}
                        title={book.title}
                        size="xs"
                        className="rounded-md shadow-md h-24 w-16 object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-white mb-1">{book.title}</h3>
                      <p className="text-sm text-gray-400 mb-2">
                        By {book.authors.join(', ')}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {renderRating(book.rating)}
                        <span className="text-gray-500">•</span>
                        <div className="flex items-center text-xs text-gray-400">
                          <Calendar className="h-3 w-3 mr-1" />
                          {book.created_at 
                            ? new Date(book.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              }) 
                            : 'New'}
                        </div>
                        <span className="text-gray-500">•</span>
                        <div className="flex flex-wrap gap-1">
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
                    </div>
                    <div className="flex-shrink-0 self-center">
                      {book.available_books > 0 ? (
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBorrowRequest(book.id);
                          }}
                          size="sm"
                          className="bg-amber-500 hover:bg-amber-600 text-gray-900"
                          disabled={book.available_books <= 0 || !!userRequests[book.id] || borrowLoading === book.id}
                        >
                          {borrowLoading === book.id
                            ? "..."
                            : userRequests[book.id]
                            ? "Requested"
                            : "Borrow"}
                        </Button>
                      ) : (
                        <span className="px-3 py-1 bg-red-900/30 text-red-300 text-xs font-medium rounded-full">
                          Unavailable
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-3" strokeWidth={1} />
                <h3 className="text-xl font-medium text-white mb-2">No New Arrivals</h3>
                <p className="text-gray-400">
                  Check back soon for new additions to our library
                </p>
              </div>
            )}
          </div>
        </section>
        <Chatbot />
      </main>
    </BackgroundWrapper>
  );
};

export default Home;

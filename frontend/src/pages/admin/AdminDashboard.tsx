import { useState, useEffect } from 'react';
import Layout from '@/components/layout/layout';
import { 
  ChevronRight, 
  Book, 
  Users, 
  Library,
  MoreHorizontal, 
  TrendingDown, 
  TrendingUp,
  Search,
  Plus,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// Define types based on your models
type Author = {
  id: number;
  name: string;
};

type Book = {
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
  featured_book: boolean;
  created_at: string;
};

type RentalRequest = {
  id: number;
  user_id: number;
  book_id: number;
  requested_at: string;
  status: string;
  book: Book;
  user: User;
};

type Rental = {
  id: number;
  user_id: number;
  book_id: number;
  rented_at: string;
  returned_at: string | null;
  book: Book;
  user: User;
};

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  initials?: string;
};

// Helper function to format dates
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date);
};

// Component for user avatar
const UserAvatar = ({ user }: { user: User }) => {
  const colorVariants = [
    'bg-indigo-900/30 text-indigo-400',
    'bg-purple-900/30 text-purple-400',
    'bg-blue-900/30 text-blue-400',
    'bg-green-900/30 text-green-400',
  ];
  
  const colorIndex = user.id % colorVariants.length;
  const bgColorClass = user.avatar ? '' : colorVariants[colorIndex];
  
  return (
    <div className={`flex-shrink-0 w-10 h-10 rounded-full ${bgColorClass} flex items-center justify-center overflow-hidden`}>
      {user.avatar ? (
        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-sm font-medium">{user.initials || user.name.split(' ').map(n => n[0]).join('')}</span>
      )}
    </div>
  );
};

// Component for book cover
const BookCover = ({ book }: { book: Book }) => {
  return (
    <div className="flex-shrink-0 w-12 h-16 bg-gray-800 rounded-md overflow-hidden shadow group-hover:shadow-md transition-shadow duration-200">
      {book?.cover_url ? (
        <img 
          src={book.cover_url} 
          alt={book.title} 
          className="w-full h-full object-cover" 
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 to-indigo-800">
          <Book size={20} className="text-indigo-300" />
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {

  // Get the current authenticated user
  const { user } = useAuth();

  // States for data
  const [borrowRequests, setBorrowRequests] = useState<RentalRequest[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  
  // Loading states
  const [loadingBorrowRequests, setLoadingBorrowRequests] = useState<boolean>(true);
  const [loadingRentals, setLoadingRentals] = useState<boolean>(true);
  const [loadingBooks, setLoadingBooks] = useState<boolean>(true);
  
  // Error states
  const [errorBorrowRequests, setErrorBorrowRequests] = useState<string | null>(null);
  const [errorRentals, setErrorRentals] = useState<string | null>(null);
  const [errorBooks, setErrorBooks] = useState<string | null>(null);

  // Dummy account requests data
  const [accountRequests] = useState<User[]>([
    {
      id: 201,
      name: 'Marc Atenson',
      email: 'marcatenson@gmail.com',
      role: 'user',
      avatar: '/images/marc.jpg'
    },
    {
      id: 202,
      name: 'Susan Drake',
      email: 'contact@susandrake.com',
      role: 'user',
      initials: 'SD'
    },
    {
      id: 203,
      name: 'Ronald Richards',
      email: 'ronaldrichards@gmail.com',
      role: 'user',
      initials: 'RR'
    },
    {
      id: 204,
      name: 'Jane Cooper',
      email: 'janecooper@example.com',
      role: 'user',
      avatar: '/images/jane.jpg'
    },
    {
      id: 205,
      name: 'Ian Warren',
      email: 'ianwarren@example.com',
      role: 'user',
      initials: 'IW'
    },
    {
      id: 206,
      name: 'Darrell Steward',
      email: 'darrell@example.com',
      role: 'user',
      avatar: '/images/darrell.jpg'
    }
  ]);

  // Stats state
  const [stats, setStats] = useState({
    borrowedBooks: 0,
    totalUsers: 0,
    totalBooks: 0
  });

  // Fetch the number of users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Users data:', result);
        setStats(prev => ({
          ...prev,
          totalUsers: result.length
        }));
      } catch (error) {
        console.error('Error fetching users:', error);
        setErrorRentals(error instanceof Error ? error.message : 'An unknown error occurred');
      }
    };

    fetchUsers();
  }, []);

  // Fetch borrow requests
  useEffect(() => {
    const fetchBorrowRequests = async () => {
      try {
        setLoadingBorrowRequests(true);
        const token = localStorage.getItem('token');
        const response = await fetch('/api/rental_requests/pending', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const result = await response.json();
        setBorrowRequests(result.requests || []);
      } catch (error) {
        console.error('Error fetching borrow requests:', error);
        setErrorBorrowRequests(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setLoadingBorrowRequests(false);
      }
    };

    fetchBorrowRequests();
  }, []);

  // Fetch rentals
  useEffect(() => {
    const fetchRentals = async () => {
      try {
        setLoadingRentals(true);
        const response = await fetch('api/rentals');
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const result = await response.json();
        setRentals(result);
        
        // Update borrowed books count
        setStats(prev => ({
          ...prev,
          borrowedBooks: result.filter((rental: Rental) => !rental.returned_at).length
        }));
      } catch (error) {
        console.error('Error fetching rentals:', error);
        setErrorRentals(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setLoadingRentals(false);
      }
    };

    fetchRentals();
  }, []);

  // Fetch books
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoadingBooks(true);
        const token = localStorage.getItem('token');
        const response = await fetch('/api/books', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.books || !Array.isArray(result.books)) {
          throw new Error('Invalid response format');
        }
        
        setBooks(result.books);
        
        // Update total books count
        setStats(prev => ({
          ...prev,
          totalBooks: result.total_count || result.books.length
        }));
      } catch (error) {
        console.error('Error fetching books:', error);
        setErrorBooks(error instanceof Error ? error.message : 'An unknown error occurred');
        setBooks([]);
      } finally {
        setLoadingBooks(false);
      }
    };

    fetchBooks();
  }, []);

  // Get the most recently added books
  const getRecentlyAddedBooks = (): Book[] => {
    if (!Array.isArray(books)) {
      return [];
    }

    return [...books]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6);
  };

  const recentlyAddedBooks = getRecentlyAddedBooks();

  return (
    <Layout>
      <div className="p-6">
        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-100">Welcome, {user?.name || 'Admin'}</h1>
          <p className="text-sm text-gray-400">Monitor all of your users and tasks here</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-red-900/30 rounded-lg mr-3">
                  <Book size={20} className="text-red-400" />
                </div>
                <h2 className="text-sm font-medium text-gray-300">Borrowed Books</h2>
              </div>
              <span className="flex items-center text-xs font-medium text-red-400">
                <TrendingUp size={16} className="mr-1" />
                12%
              </span>
            </div>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-bold text-gray-100">
                {loadingRentals ? '...' : stats.borrowedBooks}
              </h3>
              <div className="text-xs text-gray-400">
                From total of {stats.totalBooks || '...'} books
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-900/30 rounded-lg mr-3">
                  <Users size={20} className="text-blue-400" />
                </div>
                <h2 className="text-sm font-medium text-gray-300">Total Users</h2>
              </div>
              <span className="flex items-center text-xs font-medium text-green-400">
                <TrendingUp size={16} className="mr-1" />
                8%
              </span>
            </div>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-bold text-gray-100">
                {stats.totalUsers || '...'}
              </h3>
              <div className="text-xs text-gray-400">
                {accountRequests.length} new requests
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-900/30 rounded-lg mr-3">
                  <Library size={20} className="text-purple-400" />
                </div>
                <h2 className="text-sm font-medium text-gray-300">Total Books</h2>
              </div>
              <span className="flex items-center text-xs font-medium text-green-400">
                <TrendingUp size={16} className="mr-1" />
                4%
              </span>
            </div>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-bold text-gray-100">
                {loadingBooks ? '...' : stats.totalBooks}
              </h3>
              <div className="text-xs text-gray-400">
                {recentlyAddedBooks.length} recently added
              </div>
            </div>
          </div>
        </div>

        {/* Borrow Requests */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-bold text-gray-200">Borrow Requests</h2>
            <a href="#" className="flex items-center text-indigo-400 text-sm font-medium hover:text-indigo-300 transition-colors">
              View all
              <ChevronRight size={16} className="ml-1" />
            </a>
          </div>
          
          <div className="bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-700">
            {loadingBorrowRequests ? (
              <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400"></div>
              </div>
            ) : errorBorrowRequests ? (
              <div className="text-center py-8">
                <div className="text-red-400 mb-2">⚠️</div>
                <div className="text-gray-300">Error: {errorBorrowRequests}</div>
              </div>
            ) : borrowRequests.length > 0 ? (
              <div className="divide-y divide-gray-700">
                {borrowRequests.map((request) => (
                  <div key={request.id} className="p-5 flex items-center justify-between group hover:bg-gray-750 transition-colors">
                    <div className="flex items-center space-x-4">
                      <BookCover book={request.book} />
                      <div>
                        <h3 className="font-semibold text-gray-100">
                          {request.book?.title || "Untitled Book"}
                        </h3>
                        <p className="text-sm text-gray-400">
                          By {request.book?.authors?.join(', ') || "Unknown Author"} • 
                          {request.book?.categories?.join(', ') || "Uncategorized"}
                        </p>
                        <div className="flex items-center mt-2">
                          <UserAvatar user={request.user} />
                          <div className="ml-2">
                            <p className="text-sm font-medium text-gray-300">{request.user?.name || "Unknown User"}</p>
                            <p className="text-xs text-gray-400">
                              Requested on {formatDate(request.requested_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button className="p-2 rounded-full text-gray-400 hover:bg-gray-700 transition-colors">
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mb-3 bg-gray-700 rounded-full p-3 inline-flex">
                  <Book size={24} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-200 mb-1">No borrow requests</h3>
                <p className="text-gray-400">All book requests have been processed.</p>
              </div>
            )}
          </div>
        </div>

        {/* Two Column Layout for Recently Added Books and Account Requests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recently Added Books */}
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-gray-200">Recently Added Books</h2>
              <a href="#" className="flex items-center text-indigo-400 text-sm font-medium hover:text-indigo-300 transition-colors">
                View all
                <ChevronRight size={16} className="ml-1" />
              </a>
            </div>
            
            <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-5">
              <button className="w-full flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-4 mb-5 hover:bg-gray-700 transition-colors group">
                <div className="flex items-center text-gray-400 group-hover:text-indigo-400 transition-colors">
                  <Plus size={18} className="mr-2" />
                  <span className="font-medium">Add New Book</span>
                </div>
              </button>
              
              {loadingBooks ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="animate-pulse flex space-x-4">
                      <div className="bg-gray-700 rounded w-12 h-16"></div>
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : errorBooks ? (
                <div className="text-center py-8">
                  <div className="text-red-400 mb-2">⚠️</div>
                  <div className="text-gray-300">Error: {errorBooks}</div>
                </div>
              ) : recentlyAddedBooks.length > 0 ? (
                <div className="space-y-4">
                  {recentlyAddedBooks.map((book) => (
                    <div key={book.id} className="flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors group">
                      <BookCover book={book} />
                      <div className="ml-4">
                        <h3 className="font-medium text-gray-200">{book.title}</h3>
                        <p className="text-sm text-gray-400">
                          By {book.authors?.join(', ') || "Unknown Author"}
                        </p>
                        <div className="flex items-center mt-1">
                          <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
                            {book.categories?.[0] || "Uncategorized"}
                          </span>
                          <span className="mx-2 text-gray-600">•</span>
                          <span className="text-xs text-gray-400">
                            Added {formatDate(book.created_at)}
                          </span>
                        </div>
                      </div>
                      <button className="ml-auto p-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-200 transition-opacity">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-gray-700 rounded-full p-3 inline-flex mb-3">
                    <Book size={24} className="text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-200 mb-1">No books found</h3>
                  <p className="text-gray-400">Add your first book to get started</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Account Requests */}
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-gray-200">Account Requests</h2>
              <a href="#" className="flex items-center text-indigo-400 text-sm font-medium hover:text-indigo-300 transition-colors">
                View all
                <ChevronRight size={16} className="ml-1" />
              </a>
            </div>
            
            <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {accountRequests.map(user => (
                  <div 
                    key={user.id} 
                    className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700"
                  >
                    <div className="mb-3 relative">
                      <div className={
                        user.id % 4 === 0 ? 'bg-indigo-900/30 text-indigo-400' :
                        user.id % 4 === 1 ? 'bg-purple-900/30 text-purple-400' :
                        user.id % 4 === 2 ? 'bg-blue-900/30 text-blue-400' :
                        'bg-green-900/30 text-green-400'
                      + ' w-16 h-16 rounded-full flex items-center justify-center overflow-hidden'}>
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-medium">{user.initials || user.name.split(' ').map(n => n[0]).join('')}</span>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-gray-700 rounded-full p-1">
                        <div className="bg-green-500 w-3 h-3 rounded-full"></div>
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-200 text-center">{user.name}</h3>
                    <p className="text-xs text-gray-400 text-center truncate w-full">{user.email}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
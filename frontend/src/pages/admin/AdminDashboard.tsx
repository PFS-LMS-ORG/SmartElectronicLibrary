import { useState, useEffect } from 'react';
import Layout from '@/components/layout/layout';

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

const AdminDashboard = () => {
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
            setErrorBorrowRequests(null);

            const token = localStorage.getItem('token');
            if (!token) {
            throw new Error('No authentication token found');
            }

            const response = await fetch('/api/rental_requests/pending', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            });
            
            if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Admin access required');
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Borrow requests data:', result);

            // Verify response structure
            if (!result.requests || !Array.isArray(result.requests)) {
            throw new Error('Invalid response format: Expected { requests: [...] }');
            }

            setBorrowRequests(result.requests);

            // Debug logs
            console.log('Borrow requests type:', typeof result.requests, Array.isArray(result.requests), result.requests.length);
            if (result.requests.length > 0) {
            console.log('First borrow request:', result.requests[0]);
            }
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
            console.log('Rentals data:', result);
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
            setErrorBooks(null);

            const token = localStorage.getItem('token');
            if (!token) {
            throw new Error('No authentication token found');
            }

            const response = await fetch('/api/books', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            });
            
            if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Unauthorized access');
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Books data:', result);

            // Verify response structure
            if (!result.books || !Array.isArray(result.books)) {
            throw new Error('Invalid response format: Expected { books: [...] }');
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
            setBooks([]); // Reset to empty array on error
        } finally {
            setLoadingBooks(false);
        }
        };

        fetchBooks();
    }, []);

    // Get the most recently added books
    const getRecentlyAddedBooks = (): Book[] => {
        // Ensure books is an array
        if (!Array.isArray(books)) {
        console.warn('books is not an array:', books);
        return [];
        }

        // Sort books by created_at date in descending order
        return [...books]
        .sort((a, b) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .slice(0, 6); // Get the 6 most recent books
    };

    const recentlyAddedBooks = getRecentlyAddedBooks();

    console.log(borrowRequests[0]?.book);

    return (
        <Layout>
            <div className="p-6">
                {/* Welcome Header */}
                <div className="mb-6">
                    <h1 className="text-lg text-gray-600">Welcome, Adrian</h1>
                    <p className="text-sm text-gray-500">Monitor all of your projects and tasks here</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex justify-between items-start mb-2">
                        <h2 className="text-sm font-medium text-gray-500">Borrowed Books</h2>
                        <span className="text-red-500 flex items-center text-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            2
                        </span>
                        </div>
                        <h3 className="text-3xl font-bold">{loadingRentals ? '...' : stats.borrowedBooks}</h3>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex justify-between items-start mb-2">
                        <h2 className="text-sm font-medium text-gray-500">Total Users</h2>
                        <span className="text-green-500 flex items-center text-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            4
                        </span>
                        </div>
                        <h3 className="text-3xl font-bold">{stats.totalUsers}</h3>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex justify-between items-start mb-2">
                        <h2 className="text-sm font-medium text-gray-500">Total Books</h2>
                        <span className="text-green-500 flex items-center text-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            2
                        </span>
                        </div>
                        <h3 className="text-3xl font-bold">{loadingBooks ? '...' : stats.totalBooks}</h3>
                    </div>
                </div>

                {/* Borrow Requests */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Borrow Requests</h2>
                        <a href="#" className="text-blue-600 text-sm">View all</a>
                    </div>
                    
                    <div className="space-y-4">
                        {loadingBorrowRequests ? (
                        <div className="text-center py-4">Loading borrow requests...</div>
                        ) : errorBorrowRequests ? (
                        <div className="text-center py-4 text-red-500">Error: {errorBorrowRequests}</div>
                        ) : borrowRequests.length > 0 ? (
                        borrowRequests.map((request) => (
                            <div key={request.id} className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-12 h-16 bg-gray-200 rounded mr-4 overflow-hidden">
                                {request.book?.cover_url ? (
                                    <img 
                                    src={request.book.cover_url} 
                                    alt={request.book.title} 
                                    className="w-full h-full object-cover" 
                                    />
                                ) : (
                                    <div className="w-full h-full bg-indigo-100"></div>
                                )}
                                </div>
                                <div>
                                <h3 className="font-medium text-sm">{request.book?.title || "Untitled Book"}</h3>
                                <p className="text-xs text-gray-500">
                                    By {request.book?.authors?.toString() || "Unknown Author"} • 
                                    {request.book?.categories?.toString() || "Uncategorized"}
                                </p>
                                <div className="flex items-center mt-1">
                                    <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden mr-1">
                                    <span className="text-xs">
                                        {request.user?.name ? request.user.name.split(' ').map(n => n[0]).join('') : "U"}
                                    </span>
                                    </div>
                                    <span className="text-xs text-gray-500">{request.user?.name || "Unknown User"}</span>
                                    <span className="text-xs text-gray-400 ml-2">
                                    {new Date(request.requested_at).toLocaleDateString()}
                                    </span>
                                </div>
                                </div>
                            </div>
                            <button className="text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                                </svg>
                            </button>
                            </div>
                        ))
                        ) : (
                        <div className="text-center py-4">No borrow requests found</div>
                        )}
                    </div>
                </div>

                {/* Two Column Layout for Recently Added Books and Account Requests */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recently Added Books */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Recently Added Books</h2>
                        <a href="#" className="text-blue-600 text-sm">View all</a>
                        </div>
                        
                        <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4 hover:bg-gray-50 cursor-pointer">
                            <div className="flex items-center text-gray-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            <span>Add New Book</span>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            {loadingBooks ? (
                            <div className="text-center py-4">Loading books...</div>
                            ) : errorBooks ? (
                            <div className="text-center py-4 text-red-500">Error: {errorBooks}</div>
                            ) : recentlyAddedBooks.length > 0 ? (
                            recentlyAddedBooks.map((book) => (
                                <div key={book.id} className="flex items-center">
                                <div className="w-12 h-16 bg-gray-200 rounded mr-4 overflow-hidden">
                                    {book.cover_url ? (
                                    <img 
                                        src={book.cover_url} 
                                        alt={book.title} 
                                        className="w-full h-full object-cover" 
                                    />
                                    ) : (
                                    <div className="w-full h-full bg-indigo-100"></div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-medium text-sm">{book.title}</h3>
                                    <p className="text-xs text-gray-500">
                                    By {book.authors?.join(', ') || "Unknown Author"} • 
                                    {book.categories?.join(', ') || "Uncategorized"}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                    {new Date(book.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                </div>
                            ))
                            ) : (
                            <div className="text-center py-4">No books found</div>
                            )}
                        </div>
                        </div>
                    </div>
                    
                    {/* Account Requests */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Account Requests</h2>
                        <a href="#" className="text-blue-600 text-sm">View all</a>
                        </div>
                        
                        <div className="bg-white rounded-lg shadow p-4">
                        <div className="grid grid-cols-3 gap-4">
                            {accountRequests.map(user => (
                            <div key={user.id} className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-2 overflow-hidden">
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className={`w-full h-full flex items-center justify-center ${
                                    user.initials === 'SD' ? 'bg-purple-200 text-purple-600' : 
                                    user.initials === 'RR' ? 'bg-yellow-200 text-yellow-600' :
                                    user.initials === 'IW' ? 'bg-green-200 text-green-600' :
                                    'bg-gray-200 text-gray-600'
                                    }`}>
                                    <span className="text-lg font-medium">{user.initials || user.name.split(' ').map(n => n[0]).join('')}</span>
                                    </div>
                                )}
                                </div>
                                <h3 className="text-sm font-medium text-center">{user.name}</h3>
                                <p className="text-xs text-gray-500 text-center truncate w-full">{user.email}</p>
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
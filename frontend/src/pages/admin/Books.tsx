import React, { useState, useEffect } from 'react';
import { FiEdit2, FiTrash2, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import Layout from '@/components/layout/layout';
import { useNavigate } from 'react-router-dom';

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

const BooksPage: React.FC = () => {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sortField, setSortField] = useState<keyof Book>('title');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const navigate = useNavigate();

    useEffect(() => {
        fetchBooks();
    }, []);

    const fetchBooks = async (query: string = '') => {
        try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }

        const url = query ? `/api/books?search=${encodeURIComponent(query)}` : '/api/books';
        const response = await fetch(url, {
            method: 'GET',
            headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
            throw new Error('Unauthorized: Please log in again');
            }
            if (response.status === 403) {
            throw new Error('Forbidden: Admin access required');
            }
            if (response.status === 500) {
            throw new Error('Server error: Unable to process search');
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Books response:', data);
        if (!data.books || !Array.isArray(data.books)) {
            throw new Error('Invalid response format: Expected { books: [...] }');
        }

        setBooks(data.books);
        setError(null);
        } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch books. Please try again later.';
        setError(errorMessage);
        console.error('Error fetching books:', err);
        setBooks([]);
        } finally {
        setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchBooks(searchQuery);
    };

    const handleSort = (field: keyof Book) => {
        if (field === sortField) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
        setSortField(field);
        setSortDirection('asc');
        }
    };

    const handleDeleteBook = async (bookId: number) => {
        if (window.confirm('Are you sure you want to delete this book?')) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
            throw new Error('No authentication token found');
            }

            const response = await fetch(`/api/books/${bookId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            });

            if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Forbidden: Admin access required to delete books');
            }
            if (response.status === 404) {
                throw new Error('Book not found');
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
            }

            setBooks(books.filter(book => book.id !== bookId));
            setError(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete book. Please try again.';
            setError(errorMessage);
            console.error('Error deleting book:', err);
        }
        }
    };

    const handleEditBook = (bookId: number) => {
        navigate(`/admin/edit/${bookId}`);
    };

    const getSortIcon = (field: keyof Book) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? <FiChevronUp className="inline" /> : <FiChevronDown className="inline" />;
    };

    const sortedBooks = [...books].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
        return 0;
    });

    const getCoverColor = (title: string) => {
        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500'];
        const index = title.length % colors.length;
        return colors[index];
    };

    return (
        <Layout>
        <div className="container mx-auto bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-semibold">All Books</h1>
            <div className="flex gap-2">
                <button className="px-3 py-1 text-sm border border-gray-300 rounded" onClick={() => handleSort('title')}>
                A-Z {getSortIcon('title')}
                </button>
                <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded" onClick={() => navigate('/books/create')}>
                Create a New Book
                </button>
            </div>
            </div>

            <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
                <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search books by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="absolute right-2 top-2 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                </button>
            </div>
            </form>

            {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
            </div>
            )}

            {loading ? (
            <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
            ) : (
            <div className="overflow-x-auto">
                <table className="w-full table-auto">
                <thead>
                    <tr className="border-b border-dotted border-gray-300">
                    <th className="text-left py-2 px-4 text-sm text-gray-600 cursor-pointer" onClick={() => handleSort('title')}>
                        Title {getSortIcon('title')}
                    </th>
                    <th className="text-left py-2 px-4 text-sm text-gray-600">Authors</th>
                    <th className="text-left py-2 px-4 text-sm text-gray-600">Categories</th>
                    <th className="text-left py-2 px-4 text-sm text-gray-600">Available</th>
                    <th className="text-left py-2 px-4 text-sm text-gray-600">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedBooks.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="text-center py-4 text-gray-500">No books found</td>
                    </tr>
                    ) : (
                    sortedBooks.map((book) => (
                        <tr key={book.id} className="border-b border-dotted border-gray-300 hover:bg-gray-50">
                        <td className="py-4 px-4">
                            <div className="flex items-center">
                            <div className={`w-10 h-14 ${getCoverColor(book.title)} rounded flex items-center justify-center mr-3 text-white text-xs`}>
                                {book.cover_url ? (
                                <img
                                    src={book.cover_url}
                                    alt={book.title}
                                    className="w-full h-full object-cover rounded"
                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                                ) : (
                                <span>BOOK</span>
                                )}
                            </div>
                            <div className="font-medium">{book.title}</div>
                            </div>
                        </td>
                        <td className="py-4 px-4">{book.authors.length > 0 ? book.authors.join(', ') : 'Unknown Author'}</td>
                        <td className="py-4 px-4">{book.categories.length > 0 ? book.categories.join(', ') : 'Uncategorized'}</td>
                        <td className="py-4 px-4">
                            {book.available_books}/{book.total_books}
                        </td>
                        <td className="py-4 px-4">
                            <div className="flex gap-3">
                            <button className="text-blue-500" onClick={() => handleEditBook(book.id)}>
                                <FiEdit2 />
                            </button>
                            <button className="text-red-500" onClick={() => handleDeleteBook(book.id)}>
                                <FiTrash2 />
                            </button>
                            </div>
                        </td>
                        </tr>
                    ))
                    )}
                </tbody>
                </table>
            </div>
            )}
        </div>
        </Layout>
    );
};

export default BooksPage;
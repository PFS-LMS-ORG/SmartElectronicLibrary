import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import BookCover from '@/components/ui/BookCover';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';

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

const Home = () => {
  const [featuredBook, setFeaturedBook] = useState<Book | null>(null);
  const [popularBooks, setPopularBooks] = useState<Book[]>([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Home useEffect: isAuthLoading=%s, isAuthenticated=%s', isAuthLoading, isAuthenticated);
    if (isAuthLoading) {
      console.log('Waiting for auth state to resolve');
      return;
    }

    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }

    const fetchPopularBooks = async () => {
      try {
        setIsLoadingPopular(true);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No token found');
        }
        console.log('Fetching popular books with token:', token.slice(0, 20) + '...');
        const response = await axios.get('/api/books/popular', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log('Popular books response:', response.data);
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
        if (!token) {
          throw new Error('No token found');
        }
        console.log('Fetching featured book with token:', token.slice(0, 20) + '...');
        const response = await axios.get('/api/books/featured', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log('Featured book response:', response.data);
        setFeaturedBook(response.data || null);
      } catch (error: any) {
        console.error('Error fetching featured book:', error.response?.data || error.message);
        setFeaturedBook(null);
      } finally {
        setIsLoadingFeatured(false);
      }
    };

    fetchFeaturedBook();
    fetchPopularBooks();
  }, [isAuthenticated, isAuthLoading, navigate]);

  if (isAuthLoading) {
    console.log('Home rendering auth loading state');
    return <div className="flex h-screen items-center justify-center bg-gray-100">Loading...</div>;
  }

  return (
    <BackgroundWrapper>
      <main className="container mx-auto px-8 lg:px-16 py-8">
        <section className="flex flex-col md:flex-row gap-10 mb-16 text-white">
          <div className="flex-1">
            {isLoadingFeatured ? (
              <div className="animate-pulse">
                <div className="h-16 bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-6 bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="flex gap-6 mb-6">
                  <div className="h-6 bg-gray-700 rounded w-24"></div>
                  <div className="h-6 bg-gray-700 rounded w-24"></div>
                </div>
                <div className="h-24 bg-gray-700 rounded w-full mb-6"></div>
                <div className="h-12 bg-gray-700 rounded w-48"></div>
              </div>
            ) : featuredBook ? (
              <>
                <h1 className="text-6xl font-bold mb-4">{featuredBook.title}</h1>
                <div className="mb-4">
                  <span>By {featuredBook.authors.join(', ')}</span>
                  <span className="mx-4">Category: {featuredBook.categories.join(', ')}</span>
                  <span className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-yellow-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3 .921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784 .57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81 .588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {featuredBook.rating}/5
                  </span>
                </div>
                <div className="flex gap-6 mb-6">
                  <div>Total books: {featuredBook.total_books}</div>
                  <div>Available books: {featuredBook.available_books}</div>
                </div>
                <p className="mb-6">{featuredBook.description}</p>
                <Button
                  className="px-6 py-7"
                  style={{ backgroundColor: '#EED1AC', color: '#16191E' }}
                >
                  <svg
                    width="18"
                    height="16"
                    viewBox="0 0 18 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8.375 1.77751C7.06925 0.941149 5.55063 0.497712 4 0.500009C3.07749 0.499066 2.16158 0.655475 1.29167 0.962509C1.16983 1.00559 1.06433 1.08537 0.989715 1.19088C0.915096 1.2964 0.875018 1.42244 0.875 1.55168V13.4267C0.875014 13.5267 0.899014 13.6252 0.944985 13.714C0.990955 13.8027 1.05755 13.8792 1.13919 13.9369C1.22083 13.9946 1.31512 14.0319 1.41416 14.0457C1.51319 14.0594 1.61407 14.0492 1.70833 14.0158C2.44444 13.7562 3.21945 13.624 4 13.625C5.6625 13.625 7.18583 14.2142 8.375 15.1967V1.77751ZM9.625 15.1967C10.8553 14.1785 12.403 13.6225 14 13.625C14.805 13.625 15.575 13.7633 16.2917 14.0167C16.386 14.05 16.487 14.0602 16.5861 14.0465C16.6851 14.0327 16.7795 13.9953 16.8611 13.9375C16.9428 13.8797 17.0094 13.8031 17.0553 13.7142C17.1012 13.6253 17.1251 13.5267 17.125 13.4267V1.55168C17.125 1.42244 17.0849 1.2964 17.0103 1.19088C16.9357 1.08537 16.8302 1.00559 16.7083 0.962509C15.8384 0.655475 14.9225 0.499066 14 0.500009C12.4494 0.497712 10.9307 0.941149 9.625 1.77751V15.1967Z"
                      fill="#16191E"
                    />
                  </svg>
                  Borrow Book Request
                </Button>
              </>
            ) : (
              <p>No featured book available.</p>
            )}
          </div>
          {isLoadingFeatured ? (
            <div className="animate-pulse">
              <div className="h-96 w-64 bg-gray-700 rounded"></div>
            </div>
          ) : (
            featuredBook && (
              <BookCover
                id={featuredBook.id}
                cover_url={featuredBook.cover_url}
                title={featuredBook.title}
              />
            )
          )}
        </section>

        <section className="text-white">
          <h2 className="text-3xl font-bold mb-8">Popular Books</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {isLoadingPopular ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col animate-pulse bg-gray-800 rounded-lg p-4 shadow-md"
                >
                  <div className="relative mb-4 h-60 bg-gray-700 rounded"></div>
                  <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="flex flex-wrap gap-2">
                    <div className="h-5 bg-gray-700 rounded-full w-16"></div>
                    <div className="h-5 bg-gray-700 rounded-full w-16"></div>
                  </div>
                </div>
              ))
            ) : popularBooks.length > 0 ? (
              popularBooks.map((book) => (
                <div
                  key={book.id}
                  className="flex flex-col rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="relative mb-4 h-60 group cursor-pointer">
                    <BookCover id={book.id} cover_url={book.cover_url} title={book.title} size="sm" />
                  </div>
                  <h3 className="text-lg font-semibold text-white truncate">{book.title}</h3>
                  <p className="text-sm text-gray-400 italic mb-2">
                    By {book.authors.join(', ')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {book.categories.map((category) => (
                      <span
                        key={category}
                        className="inline-block bg-gray-700 text-gray-200 text-xs font-medium px-2.5 py-1 rounded-full"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p>No popular books available.</p>
            )}
          </div>
        </section>
      </main>
    </BackgroundWrapper>
  );
};

export default Home;
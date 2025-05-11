import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Book, BookOpen, Calendar, Clock, ChevronRight, Shield, Mail, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import BookCover from '@/components/ui/BookCover';
import axios from 'axios';

import { Link } from 'react-router-dom';
import { BookmarkIcon, ThumbsUp } from 'lucide-react';

interface Rental {
  id: number;
  book_id: number;
  status: string;
  created_at: string;
  rented_at: string;
  returned_at: string | null;
  book: {
    id: number;
    title: string;
    cover_url: string;
    authors: string[];
  };
}

interface RentalRequest {
  id: number;
  book_id: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  book: {
    id: number;
    title: string;
    cover_url: string;
    authors: string[];
  };
}


interface UserStats {
  days_active: number;
  favorite_category: string | null;
  books_read: number;
  currently_reading: number;
  liked_articles_count: number;
  bookmarked_articles_count: number;
}

interface ProfileArticle {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string;
  category: string;
  summary: string;
  createdAt: string;
}

interface UserProfile {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    date_joined: string;
  };
  stats: UserStats;
  liked_articles: ProfileArticle[];
  bookmarked_articles: ProfileArticle[];
}


const UserProfilePage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const [activeRentals, setActiveRentals] = useState<Rental[]>([]);
  const [rentalHistory, setRentalHistory] = useState<Rental[]>([]);
  const [pendingRequests, setPendingRequests] = useState<RentalRequest[]>([]);
  const [isLoadingRentals, setIsLoadingRentals] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [activeTab, setActiveTab] = useState<'rentals' | 'history' | 'requests' | 'articles'>('rentals');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    fetchUserProfile();
    fetchUserRentals();
    fetchUserRequests();
  }, [isAuthenticated, isLoading, navigate]);


  const fetchUserProfile = async () => {
    try {
      setIsLoadingProfile(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');
      
      const response = await axios.get('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setUserProfile(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };


  const fetchUserRentals = async () => {
    try {
      setIsLoadingRentals(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');
      
      const response = await axios.get('/api/rentals/my_rentals?per_page=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Separate active and historical rentals
      const active: Rental[] = [];
      const history: Rental[] = [];
      
      response.data.rentals.forEach((rental: Rental) => {
        if (rental.returned_at) {
          history.push(rental);
        } else {
          active.push(rental);
        }
      });
      
      setActiveRentals(active);
      setRentalHistory(history);
    } catch (error) {
      console.error('Error fetching rentals:', error);
    } finally {
      setIsLoadingRentals(false);
    }
  };
  
  const fetchUserRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');
      
      const response = await axios.get('/api/rental_requests/my_requests?per_page=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Filter pending requests
      const pending = response.data.requests.filter(
        (req: RentalRequest) => req.status === 'pending'
      );
      
      setPendingRequests(pending);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setIsLoadingRequests(false);
    }
  };
  
  const formatDate = (dateString: string) => {
  if (!dateString) return 'Invalid date';

  const date = new Date(dateString);

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
};
  
  const calculateDaysLeft = (rentalDate: string) => {
    const rentedDate = new Date(rentalDate);
    const dueDate = new Date(rentedDate);
    dueDate.setDate(dueDate.getDate() + 14);
    
    const today = new Date();
    const timeLeft = dueDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
    
    return daysLeft;
  };
  
  const handleBookClick = (bookId: number) => {
    navigate(`/book/${bookId}`);
  };
  
  // Generate random reading stats for demo purposes
  const readingStats = {
    booksRead: userProfile?.stats.books_read || rentalHistory.length,
    currentlyReading: userProfile?.stats.currently_reading || activeRentals.length,
    daysActive: userProfile?.stats.days_active || 0,
    favCategory: userProfile?.stats.favorite_category || 'None yet',
  };
  
  if (isLoading) {
    return (
      <BackgroundWrapper>
        <div className="flex h-screen items-center justify-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-amber-400 rounded-full"></div>
        </div>
      </BackgroundWrapper>
    );
  }
  
  if (!user) {
    return (
      <BackgroundWrapper>
        <div className="flex h-screen items-center justify-center">
          <p className="text-white">You need to be logged in to view this page.</p>
        </div>
      </BackgroundWrapper>
    );
  }
  
  return (
    <BackgroundWrapper>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Profile Header */}
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 shadow-xl mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Avatar and User Info */}
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white text-4xl font-medium border-4 border-teal-400/30 shadow-lg mb-4">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">{user.name}</h2>
              <div className="flex items-center gap-2 text-gray-300 mb-4">
                <Mail className="h-4 w-4 text-amber-400" />
                {user.email}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-3 py-1 bg-amber-900/30 text-amber-300 rounded-full text-xs font-medium flex items-center">
                  <Shield className="h-3.5 w-3.5 mr-1" />
                  {user.role === 'admin' ? 'Administrator' : 'Reader'}
                </span>
                <span className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs font-medium flex items-center">
                  <BookOpen className="h-3.5 w-3.5 mr-1" />
                  Active Member
                </span>
              </div>
            </div>
            
            {/* User Stats */}
            <div className="flex-1 mt-4 md:mt-0">
              <h3 className="text-xl font-medium text-white mb-4 text-center md:text-left">Reading Activity</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="text-3xl font-bold text-amber-400 mb-1">{readingStats.booksRead}</div>
                  <div className="text-gray-400 text-sm">Books Read</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="text-3xl font-bold text-amber-400 mb-1">{readingStats.currentlyReading}</div>
                  <div className="text-gray-400 text-sm">Currently Reading</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="text-3xl font-bold text-amber-400 mb-1">{readingStats.daysActive}</div>
                  <div className="text-gray-400 text-sm">Days Active</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="text-lg font-bold text-amber-400 mb-1 truncate">{readingStats.favCategory}</div>
                  <div className="text-gray-400 text-sm">Favorite Category</div>
                </div>
              </div>
              
              {user.role === 'admin' && (
                <div className="mt-6">
                  <Button
                    onClick={() => navigate('/admin')}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Dashboard
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Tabs for Books and Requests */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl overflow-hidden">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('rentals')}
              className={`flex-1 py-3 px-4 text-center relative ${
                activeTab === 'rentals' 
                  ? 'text-white font-medium' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Currently Borrowed
              {activeTab === 'rentals' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-3 px-4 text-center relative ${
                activeTab === 'requests' 
                  ? 'text-white font-medium' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Pending Requests
              {pendingRequests.length > 0 && (
                <span className="absolute top-2 right-2 bg-amber-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
              {activeTab === 'requests' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 px-4 text-center relative ${
                activeTab === 'history' 
                  ? 'text-white font-medium' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Rental History
              {activeTab === 'history' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('articles')}
              className={`flex-1 py-3 px-4 text-center relative ${
                activeTab === 'articles' 
                  ? 'text-white font-medium' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Articles
              {((userProfile?.liked_articles?.length ?? 0) > 0 || (userProfile?.bookmarked_articles?.length ?? 0) > 0) && (
                <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {(userProfile?.liked_articles?.length || 0) + (userProfile?.bookmarked_articles?.length || 0)}
                </span>
              )}
              {activeTab === 'articles' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500"></div>
              )}
            </button>
          </div>
          
          <div className="p-6">
            {/* Active Rentals Tab */}
            {activeTab === 'rentals' && (
              <>
                {isLoadingRentals ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-b-2 border-amber-400 rounded-full"></div>
                  </div>
                ) : activeRentals.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeRentals.map((rental) => {
                      const daysLeft = calculateDaysLeft(rental.rented_at);
                      return (
                        <div 
                          key={rental.id}
                          className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden hover:border-amber-700/30 transition-all duration-300 hover:shadow-amber-900/10 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                          onClick={() => handleBookClick(rental.book.id)}
                        >
                          <div className="flex p-4">
                            <div className="w-16 h-24 flex-shrink-0 mr-4">
                              <BookCover
                                id={rental.book.id}
                                cover_url={rental.book.cover_url}
                                title={rental.book.title}
                                size="xs"
                                className="w-full h-full object-cover rounded-md shadow-md"
                              />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-white font-medium mb-1 line-clamp-2">{rental.book.title}</h4>
                              <p className="text-gray-400 text-sm mb-2 line-clamp-1">
                                {rental.book.authors.join(', ')}
                              </p>
                              <div className="flex items-center text-xs">
                                <Calendar className="h-3 w-3 text-amber-400 mr-1" />
                                <span className="text-gray-300">Borrowed on {formatDate(rental.rented_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className={`px-4 py-2 flex items-center justify-between border-t border-gray-700/70 ${
                            daysLeft < 3 ? 'bg-red-900/20' : daysLeft < 7 ? 'bg-amber-900/20' : 'bg-green-900/20'
                          }`}>
                            <div className="flex items-center text-xs">
                              <Clock className={`h-3 w-3 mr-1 ${
                                daysLeft < 3 ? 'text-red-400' : daysLeft < 7 ? 'text-amber-400' : 'text-green-400'
                              }`} />
                              <span className={
                                daysLeft < 3 ? 'text-red-300' : daysLeft < 7 ? 'text-amber-300' : 'text-green-300'
                              }>
                                {daysLeft <= 0
                                  ? 'Overdue'
                                  : daysLeft === 1
                                  ? '1 day left'
                                  : `${daysLeft} days left`}
                              </span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/50">
                    <Book className="h-12 w-12 text-gray-600 mx-auto mb-3" strokeWidth={1} />
                    <h3 className="text-xl font-medium text-white mb-2">No Active Rentals</h3>
                    <p className="text-gray-400 mb-4">You don't have any books checked out at the moment.</p>
                    <Button
                      onClick={() => navigate('/search')}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Browse Books
                    </Button>
                  </div>
                )}
              </>
            )}
            
            {/* Pending Requests Tab */}
            {activeTab === 'requests' && (
              <>
                {isLoadingRequests ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-b-2 border-amber-400 rounded-full"></div>
                  </div>
                ) : pendingRequests.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingRequests.map((request) => (
                      <div 
                        key={request.id}
                        className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden hover:border-amber-700/30 transition-all duration-300 hover:shadow-amber-900/10 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                        onClick={() => handleBookClick(request.book.id)}
                      >
                        <div className="flex p-4">
                          <div className="w-16 h-24 flex-shrink-0 mr-4">
                            <BookCover
                              id={request.book.id}
                              cover_url={request.book.cover_url}
                              title={request.book.title}
                              size="xs"
                              className="w-full h-full object-cover rounded-md shadow-md"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-medium mb-1 line-clamp-2">{request.book.title}</h4>
                            <p className="text-gray-400 text-sm mb-2 line-clamp-1">
                              {request.book.authors.join(', ')}
                            </p>
                            <div className="flex items-center text-xs">
                              <Calendar className="h-3 w-3 text-amber-400 mr-1" />
                              <span className="text-gray-300">Requested on {formatDate(request.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="px-4 py-2 flex items-center justify-between border-t border-gray-700/70 bg-yellow-900/20">
                          <div className="flex items-center text-xs">
                            <Clock className="h-3 w-3 mr-1 text-yellow-400" />
                            <span className="text-yellow-300">Pending approval</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/50">
                    <FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" strokeWidth={1} />
                    <h3 className="text-xl font-medium text-white mb-2">No Pending Requests</h3>
                    <p className="text-gray-400 mb-4">You don't have any pending book requests at the moment.</p>
                    <Button
                      onClick={() => navigate('/search')}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Browse Books
                    </Button>
                  </div>
                )}
              </>
            )}
            
            {/* Rental History Tab */}
            {activeTab === 'history' && (
              <>
                {isLoadingRentals ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-b-2 border-amber-400 rounded-full"></div>
                  </div>
                ) : rentalHistory.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rentalHistory.map((rental) => (
                      <div 
                        key={rental.id}
                        className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden hover:border-amber-700/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                        onClick={() => handleBookClick(rental.book.id)}
                      >
                        <div className="flex p-4">
                          <div className="w-16 h-24 flex-shrink-0 mr-4">
                            <BookCover
                              id={rental.book.id}
                              cover_url={rental.book.cover_url}
                              title={rental.book.title}
                              size="xs"
                              className="w-full h-full object-cover rounded-md shadow-md"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-medium mb-1 line-clamp-2">{rental.book.title}</h4>
                            <p className="text-gray-400 text-sm mb-2 line-clamp-1">
                              {rental.book.authors.join(', ')}
                            </p>
                            <div className="flex flex-col text-xs space-y-1">
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 text-amber-400 mr-1" />
                                <span className="text-gray-300">Borrowed on {formatDate(rental.rented_at)}</span>
                              </div>
                              {rental.returned_at && (
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 text-green-400 mr-1" />
                                  <span className="text-gray-300">Returned on {formatDate(rental.returned_at)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="px-4 py-2 flex items-center justify-between border-t border-gray-700/70 bg-blue-900/20">
                          <div className="flex items-center text-xs">
                            <CheckCircle className="h-3 w-3 mr-1 text-blue-400" />
                            <span className="text-blue-300">Completed</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/50">
                    <Book className="h-12 w-12 text-gray-600 mx-auto mb-3" strokeWidth={1} />
                    <h3 className="text-xl font-medium text-white mb-2">No Rental History</h3>
                    <p className="text-gray-400 mb-4">You haven't borrowed any books yet.</p>
                    <Button
                      onClick={() => navigate('/search')}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Browse Books
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Articles Tab */}
            {activeTab === 'articles' && (
              <>
                {isLoadingProfile ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-b-2 border-amber-400 rounded-full"></div>
                  </div>
                ) : (
                  <div>
                    {/* Liked Articles */}
                    <div className="mb-8">
                      <h3 className="text-xl font-medium text-white mb-4 flex items-center">
                        <ThumbsUp className="h-5 w-5 mr-2 text-amber-400" />
                        Liked Articles
                      </h3>
                      
                      {userProfile?.liked_articles && userProfile.liked_articles.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {userProfile.liked_articles.map(article => (
                            <Link 
                              key={article.id}
                              to={`/articles/${article.slug}`}
                              className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden hover:border-amber-700/30 transition-all duration-300 hover:shadow-amber-900/10 hover:shadow-lg hover:-translate-y-1"
                            >
                              <div className="h-40 w-full overflow-hidden">
                                <img 
                                  src={article.coverImageUrl || 'https://placehold.co/600x300'} 
                                  alt={article.title}
                                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                />
                              </div>
                              <div className="p-4">
                                <div className="text-xs font-medium text-amber-400 mb-2">{article.category}</div>
                                <h4 className="text-white font-medium mb-2 line-clamp-2">{article.title}</h4>
                                <p className="text-gray-400 text-sm line-clamp-3">{article.summary}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-gray-800/30 rounded-xl border border-gray-700/50">
                          <ThumbsUp className="h-10 w-10 text-gray-600 mx-auto mb-3" strokeWidth={1} />
                          <h3 className="text-lg font-medium text-white mb-2">No Liked Articles</h3>
                          <p className="text-gray-400 mb-4">You haven't liked any articles yet.</p>
                          <Button
                            onClick={() => navigate('/articles')}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            Browse Articles
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Bookmarked Articles */}
                    <div>
                      <h3 className="text-xl font-medium text-white mb-4 flex items-center">
                        <BookmarkIcon className="h-5 w-5 mr-2 text-amber-400" />
                        Bookmarked Articles
                      </h3>
                      
                      {userProfile?.bookmarked_articles && userProfile.bookmarked_articles.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {userProfile.bookmarked_articles.map(article => (
                            <Link 
                              key={article.id}
                              to={`/articles/${article.slug}`}
                              className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden hover:border-amber-700/30 transition-all duration-300 hover:shadow-amber-900/10 hover:shadow-lg hover:-translate-y-1"
                            >
                              <div className="h-40 w-full overflow-hidden">
                                <img 
                                  src={article.coverImageUrl || 'https://placehold.co/600x300'} 
                                  alt={article.title}
                                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                />
                              </div>
                              <div className="p-4">
                                <div className="text-xs font-medium text-amber-400 mb-2">{article.category}</div>
                                <h4 className="text-white font-medium mb-2 line-clamp-2">{article.title}</h4>
                                <p className="text-gray-400 text-sm line-clamp-3">{article.summary}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-gray-800/30 rounded-xl border border-gray-700/50">
                          <BookmarkIcon className="h-10 w-10 text-gray-600 mx-auto mb-3" strokeWidth={1} />
                          <h3 className="text-lg font-medium text-white mb-2">No Bookmarked Articles</h3>
                          <p className="text-gray-400 mb-4">You haven't bookmarked any articles yet.</p>
                          <Button
                            onClick={() => navigate('/articles')}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            Browse Articles
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </BackgroundWrapper>
  );
};

export default UserProfilePage;
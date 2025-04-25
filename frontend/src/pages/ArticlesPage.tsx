import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Search, BookOpen, Clock, Filter, X, Tag, Bookmark, Eye, Heart, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { useLocation } from 'react-router-dom';

// Define interfaces based on the updated Article model
interface Article {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string;
  category: string;
  author: {
    name: string;
    avatarUrl?: string;
  };
  summary: string;
  pdfUrl: string; // Replaced content with pdfUrl
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}

interface ArticleMeta {
  readTime: number;
  views: number;
  likes: number;
  bookmarks: number;
}

// Combined type for article with meta
interface ArticleWithMeta extends Article {
  meta: ArticleMeta;
}

interface ArticlesResponse {
  articles: ArticleWithMeta[];
  total_count: number;
  total_pages: number;
}

const ArticlesPage: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTag = queryParams.get('tag') || '';

  const [articles, setArticles] = useState<ArticleWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>(initialTag);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const perPage = 9;
  const [likedArticles, setLikedArticles] = useState<Set<string>>(new Set());
  const [bookmarkedArticles, setBookmarkedArticles] = useState<Set<string>>(new Set());

  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  // Fetch articles with filters and pagination
  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchArticles = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No token found');
        }

        const params: any = {
          page: currentPage,
          per_page: perPage,
        };
        if (searchQuery) params.search = searchQuery;
        if (selectedCategory) params.category = selectedCategory;
        if (selectedTag) params.tag = selectedTag;

        const response = await axios.get<ArticlesResponse>('/api/articles', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params,
        });

        const { articles: articlesData, total_count, total_pages } = response.data;
        setArticles(articlesData);
        setTotalCount(total_count);
        setTotalPages(total_pages);

        // Fetch user's liked and bookmarked articles
        try {
          const [likesResponse, bookmarksResponse] = await Promise.all([
            axios.get('/api/user/likes', {
              headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get('/api/user/bookmarks', {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);
          setLikedArticles(new Set(likesResponse.data.likedArticleIds));
          setBookmarkedArticles(new Set(bookmarksResponse.data.bookmarkedArticleIds));
        } catch (error) {
          console.error('Error fetching user likes/bookmarks:', error);
        }

        // Extract unique categories and tags for filter options
        const uniqueCategories = [...new Set(articlesData.map(article => article.category))];
        const uniqueTags = [...new Set(articlesData.flatMap(article => article.tags))];
        setCategories(uniqueCategories);
        setAllTags(uniqueTags);
        setError(null);
      } catch (error: any) {
        console.error('Error fetching articles:', error.response?.data || error.message);
        setError('Failed to load articles. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticles();
  }, [isAuthenticated, isAuthLoading, navigate, currentPage, searchQuery, selectedCategory, selectedTag, initialTag]);

  useEffect(() => {
    setSelectedTag(initialTag);
  }, [initialTag]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category === selectedCategory ? '' : category);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleTagChange = (tag: string) => {
    setSelectedTag(tag === selectedTag ? '' : tag);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedTag('');
    setSearchQuery('');
    setCurrentPage(1); // Reset to first page
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const navigateToArticle = (slug: string) => {
    navigate(`/articles/${slug}`);
  };

  const handleLikeToggle = async (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigating to article
    try {
      const token = localStorage.getItem('token');
      const isLiked = likedArticles.has(articleId);
      await axios.post(
        `/api/articles/${articleId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Show toast notification
      toast.success(isLiked ? 'Article unliked' : 'Article liked', {
        position: 'bottom-center',
        autoClose: 3000,
      });

      setArticles((prev) =>
        prev.map((article) =>
          article.id === articleId
            ? {
                ...article,
                meta: {
                  ...article.meta,
                  likes: isLiked ? article.meta.likes - 1 : article.meta.likes + 1,
                },
              }
            : article
        )
      );
      setLikedArticles((prev) => {
        const newSet = new Set(prev);
        isLiked ? newSet.delete(articleId) : newSet.add(articleId);
        return newSet;
      });
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleBookmarkToggle = async (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigating to article
    try {
      const token = localStorage.getItem('token');
      const isBookmarked = bookmarkedArticles.has(articleId);
      await axios.post(
        `/api/articles/${articleId}/bookmark`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Show toast notification
      toast.success(isBookmarked ? 'Bookmark removed' : 'Article bookmarked', {
        position: 'bottom-center',
        autoClose: 3000,
      });

      setArticles((prev) =>
        prev.map((article) =>
          article.id === articleId
            ? {
                ...article,
                meta: {
                  ...article.meta,
                  bookmarks: isBookmarked ? article.meta.bookmarks - 1 : article.meta.bookmarks + 1,
                },
              }
            : article
        )
      );
      setBookmarkedArticles((prev) => {
        const newSet = new Set(prev);
        isBookmarked ? newSet.delete(articleId) : newSet.add(articleId);
        return newSet;
      });
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Pagination helpers
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const maxPagesToShow = 5;
    const pages: (number | -1)[] = [];
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (startPage > 1) {
      pages.unshift(-1); // Ellipsis
      pages.unshift(1);
    }
    if (endPage < totalPages) {
      pages.push(-1); // Ellipsis
      pages.push(totalPages);
    }

    return pages;
  };

  // Placeholder shimmer loading animation components
  const ArticleSkeleton = () => (
    <div className="flex flex-col animate-pulse rounded-xl overflow-hidden bg-gray-800/60 shadow-lg">
      <div className="w-full h-48 bg-gray-700"></div>
      <div className="p-6 space-y-4">
        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
        <div className="h-8 bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-700 rounded w-5/6"></div>
        <div className="flex space-x-2">
          <div className="h-8 w-8 rounded-full bg-gray-700"></div>
          <div className="h-8 bg-gray-700 rounded w-1/3"></div>
        </div>
      </div>
    </div>
  );

  return (
    <BackgroundWrapper>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen py-16 px-4 sm:px-6 lg:px-16"
      >
        {/* Header Section */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 max-w-4xl mx-auto"
        >
          <div className="inline-block px-4 py-1 rounded-full bg-amber-500/20 text-amber-300 text-sm font-medium mb-4">
            Library Articles
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-amber-300 bg-clip-text text-transparent">
            Discover Insightful Articles
          </h1>
          <p className="text-lg text-gray-300">
            Expand your knowledge with our curated collection of articles on literature, research, and academic topics
          </p>
        </motion.div>

        {/* Search and Filter Bar */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-4xl mx-auto mb-12"
        >
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full bg-gray-800/70 backdrop-blur-md rounded-xl border border-gray-700 py-4 pl-12 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent shadow-lg"
                placeholder="Search articles by title, summary, or author..."
              />
            </div>
            <button 
              onClick={toggleFilters}
              className="flex items-center justify-center h-12 w-12 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors duration-200 border border-gray-700 shadow-lg"
              aria-label="Filter articles"
            >
              <Filter className="h-5 w-5 text-amber-500" />
            </button>
          </div>
        </motion.div>

        {/* Filter Panel (Slide in from right) */}
        <motion.div
          className={`fixed top-0 right-0 h-full w-80 bg-gray-900 shadow-2xl z-50 border-l border-gray-800 p-6 overflow-y-auto transform ${showFilters ? 'translate-x-0' : 'translate-x-full'}`}
          initial={false}
          animate={{ x: showFilters ? 0 : '100%' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-white">Filters</h3>
            <button 
              onClick={toggleFilters}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Categories */}
          <div className="mb-8">
            <h4 className="text-md font-semibold text-white mb-4 flex items-center">
              <BookOpen className="h-4 w-4 mr-2 text-amber-500" />
              Categories
            </h4>
            <div className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`block w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 ${
                    selectedCategory === category 
                      ? 'bg-amber-500/20 text-amber-400' 
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="mb-8">
            <h4 className="text-md font-semibold text-white mb-4 flex items-center">
              <Tag className="h-4 w-4 mr-2 text-amber-500" />
              Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagChange(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors duration-200 ${
                    selectedTag === tag
                      ? 'bg-amber-500 text-gray-900'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={clearFilters}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
          >
            Clear All Filters
          </button>
        </motion.div>

        {/* Overlay when filter panel is open */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black z-40"
            onClick={toggleFilters}
          />
        )}

        {/* Current Filters Display */}
        {(selectedCategory || selectedTag) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-2 max-w-4xl mx-auto mb-6"
          >
            <span className="text-gray-400 text-sm">Active filters:</span>
            
            {selectedCategory && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-sm">
                {selectedCategory}
                <button 
                  onClick={() => setSelectedCategory('')}
                  className="ml-2 text-amber-300 hover:text-amber-100"
                >
                  <X size={14} />
                </button>
              </span>
            )}
            
            {selectedTag && (
              <span 
                className="inline-flex items-center px-3 py-1 rounded-full bg-gray-800 text-gray-200 text-sm"
              >
                {selectedTag}
                <button 
                  onClick={() => setSelectedTag('')}
                  className="ml-2 text-gray-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </span>
            )}
            
            <button 
              onClick={clearFilters}
              className="text-amber-400 text-sm hover:text-amber-300 ml-2"
            >
              Clear all
            </button>
          </motion.div>
        )}

        {/* Results info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="max-w-4xl mx-auto mb-6 flex justify-between items-center"
        >
          <h2 className="text-xl font-semibold text-white">
            {isLoading ? 'Loading articles...' : `${totalCount} Articles found`}
          </h2>
        </motion.div>

        {/* Articles Grid */}
        <motion.div 
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          initial="hidden"
          animate="show"
          className="max-w-7xl mx-auto"
        >
          {error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="mb-4 text-amber-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Error Loading Articles</h3>
              <p className="text-gray-400">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-amber-500 text-gray-900 rounded-lg hover:bg-amber-600 transition-colors duration-200"
              >
                Retry
              </button>
            </motion.div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, index) => (
                <ArticleSkeleton key={index} />
              ))}
            </div>
          ) : articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article) => (
                <motion.article 
                  key={article.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  className="flex flex-col rounded-xl overflow-hidden bg-gray-800/60 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
                  onClick={() => navigateToArticle(article.slug)}
                >
                  {/* Article cover image */}
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={article.coverImageUrl} 
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 to-transparent">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-500/90 text-gray-900">
                          {article.category}
                        </span>
                        <span className="flex items-center text-gray-300 text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {article.meta.readTime} min read
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Article content */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{article.title}</h3>
                    <p className="text-gray-300 text-sm mb-4 line-clamp-3">{article.summary}</p>
                    
                    {/* Article meta */}
                    <div className="mt-auto">
                      <div className="flex items-center gap-4 mb-4">
                        <button
                          onClick={(e) => handleLikeToggle(article.id, e)}
                          className={`flex items-center text-xs transition-colors ${
                            likedArticles.has(article.id)
                              ? 'text-red-500 hover:text-red-400'
                              : 'text-gray-400 hover:text-red-500'
                          }`}
                          aria-label={likedArticles.has(article.id) ? 'Unlike article' : 'Like article'}
                        >
                          <Heart
                            className="h-3 w-3 mr-1"
                            fill={likedArticles.has(article.id) ? 'currentColor' : 'none'}
                          />
                          {article.meta.likes}
                        </button>
                        <button
                          onClick={(e) => handleBookmarkToggle(article.id, e)}
                          className={`flex items-center text-xs transition-colors ${
                            bookmarkedArticles.has(article.id)
                              ? 'text-amber-500 hover:text-amber-400'
                              : 'text-gray-400 hover:text-amber-500'
                          }`}
                          aria-label={bookmarkedArticles.has(article.id) ? 'Remove bookmark' : 'Bookmark article'}
                        >
                          <Bookmark
                            className="h-3 w-3 mr-1"
                            fill={bookmarkedArticles.has(article.id) ? 'currentColor' : 'none'}
                          />
                          {article.meta.bookmarks}
                        </button>
                        <div className="flex items-center text-xs text-gray-400">
                          <Eye className="h-3 w-3 mr-1 text-gray-500" />
                          {article.meta.views}
                        </div>
                      </div>
                      
                      {/* Author and date */}
                      <div className="flex items-center">
                        {article.author.avatarUrl ? (
                          <img 
                            src={article.author.avatarUrl} 
                            alt={article.author.name}
                            className="h-8 w-8 rounded-full object-cover mr-3 border border-gray-700"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-amber-500 text-gray-900 flex items-center justify-center mr-3 text-sm font-medium">
                            {article.author.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-white">{article.author.name}</p>
                          <p className="text-xs text-gray-400">{formatDate(article.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-2xl font-medium text-white mb-2">No Articles Found</h3>
              <p className="text-gray-400 max-w-md mx-auto mb-6">
                We couldn't find any articles matching your search criteria. Try adjusting your filters or search terms.
              </p>
              <button 
                onClick={clearFilters}
                className="px-4 py-2 bg-amber-500 text-gray-900 rounded-lg hover:bg-amber-600 transition-colors duration-200"
              >
                Clear Filters
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Enhanced Pagination */}
        {articles.length > 0 && totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="max-w-4xl mx-auto mt-12"
          >
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
                      <span key={`ellipsis-${page}-${index}`} className="px-2 text-gray-500">...</span>
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
          </motion.div>
        )}
      </motion.div>
    </BackgroundWrapper>
  );
};

export default ArticlesPage;
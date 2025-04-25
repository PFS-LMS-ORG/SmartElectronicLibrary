import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, Clock, Eye, Heart, Bookmark, Share2, Facebook, Twitter, Linkedin, 
    ChevronUp, Tag, Calendar, Copy, Mail, ArrowRight, Sparkles, AlertCircle, X
} from 'lucide-react';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

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
    pdfUrl: string;
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

interface RelatedArticle {
    id: string;
    title: string;
    slug: string;
    coverImageUrl: string;
    category: string;
    summary: string;
    createdAt: string;
}

const ArticleDetailsPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [article, setArticle] = useState<ArticleWithMeta | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showShareOptions, setShowShareOptions] = useState<boolean>(false);
    const [isLiked, setIsLiked] = useState<boolean>(false);
    const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
    const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
    const [readingProgress, setReadingProgress] = useState<number>(0);
    const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
    const [copySuccess, setCopySuccess] = useState<boolean>(false);
    const [copyCompleteTimeout, setCopyCompleteTimeout] = useState<NodeJS.Timeout | null>(null);

    const articleContainerRef = useRef<HTMLDivElement>(null);
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const navigate = useNavigate();

    // Check scroll position for showing scroll-to-top button and calculate reading progress
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 500);

            if (articleContainerRef.current) {
                const totalHeight = articleContainerRef.current.clientHeight - window.innerHeight;
                const currentProgress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
                setReadingProgress(currentProgress);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close share options when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (showShareOptions && target && !target.closest('[data-share-container]')) {
                setShowShareOptions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showShareOptions]);

    // Fetch article data
    useEffect(() => {
        if (isAuthLoading) return;

        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        const fetchArticle = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('No token found');
                }

                if (!slug) {
                    throw new Error('Article slug is missing');
                }

                const response = await axios.get(`/api/articles/${slug}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                setArticle(response.data);

                // Fetch user's like and bookmark status for this article
                try {
                    const [likesResponse, bookmarksResponse] = await Promise.all([
                        axios.get('/api/user/likes', {
                            headers: { Authorization: `Bearer ${token}` },
                        }),
                        axios.get('/api/user/bookmarks', {
                            headers: { Authorization: `Bearer ${token}` },
                        }),
                    ]);
                    setIsLiked(likesResponse.data.likedArticleIds.includes(response.data.id));
                    setIsBookmarked(bookmarksResponse.data.bookmarkedArticleIds.includes(response.data.id));
                } catch (error) {
                    console.error('Error fetching user likes/bookmarks:', error);
                }

                setError(null);

                // Set document title
                document.title = `${response.data.title} | LMSENSA+ Articles`;

                // Fetch related articles
                try {
                    const relatedResponse = await axios.get(`/api/articles/related/${response.data.id}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        params: {
                            limit: 3,
                            tags: response.data.tags.join(','),
                            category: response.data.category,
                        },
                    });
                    setRelatedArticles(relatedResponse.data.relatedArticles);
                } catch (relatedError) {
                    console.error('Error fetching related articles:', relatedError);
                    setRelatedArticles([]);
                }
            } catch (error: any) {
                console.error('Error fetching article:', error.response?.data || error.message);
                setError(error.response?.status === 404 
                    ? 'Article not found' 
                    : 'Failed to load the article. Please try again later.');
                setArticle(null);
                setRelatedArticles([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchArticle();
    }, [slug, isAuthenticated, isAuthLoading, navigate]);

    const handleBack = () => {
        navigate('/articles');
    };

    const handleLikeToggle = async () => {
        if (!article) return;

        const wasLiked = isLiked;
        const newLikes = wasLiked ? article.meta.likes - 1 : article.meta.likes + 1;

        try {
            setIsLiked(!wasLiked);
            setArticle((prev) =>
                prev ? { ...prev, meta: { ...prev.meta, likes: newLikes } } : prev
            );

            const token = localStorage.getItem('token');
            await axios.post(`/api/articles/${article.id}/like`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            toast.success(wasLiked ? 'Article unliked' : 'Article liked', {
                position: 'bottom-center',
                autoClose: 3000,
            });
        } catch (error) {
            console.error('Error toggling like:', error);
            setIsLiked(wasLiked); // Revert on failure
            setArticle((prev) =>
                prev ? { ...prev, meta: { ...prev.meta, likes: article.meta.likes } } : prev
            );
        }
    };

    const handleBookmarkToggle = async () => {
        if (!article) return;

        const wasBookmarked = isBookmarked;
        const newBookmarks = wasBookmarked ? article.meta.bookmarks - 1 : article.meta.bookmarks + 1;

        try {
            setIsBookmarked(!wasBookmarked);
            setArticle((prev) =>
                prev ? { ...prev, meta: { ...prev.meta, bookmarks: newBookmarks } } : prev
            );

            const token = localStorage.getItem('token');
            await axios.post(`/api/articles/${article.id}/bookmark`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            toast.success(wasBookmarked ? 'Bookmark removed' : 'Article bookmarked', {
                position: 'bottom-center',
                autoClose: 3000,
            });
        } catch (error) {
            console.error('Error toggling bookmark:', error);
            setIsBookmarked(wasBookmarked); // Revert on failure
            setArticle((prev) =>
                prev ? { ...prev, meta: { ...prev.meta, bookmarks: article.meta.bookmarks } } : prev
            );
        }
    };

    const handleShareToggle = () => {
        setShowShareOptions(!showShareOptions);
    };

    const handleShare = (platform: string) => {
        const url = window.location.href;
        const title = article?.title || 'LMSENSA+ Article';

        let shareUrl = '';

        switch (platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
                break;
            case 'email':
                shareUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check out this article: ${url}`)}`;
                break;
            case 'copy':
                navigator.clipboard.writeText(url).then(() => {
                    setCopySuccess(true);

                    if (copyCompleteTimeout) {
                        clearTimeout(copyCompleteTimeout);
                    }

                    const timeout = setTimeout(() => {
                        setCopySuccess(false);
                    }, 2000);

                    setCopyCompleteTimeout(timeout);
                });
                setShowShareOptions(false);
                return;
            default:
                return;
        }

        window.open(shareUrl, '_blank', 'width=600,height=400');
        setShowShareOptions(false);
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Function to format date
    const formatDate = (dateString: string) => {
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    // Handle PDF download
    const handleDownloadPDF = () => {
        if (article?.pdfUrl) {
            const link = document.createElement('a');
            link.href = article.pdfUrl;
            link.download = `${article.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast.success('Downloading PDF...', {
                position: 'bottom-center',
                autoClose: 3000,
            });
        }
    };

    // Loading skeleton
    if (isLoading) {
        return (
            <BackgroundWrapper>
                <div className="max-w-6xl mx-auto px-4 py-16">
                    <div className="animate-pulse space-y-8">
                        <div className="h-8 w-32 bg-gray-700 rounded-xl"></div>
                        <div className="h-12 bg-gray-700 rounded-xl w-3/4"></div>
                        <div className="h-96 bg-gray-700 rounded-xl w-full"></div>
                        <div className="flex space-x-4">
                            <div className="h-12 w-12 bg-gray-700 rounded-full"></div>
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-700 rounded-xl w-32"></div>
                                <div className="h-4 bg-gray-700 rounded-xl w-24"></div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="h-4 bg-gray-700 rounded-xl w-full"></div>
                            <div className="h-4 bg-gray-700 rounded-xl w-full"></div>
                            <div className="h-4 bg-gray-700 rounded-xl w-3/4"></div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="w-full md:w-2/3 space-y-4">
                                <div className="h-5 bg-gray-700 rounded-xl w-1/2"></div>
                                <div className="h-96 bg-gray-700 rounded-xl w-full"></div>
                                <div className="h-5 bg-gray-700 rounded-xl w-3/4"></div>
                                <div className="h-20 bg-gray-700 rounded-xl w-full"></div>
                            </div>
                            <div className="w-full md:w-1/3 space-y-4">
                                <div className="h-6 bg-gray-700 rounded-xl w-1/2"></div>
                                <div className="h-48 bg-gray-700 rounded-xl w-full"></div>
                                <div className="h-6 bg-gray-700 rounded-xl w-1/3"></div>
                                <div className="h-48 bg-gray-700 rounded-xl w-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </BackgroundWrapper>
        );
    }

    // Error state
    if (error) {
        return (
            <BackgroundWrapper>
                <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                    <div className="mb-6">
                        {error === 'Article not found' ? (
                            <svg className="h-20 w-20 mx-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
                            </svg>
                        ) : (
                            <AlertCircle className="h-20 w-20 mx-auto text-gray-500" />
                        )}
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">{error}</h2>
                    <p className="text-gray-300 mb-8 max-w-lg mx-auto">
                        {error === 'Article not found' 
                            ? "The article you're looking for doesn't exist or has been removed." 
                            : "We're having trouble loading this article. Please try again later."
                        }
                    </p>
                    <button 
                        onClick={handleBack}
                        className="px-6 py-3 flex items-center mx-auto bg-amber-500 text-gray-900 rounded-xl hover:bg-amber-600 transition-all duration-200 font-medium shadow-lg hover:shadow-amber-500/30"
                    >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Back to Articles
                    </button>
                </div>
            </BackgroundWrapper>
        );
    }

    if (!article) {
        return null;
    }

    return (
        <BackgroundWrapper>
            {/* Reading progress bar */}
            <div className="fixed top-0 left-0 w-full h-1 bg-gray-900 z-50">
                <motion.div 
                    className="h-full bg-amber-500"
                    style={{ width: `${readingProgress}%` }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${readingProgress}%` }}
                    transition={{ duration: 0.1 }}
                />
            </div>

            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="min-h-screen pb-20"
                ref={articleContainerRef}
            >
              
                
                {/* Hero Section */}
                {/* Hero Section */}
                <div className="bg-gray-900 w-full h-auto py-12 md:py-16">
                    <div className="max-w-4xl mx-auto p-6 md:p-8">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <button 
                                onClick={handleBack}
                                className="inline-flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white mb-6 rounded-xl transition-all duration-200 font-medium"
                            >
                                <ArrowLeft className="mr-2 h-5 w-5" />
                                Back to Articles
                            </button>
                            <div className="flex flex-wrap items-center gap-3 mb-6">
                                <span className="px-4 py-1.5 bg-amber-500 text-gray-900 text-xs font-medium rounded-full shadow-md">
                                    {article.category}
                                </span>
                                <span className="flex items-center text-gray-200 text-sm px-3 py-1.5 rounded-full bg-gray-800">
                                    <Clock className="h-4 w-4 mr-1.5" />
                                    {article.meta.readTime} min
                                </span>
                                <span className="flex items-center text-gray-200 text-sm px-3 py-1.5 rounded-full bg-gray-800">
                                    <Eye className="h-4 w-4 mr-1.5" />
                                    {article.meta.views} views
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                                {article.title}
                            </h1>
                            <p className="text-base md:text-lg text-gray-300 mb-6 max-w-2xl leading-snug">
                                {article.summary}
                            </p>
                        </motion.div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-16 relative z-20">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="relative"
                    >
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Sidebar (desktop) */}
                            <div className="hidden md:block w-64 shrink-0 sticky top-24">
                                <div className="bg-gray-900 rounded-xl p-6 shadow-lg border border-gray-800">
                                    <h4 className="text-white font-semibold mb-4 text-lg">Actions</h4>
                                    <div className="flex flex-col gap-3">
                                        <button 
                                            onClick={handleLikeToggle}
                                            className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                                                isLiked 
                                                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                                                    : 'text-gray-200 hover:bg-gray-800'
                                            }`}
                                            aria-label={isLiked ? "Unlike article" : "Like article"}
                                        >
                                            <Heart className="h-5 w-5 mr-2" fill={isLiked ? "currentColor" : "none"} />
                                            <span>{isLiked ? "Liked" : "Like"}</span>
                                            <span className="ml-auto">{article.meta.likes + (isLiked ? 1 : 0)}</span>
                                        </button>
                                        <button 
                                            onClick={handleBookmarkToggle}
                                            className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                                                isBookmarked 
                                                    ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' 
                                                    : 'text-gray-200 hover:bg-gray-800'
                                            }`}
                                            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark article"}
                                        >
                                            <Bookmark className="h-5 w-5 mr-2" fill={isBookmarked ? "currentColor" : "none"} />
                                            <span>{isBookmarked ? "Bookmarked" : "Bookmark"}</span>
                                            <span className="ml-auto">{article.meta.bookmarks + (isBookmarked ? 1 : 0)}</span>
                                        </button>
                                        <button 
                                            onClick={handleDownloadPDF}
                                            className="flex items-center px-4 py-2 rounded-xl text-gray-200 hover:bg-gray-800 text-sm font-medium transition-all duration-200"
                                            aria-label="Download PDF"
                                        >
                                            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            <span>Download PDF</span>
                                        </button>
                                        <div className="relative" data-share-container>
                                            <button 
                                                onClick={handleShareToggle}
                                                className="flex items-center px-4 py-2 rounded-xl text-gray-200 hover:bg-gray-800 text-sm font-medium transition-all duration-200 w-full"
                                                aria-label="Share article"
                                            >
                                                <Share2 className="h-5 w-5 mr-2" />
                                                <span>Share</span>
                                                <span className="ml-auto">
                                                    {showShareOptions ? (
                                                        <X className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronUp className="h-4 w-4 -rotate-90" />
                                                    )}
                                                </span>
                                            </button>
                                            <AnimatePresence>
                                                {showShareOptions && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        transition={{ type: 'spring', damping: 20 }}
                                                        className="absolute top-0 right-0 mt-12 w-48 bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-2 z-10"
                                                    >
                                                        <button 
                                                            onClick={() => handleShare('facebook')}
                                                            className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-800 rounded-lg flex items-center text-sm"
                                                        >
                                                            <Facebook className="h-4 w-4 mr-2 text-blue-500" />
                                                            Facebook
                                                        </button>
                                                        <button 
                                                            onClick={() => handleShare('twitter')}
                                                            className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-800 rounded-lg flex items-center text-sm"
                                                        >
                                                            <Twitter className="h-4 w-4 mr-2 text-blue-400" />
                                                            Twitter
                                                        </button>
                                                        <button 
                                                            onClick={() => handleShare('linkedin')}
                                                            className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-800 rounded-lg flex items-center text-sm"
                                                        >
                                                            <Linkedin className="h-4 w-4 mr-2 text-blue-600" />
                                                            LinkedIn
                                                        </button>
                                                        <button 
                                                            onClick={() => handleShare('email')}
                                                            className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-800 rounded-lg flex items-center text-sm"
                                                        >
                                                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                                                            Email
                                                        </button>
                                                        <button 
                                                            onClick={() => handleShare('copy')}
                                                            className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-800 rounded-lg flex items-center text-sm"
                                                        >
                                                            <Copy className="h-4 w-4 mr-2 text-gray-400" />
                                                            Copy Link
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Main article content */}
                            <div className="w-full">
                                <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800">
                                    {/* Author info and meta */}
                                    <div className="flex flex-col md:flex-row md:items-center justify-between p-6 border-b border-gray-800">
                                        <div className="flex items-center mb-4 md:mb-0">
                                            {article.author.avatarUrl ? (
                                                <img 
                                                    src={article.author.avatarUrl} 
                                                    alt={article.author.name}
                                                    className="h-12 w-12 rounded-full object-cover mr-4 border-2 border-amber-500"
                                                />
                                            ) : (
                                                <div className="h-12 w-12 rounded-full bg-amber-500 text-gray-900 flex items-center justify-center mr-4 text-xl font-bold">
                                                    {article.author.name.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="text-lg font-semibold text-white">{article.author.name}</h3>
                                                <div className="flex items-center text-gray-300 text-sm">
                                                    <Calendar className="h-4 w-4 mr-1.5" />
                                                    {formatDate(article.createdAt)}
                                                    {article.updatedAt && article.updatedAt !== article.createdAt && (
                                                        <span className="ml-2 text-gray-400 text-xs">(Updated: {formatDate(article.updatedAt)})</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Mobile actions */}
                                        <div className="flex items-center gap-4 md:hidden">
                                            <button 
                                                onClick={handleLikeToggle}
                                                className={`p-2 rounded-full ${isLiked ? 'text-red-500' : 'text-gray-300 hover:text-red-500'} transition-all duration-200`}
                                                aria-label={isLiked ? "Unlike article" : "Like article"}
                                            >
                                                <Heart className="h-6 w-6" fill={isLiked ? "currentColor" : "none"} />
                                            </button>
                                            <button 
                                                onClick={handleBookmarkToggle}
                                                className={`p-2 rounded-full ${isBookmarked ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'} transition-all duration-200`}
                                                aria-label={isBookmarked ? "Remove bookmark" : "Bookmark article"}
                                            >
                                                <Bookmark className="h-6 w-6" fill={isBookmarked ? "currentColor" : "none"} />
                                            </button>
                                            <button 
                                                onClick={handleDownloadPDF}
                                                className="p-2 rounded-full text-gray-300 hover:text-amber-500 transition-all duration-200"
                                                aria-label="Download PDF"
                                            >
                                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                            </button>
                                            <div className="relative" data-share-container>
                                                <button 
                                                    onClick={handleShareToggle}
                                                    className="p-2 rounded-full text-gray-300 hover:text-amber-500 transition-all duration-200"
                                                    aria-label="Share article"
                                                >
                                                    <Share2 className="h-6 w-6" />
                                                </button>
                                                <AnimatePresence>
                                                    {showShareOptions && (
                                                        <motion.div 
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 10 }}
                                                            transition={{ type: 'spring', damping: 20 }}
                                                            className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-2 z-10"
                                                        >
                                                            <button 
                                                                onClick={() => handleShare('facebook')}
                                                                className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-800 rounded-lg flex items-center text-sm"
                                                            >
                                                                <Facebook className="h-4 w-4 mr-2 text-blue-500" />
                                                                Facebook
                                                            </button>
                                                            <button 
                                                                onClick={() => handleShare('twitter')}
                                                                className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-800 rounded-lg flex items-center text-sm"
                                                            >
                                                                <Twitter className="h-4 w-4 mr-2 text-blue-400" />
                                                                Twitter
                                                            </button>
                                                            <button 
                                                                onClick={() => handleShare('linkedin')}
                                                                className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-800 rounded-lg flex items-center text-sm"
                                                            >
                                                                <Linkedin className="h-4 w-4 mr-2 text-blue-600" />
                                                                LinkedIn
                                                            </button>
                                                            <button 
                                                                onClick={() => handleShare('email')}
                                                                className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-800 rounded-lg flex items-center text-sm"
                                                            >
                                                                <Mail className="h-4 w-4 mr-2 text-gray-400" />
                                                                Email
                                                            </button>
                                                            <button 
                                                                onClick={() => handleShare('copy')}
                                                                className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-800 rounded-lg flex items-center text-sm"
                                                            >
                                                                <Copy className="h-4 w-4 mr-2 text-gray-400" />
                                                                Copy Link
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* PDF viewer */}
                                    <div className="p-6">
                                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                                            <iframe
                                                src={article.pdfUrl}
                                                title={article.title}
                                                className="w-full h-[1000px] md:h-[1200px] border-none"
                                                onError={() => setError('Failed to load PDF. Please try again later.')}
                                            />
                                        </div>
                                    </div>

                                    {/* Tags and mobile actions */}
                                    <div className="p-6 border-t border-gray-800">
                                        {article.tags.length > 0 && (
                                            <div className="mb-6">
                                                <h4 className="text-white font-semibold mb-4 flex items-center text-lg">
                                                    <Tag className="h-5 w-5 mr-2 text-amber-500" />
                                                    Tags
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {article.tags.map(tag => (
                                                        <span 
                                                            key={tag}
                                                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer"
                                                            onClick={() => navigate(`/articles?tag=${tag}`)}
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Mobile-only action bar */}
                                        <div className="md:hidden flex justify-between items-center pt-4 border-t border-gray-800">
                                            <div className="flex items-center gap-3 text-sm text-gray-300">
                                                <span>{article.meta.views} views</span>
                                                <span className="text-gray-500">•</span>
                                                <span>{article.meta.likes + (isLiked ? 1 : 0)} likes</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Related articles */}
                                {relatedArticles.length > 0 && (
                                    <div className="mt-12">
                                        <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                                            <Sparkles className="h-5 w-5 mr-2 text-amber-500" />
                                            Related Articles
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {relatedArticles.map(related => (
                                                <motion.div
                                                    key={related.id}
                                                    whileHover={{ y: -5 }}
                                                    transition={{ type: 'spring', stiffness: 300 }}
                                                    className="group"
                                                >
                                                    <Link to={`/articles/${related.slug}`} className="block rounded-xl bg-gray-900 border border-gray-800 shadow-lg hover:shadow-amber-500/20 transition-all duration-200">
                                                        <div className="relative h-48 overflow-hidden rounded-t-xl">
                                                            <img 
                                                                src={related.coverImageUrl}
                                                                alt={related.title}
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                            />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent"></div>
                                                            <span className="absolute bottom-3 left-3 px-2 py-1 bg-amber-500 text-gray-900 text-xs font-medium rounded-full">
                                                                {related.category}
                                                            </span>
                                                        </div>
                                                        <div className="p-4">
                                                            <h4 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-amber-400 transition-colors duration-200">
                                                                {related.title}
                                                            </h4>
                                                            <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                                                                {related.summary}
                                                            </p>
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-gray-400">
                                                                    {formatDate(related.createdAt)}
                                                                </span>
                                                                <span className="text-amber-500 font-medium flex items-center group-hover:translate-x-1 transition-transform">
                                                                    Read more 
                                                                    <ArrowRight className="ml-1 h-4 w-4" />
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
                
                {/* Copy link notification */}
                <AnimatePresence>
                    {copySuccess && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-xl shadow-lg border border-gray-800 z-50 flex items-center"
                        >
                            <Copy className="h-4 w-4 mr-2 text-amber-500" />
                            Link copied to clipboard!
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* Scroll to top button */}
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: showScrollTop ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={scrollToTop}
                    className={`fixed bottom-8 right-8 p-3 rounded-full bg-amber-500 text-gray-900 shadow-lg hover:bg-amber-600 transition-all duration-200 ${!showScrollTop && 'pointer-events-none'} hover:shadow-amber-500/30`}
                    aria-label="Scroll to top"
                >
                    <ChevronUp className="h-6 w-6" />
                </motion.button>
            </motion.div>
        </BackgroundWrapper>
    );
};

export default ArticleDetailsPage;
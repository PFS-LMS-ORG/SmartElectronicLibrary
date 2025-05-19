import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, Clock, Eye, Heart, Bookmark, Share2, Facebook, Twitter, Linkedin, 
    ChevronUp, Tag, Calendar, Copy, X, Mail, ArrowRight, Download,
    Sparkles, AlertCircle, FileText, ChevronLeft, ChevronRight, ZoomIn, ZoomOut
} from 'lucide-react';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import SummaryModal from '@/components/catalog/SummaryModal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up the worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// Define interfaces
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
    const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
    const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
    const [readingProgress, setReadingProgress] = useState<number>(0);
    const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
    const [copySuccess, setCopySuccess] = useState<boolean>(false);
    const [copyCompleteTimeout, setCopyCompleteTimeout] = useState<NodeJS.Timeout | null>(null);
    
    // PDF viewing states
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [isPdfLoading, setIsPdfLoading] = useState<boolean>(true);
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

    // Summary modal state
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState<boolean>(false);
    
    const contentRef = useRef<HTMLDivElement>(null);
    const articleContainerRef = useRef<HTMLDivElement>(null);
    const pdfViewerRef = useRef<HTMLDivElement>(null);
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const navigate = useNavigate();

    // Scroll handling for progress and scroll-to-top
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

    // Close share options on outside click
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
                if (!token) throw new Error('No token found');
                if (!slug) throw new Error('Article slug is missing');

                const response = await axios.get(`/api/articles/${slug}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                setArticle(response.data);

                // Fetch like and bookmark status
                try {
                    const [likesResponse, bookmarksResponse] = await Promise.all([
                        axios.get('/api/user/likes', { headers: { Authorization: `Bearer ${token}` } }),
                        axios.get('/api/user/bookmarks', { headers: { Authorization: `Bearer ${token}` } }),
                    ]);
                    setIsLiked(likesResponse.data.likedArticleIds.includes(response.data.id));
                    setIsBookmarked(bookmarksResponse.data.bookmarkedArticleIds.includes(response.data.id));
                } catch (error) {
                    console.error('Error fetching user likes/bookmarks:', error);
                }

                setError(null);
                document.title = `${response.data.title} | LMSENSA+ Research Papers`;
                
                // Fetch related articles
                try {
                    const relatedResponse = await axios.get(`/api/articles/related/${response.data.id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                        params: { limit: 3, tags: response.data.tags.join(','), category: response.data.category }
                    });
                    setRelatedArticles(relatedResponse.data.relatedArticles);
                } catch (relatedError) {
                    console.error('Error fetching related articles:', relatedError);
                    setRelatedArticles([]);
                }
            } catch (error: any) {
                console.error('Error fetching article:', error.response?.data || error.message);
                setError(error.response?.status === 404 ? 'Article not found' : 'Failed to load the article.');
                setArticle(null);
                setRelatedArticles([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchArticle();
    }, [slug, isAuthenticated, isAuthLoading, navigate]);

    // Fetch and create PDF blob URL
    useEffect(() => {
        const fetchPdf = async () => {
            if (!article?.pdfUrl) return;

            setIsPdfLoading(true);
            setPdfError(null);

            try {
                const response = await fetch(`http://localhost:5050/proxy-pdf?url=${encodeURIComponent(article.pdfUrl)}`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/pdf' }
                });
                if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);

                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                setPdfBlobUrl(blobUrl);
            } catch (error: any) {
                console.error('Error fetching PDF:', error);
                setPdfError(`Failed to load PDF: ${error.message}`);
            } finally {
                setIsPdfLoading(false);
            }
        };

        fetchPdf();

        return () => {
            if (pdfBlobUrl) window.URL.revokeObjectURL(pdfBlobUrl);
        };
    }, [article]);

    const handleBack = () => navigate('/articles');

    const handleLikeToggle = async () => {
        if (!article) return;

        setIsActionLoading(true);
        const wasLiked = isLiked;
        setIsLiked(!wasLiked);
        setArticle(prev => prev ? {
            ...prev,
            meta: { ...prev.meta, likes: wasLiked ? prev.meta.likes - 1 : prev.meta.likes + 1 }
        } : prev);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`/api/articles/${article.id}/like`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.status !== 200) throw new Error('Failed to toggle like');
            toast.success(wasLiked ? 'Article unliked' : 'Article liked', { position: 'bottom-center', autoClose: 3000 });
        } catch (error: any) {
            console.error('Error toggling like:', error);
            setIsLiked(wasLiked);
            setArticle(prev => prev ? {
                ...prev,
                meta: { ...prev.meta, likes: wasLiked ? prev.meta.likes + 1 : prev.meta.likes - 1 }
            } : prev);
            toast.error('Failed to update like status', { position: 'bottom-center', autoClose: 3000 });
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleBookmarkToggle = async () => {
        if (!article) return;

        setIsActionLoading(true);
        const wasBookmarked = isBookmarked;
        setIsBookmarked(!wasBookmarked);
        setArticle(prev => prev ? {
            ...prev,
            meta: { ...prev.meta, bookmarks: wasBookmarked ? prev.meta.bookmarks - 1 : prev.meta.bookmarks + 1 }
        } : prev);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`/api/articles/${article.id}/bookmark`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.status !== 200) throw new Error('Failed to toggle bookmark');
            toast.success(wasBookmarked ? 'Bookmark removed' : 'Article bookmarked', { position: 'bottom-center', autoClose: 3000 });
        } catch (error: any) {
            console.error('Error toggling bookmark:', error);
            setIsBookmarked(wasBookmarked);
            setArticle(prev => prev ? {
                ...prev,
                meta: { ...prev.meta, bookmarks: wasBookmarked ? prev.meta.bookmarks + 1 : prev.meta.bookmarks - 1 }
            } : prev);
            toast.error('Failed to update bookmark status', { position: 'bottom-center', autoClose: 3000 });
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleShareToggle = () => setShowShareOptions(!showShareOptions);

    const handleShare = (platform: string) => {
        const url = window.location.href;
        const title = article?.title || 'LMSENSA+ Research Paper';
        
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
                shareUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check out this research paper: ${url}`)}`;
                break;
            case 'copy':
                navigator.clipboard.writeText(url).then(() => {
                    setCopySuccess(true);
                    if (copyCompleteTimeout) clearTimeout(copyCompleteTimeout);
                    const timeout = setTimeout(() => setCopySuccess(false), 2000);
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

    const handleDownloadPdf = () => {
        if (article?.pdfUrl) window.open(article.pdfUrl, '_blank');
    };

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    const formatDate = (dateString: string) => {
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    // PDF handling functions
    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setIsPdfLoading(false);
        setPdfError(null);
    };

    const onDocumentLoadError = (error: Error) => {
        console.error('Error loading PDF:', error);
        setPdfError(`Failed to load PDF: ${error.message}`);
        setIsPdfLoading(false);
    };

    const goToPrevPage = () => setPageNumber(prev => Math.max(1, prev - 1));
    const goToNextPage = () => numPages && setPageNumber(prev => Math.min(numPages, prev + 1));
    const handlePageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = event.target.value;
        const page = parseInt(inputValue, 10);
        if (!isNaN(page) && page >= 1 && numPages && page <= numPages) {
            setPageNumber(page);
        }
    };
    const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
    const zoomOut = () => setScale(prev => Math.max(0.5, prev - 0.25));

    // Loading skeleton
    if (isLoading) {
        return (
            <BackgroundWrapper>
                <div className="max-w-5xl mx-auto px-4 py-16">
                    <div className="animate-pulse space-y-8">
                        <div className="h-8 w-32 bg-gray-700 rounded"></div>
                        <div className="h-12 bg-gray-700 rounded-lg w-3/4"></div>
                        <div className="h-64 bg-gray-700 rounded-xl w-full"></div>
                        <div className="flex space-x-4">
                            <div className="h-12 w-12 bg-gray-700 rounded-full"></div>
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-700 rounded w-32"></div>
                                <div className="h-4 bg-gray-700 rounded w-24"></div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="h-4 bg-gray-700 rounded w-full"></div>
                            <div className="h-4 bg-gray-700 rounded w-full"></div>
                            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                        </div>
                        <div className="h-64 bg-gray-700 rounded-lg w-full"></div>
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
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
                            </svg>
                        ) : (
                            <AlertCircle className="h-20 w-20 mx-auto text-gray-600" />
                        )}
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">{error}</h2>
                    <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                        {error === 'Article not found' ? "The research paper doesn't exist or has been removed." : "We're having trouble loading this paper."}
                    </p>
                    <button 
                        onClick={handleBack}
                        className="px-6 py-3 flex items-center mx-auto bg-amber-500 text-gray-900 rounded-lg hover:bg-amber-600 transition-colors font-medium shadow-lg hover:shadow-amber-500/20"
                    >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Back to Papers
                    </button>
                </div>
            </BackgroundWrapper>
        );
    }

    if (!article) return null;

    return (
        <BackgroundWrapper>
            {/* Reading progress bar */}
            <div className="fixed top-0 left-0 w-full h-1 z-50 bg-gray-800">
                <motion.div 
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
                    style={{ width: `${readingProgress}%` }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${readingProgress}%` }}
                    transition={{ duration: 0.1 }}
                />
            </div>
        
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-h-screen pb-20"
                ref={articleContainerRef}
            >
                {/* Hero Section */}
                <div className="relative w-full pb-20">
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent z-10"></div>
                    <img
                        src={article.coverImageUrl}
                        alt={article.title}
                        className="w-full h-[400px] md:h-[500px] object-cover"
                    />
                    <div className="relative z-20 flex flex-col p-6 md:p-12 max-w-5xl mx-auto">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <button
                                onClick={handleBack}
                                className="inline-flex items-center text-gray-300 hover:text-white mb-6 transition-colors group z-30"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                                Back to Papers
                            </button>
                            <div className="flex flex-wrap items-center gap-4 mb-6">
                                <span className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 text-gray-900 text-sm font-medium rounded-full shadow-md">
                                    {article.category}
                                </span>
                                <span className="flex items-center text-gray-300 text-sm font-medium backdrop-blur-sm bg-gray-900/50 px-4 py-2 rounded-full shadow-sm">
                                    <Clock className="h-4 w-4 mr-2" />
                                    {article.meta?.readTime ?? 'N/A'} min read
                                </span>
                                <span className="flex items-center text-gray-300 text-sm font-medium backdrop-blur-sm bg-gray-900/50 px-4 py-2 rounded-full shadow-sm">
                                    <Eye className="h-4 w-4 mr-2" />
                                    {article.meta?.views ?? 'N/A'} views
                                </span>
                                <span className="flex items-center text-gray-300 text-sm font-medium backdrop-blur-sm bg-gray-900/50 px-4 py-2 rounded-full shadow-sm">
                                    <FileText className="h-4 w-4 mr-2" />
                                    PDF Paper
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight tracking-tight">
                                {article.title}
                            </h1>
                            <div>
                                <p className="text-base sm:text-lg md:text-xl text-gray-200 mb-4 max-w-3xl font-light leading-relaxed line-clamp-3">
                                    {article.summary}
                                </p>
                                <button
                                    onClick={() => setIsSummaryModalOpen(true)}
                                    className="text-amber-500 hover:text-amber-400 text-sm font-medium flex items-center transition-colors"
                                >
                                    Read Full Summary
                                </button>
                                <SummaryModal
                                    isOpen={isSummaryModalOpen}
                                    onClose={() => setIsSummaryModalOpen(false)}
                                    title={article.title}
                                    coverImageUrl={article.coverImageUrl}
                                    category={article.category}
                                    summary={article.summary}
                                />
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto px-4 lg:px-8 -mt-20 relative z-20">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="relative"
                    >
                        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
                            {/* Sidebar */}
                            <div className="hidden md:block w-64 lg:w-72 shrink-0 top-24 self-start sticky">
                                <div className="bg-gray-800/90 backdrop-blur-md rounded-xl shadow-xl p-6 border border-gray-700/50">
                                    <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                                        <FileText className="h-4 w-4 mr-2 text-amber-500" />
                                        PDF Document
                                    </h3>
                                    <button
                                        onClick={handleDownloadPdf}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-gray-900 font-medium rounded-lg transition-colors mb-6"
                                    >
                                        <Download className="h-4 w-4" />
                                        Download PDF
                                    </button>
                                    <div className="mb-6 pb-6 border-b border-gray-700/50">
                                        <p className="text-gray-300 text-sm mb-2">
                                            <span className="text-gray-400">Category:</span> {article.category}
                                        </p>
                                        <p className="text-gray-300 text-sm mb-2">
                                            <span className="text-gray-400">Published:</span> {formatDate(article.createdAt)}
                                        </p>
                                        {article.updatedAt && (
                                            <p className="text-gray-300 text-sm">
                                                <span className="text-gray-400">Updated:</span> {formatDate(article.updatedAt)}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-white font-medium mb-4">Article Actions</h4>
                                        <div className="flex flex-col space-y-3">
                                            <button 
                                                onClick={handleLikeToggle}
                                                disabled={isActionLoading}
                                                className={`flex items-center px-3 py-2 rounded-lg transition-colors
                                                ${isLiked ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'text-gray-300 hover:bg-gray-700/60'}
                                                ${isActionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                aria-label={isLiked ? "Unlike this article" : "Like this article"}
                                            >
                                                <Heart className="h-5 w-5 mr-3" fill={isLiked ? "currentColor" : "none"} />
                                                <span>{isLiked ? "Liked" : "Like"}</span>
                                                <span className="ml-auto">{article.meta.likes}</span>
                                            </button>
                                            <button 
                                                onClick={handleBookmarkToggle}
                                                disabled={isActionLoading}
                                                className={`flex items-center px-3 py-2 rounded-lg transition-colors
                                                ${isBookmarked ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'text-gray-300 hover:bg-gray-700/60'}
                                                ${isActionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this article"}
                                            >
                                                <Bookmark className="h-5 w-5 mr-3" fill={isBookmarked ? "currentColor" : "none"} />
                                                <span>{isBookmarked ? "Bookmarked" : "Bookmark"}</span>
                                                <span className="ml-auto">{article.meta.bookmarks}</span>
                                            </button>
                                            <div className="relative" data-share-container>
                                                <button 
                                                    onClick={handleShareToggle}
                                                    className="flex items-center px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-700/60 transition-colors w-full"
                                                    aria-label="Share this article"
                                                >
                                                    <Share2 className="h-5 w-5 mr-3" />
                                                    <span>Share</span>
                                                    <span className="ml-auto">
                                                        {showShareOptions ? <X className="h-4 w-4" /> : <ChevronUp className="h-4 w-4 -rotate-90" />}
                                                    </span>
                                                </button>
                                                <AnimatePresence>
                                                    {showShareOptions && (
                                                        <motion.div 
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            transition={{ type: 'spring', damping: 20 }}
                                                            className="absolute top-0 right-0 mt-2 bg-gray-800 rounded-lg shadow-xl py-2 z-10 border border-gray-700"
                                                        >
                                                            <button onClick={() => handleShare('facebook')} className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 flex items-center">
                                                                <Facebook className="h-4 w-4 mr-3 text-blue-500" />
                                                                Facebook
                                                            </button>
                                                            <button onClick={() => handleShare('twitter')} className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 flex items-center">
                                                                <Twitter className="h-4 w-4 mr-3 text-blue-400" />
                                                                Twitter
                                                            </button>
                                                            <button onClick={() => handleShare('linkedin')} className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 flex items-center">
                                                                <Linkedin className="h-4 w-4 mr-3 text-blue-600" />
                                                                LinkedIn
                                                            </button>
                                                            <button onClick={() => handleShare('email')} className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 flex items-center">
                                                                <Mail className="h-4 w-4 mr-3 text-gray-400" />
                                                                Email
                                                            </button>
                                                            <button onClick={() => handleShare('copy')} className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 flex items-center">
                                                                <Copy className="h-4 w-4 mr-3 text-gray-400" />
                                                                Copy Link
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main article content */}
                            <div className="w-full">
                                <div className="bg-gray-800/90 backdrop-blur-md rounded-xl shadow-xl border border-gray-700/50">
                                    {/* Author info */}
                                    <div className="flex flex-col md:flex-row md:items-center justify-between px-6 md:px-10 py-6 border-b border-gray-700/70">
                                        <div className="flex items-center mb-4 md:mb-0">
                                            {article.author.avatarUrl ? (
                                                <img 
                                                    src={article.author.avatarUrl} 
                                                    alt={article.author.name}
                                                    className="h-14 w-14 rounded-full object-cover mr-4 border-2 border-amber-500 shadow-lg: shadow-lg"
                                                />
                                            ) : (
                                                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-400 text-gray-900 flex items-center justify-center mr-4 text-xl font-bold border-2 border-amber-500 shadow-lg">
                                                    {article.author.name.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="text-lg font-medium text-white">{article.author.name}</h3>
                                                <div className="flex items-center text-gray-400 text-sm">
                                                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                                                    {formatDate(article.createdAt)}
                                                    {article.updatedAt && article.updatedAt !== article.createdAt && (
                                                        <span className="ml-2 text-gray-500 text-xs">(Updated: {formatDate(article.updatedAt)})</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4 md:hidden">
                                            <button 
                                                onClick={handleLikeToggle}
                                                disabled={isActionLoading}
                                                className={`flex items-center ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'} transition-colors ${isActionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                aria-label={isLiked ? "Unlike this article" : "Like this article"}
                                            >
                                                <Heart className="h-6 w-6" fill={isLiked ? "currentColor" : "none"} />
                                            </button>
                                            <button 
                                                onClick={handleBookmarkToggle}
                                                disabled={isActionLoading}
                                                className={`flex items-center ${isBookmarked ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'} transition-colors ${isActionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this article"}
                                            >
                                                <Bookmark className="h-6 w-6" fill={isBookmarked ? "currentColor" : "none"} />
                                            </button>
                                            <div className="relative" data-share-container>
                                                <button 
                                                    onClick={handleShareToggle}
                                                    className="flex items-center text-gray-400 hover:text-amber-500 transition-colors"
                                                    aria-label="Share this article"
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
                                                            className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-lg py-2 z-10 border border-gray-700"
                                                        >
                                                            <button onClick={() => handleShare('facebook')} className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 flex items-center">
                                                                <Facebook className="h-4 w-4 mr-3 text-blue-500" />
                                                                Facebook
                                                            </button>
                                                            <button onClick={() => handleShare('twitter')} className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 flex items-center">
                                                                <Twitter className="h-4 w-4 mr-3 text-blue-400" />
                                                                Twitter
                                                            </button>
                                                            <button onClick={() => handleShare('linkedin')} className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 flex items-center">
                                                                <Linkedin className="h-4 w-4 mr-3 text-blue-600" />
                                                                LinkedIn
                                                            </button>
                                                            <button onClick={() => handleShare('email')} className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 flex items-center">
                                                                <Mail className="h-4 w-4 mr-3 text-gray-400" />
                                                                Email
                                                            </button>
                                                            <button onClick={() => handleShare('copy')} className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 flex items-center">
                                                                <Copy className="h-4 w-4 mr-3 text-gray-400" />
                                                                Copy Link
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* PDF Viewer */}
                                    <div ref={contentRef} className="p-6 md:p-10">
                                        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <h2 className="text-xl font-bold text-white">PDF Preview</h2>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={goToPrevPage}
                                                    disabled={pageNumber <= 1}
                                                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    aria-label="Previous page"
                                                >
                                                    <ChevronLeft className="h-5 w-5 text-gray-300" />
                                                </button>
                                                <input
                                                    type="number"
                                                    value={pageNumber}
                                                    onChange={handlePageInputChange}
                                                    min="1"
                                                    max={numPages || 1}
                                                    className="w-16 bg-gray-700 text-gray-300 text-center rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                    aria-label="Go to page"
                                                />
                                                <span className="text-gray-300">of {numPages || '...'}</span>
                                                <button
                                                    onClick={goToNextPage}
                                                    disabled={pageNumber >= (numPages || 1)}
                                                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    aria-label="Next page"
                                                >
                                                    <ChevronRight className="h-5 w-5 text-gray-300" />
                                                </button>
                                                <button
                                                    onClick={zoomOut}
                                                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                                                    aria-label="Zoom out"
                                                >
                                                    <ZoomOut className="h-5 w-5 text-gray-300" />
                                                </button>
                                                <span className="text-gray-300">{Math.round(scale * 100)}%</span>
                                                <button
                                                    onClick={zoomIn}
                                                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                                                    aria-label="Zoom in"
                                                >
                                                    <ZoomIn className="h-5 w-5 text-gray-300" />
                                                </button>
                                                <button
                                                    onClick={handleDownloadPdf}
                                                    className="md:hidden flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-medium rounded-lg transition-colors"
                                                >
                                                    <Download className="h-4 w-4" />
                                                    Download PDF
                                                </button>
                                            </div>
                                        </div>
                                        <div ref={pdfViewerRef} className="pdf-container bg-gray-900 rounded-lg border border-gray-700 overflow-auto max-h-[80vh]">
                                            {isPdfLoading && (
                                                <div className="flex flex-col items-center justify-center py-16">
                                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mb-4"></div>
                                                    <p className="text-gray-300">Loading PDF document...</p>
                                                </div>
                                            )}
                                            {pdfError && (
                                                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                                                    <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                                                    <h3 className="text-lg font-medium text-white mb-2">Failed to load PDF</h3>
                                                    <p className="text-gray-400 mb-4">{pdfError}</p>
                                                    <button
                                                        onClick={handleDownloadPdf}
                                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-medium rounded-lg transition-colors"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                        Download PDF
                                                    </button>
                                                </div>
                                            )}
                                            {pdfBlobUrl && !isPdfLoading && !pdfError && (
                                                <div className="flex justify-center">
                                                    <Document
                                                        file={pdfBlobUrl}
                                                        onLoadSuccess={onDocumentLoadSuccess}
                                                        onLoadError={onDocumentLoadError}
                                                        className="flex justify-center"
                                                    >
                                                        <Page
                                                            pageNumber={pageNumber}
                                                            scale={scale}
                                                            renderTextLayer={true}
                                                            renderAnnotationLayer={true}
                                                            className="shadow-lg"
                                                        />
                                                    </Document>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    <div className="px-6 md:px-10 pt-4 pb-6 border-t border-gray-700/70">
                                        {article.tags.length > 0 && (
                                            <div className="mb-6">
                                                <h4 className="text-white font-medium mb-4 flex items-center">
                                                    <Tag className="h-4 w-4 mr-2 text-amber-500" />
                                                    Tags
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {article.tags.map(tag => (
                                                        <span 
                                                            key={tag}
                                                            className="px-3 py-1.5 bg-gray-700/60 hover:bg-gray-700 text-gray-300 rounded-full text-sm transition-colors cursor-pointer"
                                                            onClick={() => navigate(`/articles?tag=${tag}`)}
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="md:hidden flex justify-between items-center pt-4 border-t border-gray-700/50">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-gray-400 text-sm">{article.meta.views} views</span>
                                                <span className="text-gray-600">•</span>
                                                <span className="text-gray-400 text-sm">{article.meta.likes} likes</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Related articles */}
                                {relatedArticles.length > 0 && (
                                    <div className="mt-10">
                                        <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                                            <Sparkles className="h-5 w-5 mr-2 text-amber-500" />
                                            Related Papers
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {relatedArticles.map(related => (
                                                <motion.div
                                                    key={related.id}
                                                    whileHover={{ y: -5 }}
                                                    transition={{ type: 'spring', stiffness: 300 }}
                                                    className="group"
                                                >
                                                    <Link to={`/articles/${related.slug}`} className="block rounded-xl overflow-hidden bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 shadow-lg hover:shadow-amber-500/10 transition-shadow">
                                                        <div className="relative h-40 overflow-hidden">
                                                            <img 
                                                                src={related.coverImageUrl}
                                                                alt={related.title}
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                            />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
                                                            <div className="absolute bottom-3 left-3">
                                                                <span className="px-2 py-1 bg-amber-500 text-gray-900 text-xs font-medium rounded-full">
                                                                    {related.category}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="p-4">
                                                            <h4 className="text-lg font-medium text-white mb-2 line-clamp-2 group-hover:text-amber-400 transition-colors">
                                                                {related.title}
                                                            </h4>
                                                            <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                                                                {related.summary}
                                                            </p>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-gray-500 text-xs">
                                                                    {formatDate(related.createdAt)}
                                                                </span>
                                                                <span className="text-amber-500 text-sm font-medium flex items-center group-hover:translate-x-1 transition-transform">
                                                                    View paper 
                                                                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
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
                            className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg border border-gray-700 z-50 flex items-center"
                        >
                            <Copy className="h-4 w-4 mr-2 text-amber-500" />
                            Link copied to clipboard!
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* Scroll to top */}
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: showScrollTop ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={scrollToTop}
                    className={`fixed bottom-8 right-8 p-3 z-10 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-gray-900 shadow-lg hover:bg-amber-600 transition-all ${!showScrollTop && 'pointer-events-none'} hover:shadow-amber-500/20`}
                    aria-label="Scroll to top"
                >
                    <ChevronUp className="h-6 w-6" />
                </motion.button>
            </motion.div>
        </BackgroundWrapper>
    );
};

export default ArticleDetailsPage;
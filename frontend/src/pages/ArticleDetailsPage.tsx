import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, Clock, Eye, Heart, Bookmark, Share2, Facebook, Twitter, Linkedin, 
    ChevronUp, Tag, Calendar, Copy, List, X, Mail, ArrowRight,
    Sparkles, AlertCircle
} from 'lucide-react';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { toast } from 'react-toastify';

// Define interfaces based on the requirements
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
    content: string;
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

interface TOCItem {
    id: string;
    text: string;
    level: number;
}

// Define custom renderers for ReactMarkdown with proper types
type CustomRendererProps = {
    children?: React.ReactNode;
    node?: any;
    className?: string;
    href?: string;
    src?: string;
    alt?: string;
    inline?: boolean;
    [key: string]: any;
};

const ArticleDetailsPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [article, setArticle] = useState<ArticleWithMeta | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showShareOptions, setShowShareOptions] = useState<boolean>(false);
    const [isLiked, setIsLiked] = useState<boolean>(false);
    const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
    const [isActionLoading, setIsActionLoading] = useState<boolean>(false); // New state for debouncing
    const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
    const [readingProgress, setReadingProgress] = useState<number>(0);
    const [activeHeading, setActiveHeading] = useState<string>('');
    const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
    const [showTOC, setShowTOC] = useState<boolean>(false);
    const [copySuccess, setCopySuccess] = useState<boolean>(false);
    const [copyCompleteTimeout, setCopyCompleteTimeout] = useState<NodeJS.Timeout | null>(null);
    
    const contentRef = useRef<HTMLDivElement>(null);
    const articleContainerRef = useRef<HTMLDivElement>(null);
    const headingRefs = useRef<Record<string, HTMLElement | null>>({});
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
            
            // Update active heading based on scroll position
            if (headingRefs.current) {
                const headings = Object.entries(headingRefs.current).filter(([, ref]) => ref !== null);
                
                for (let i = headings.length - 1; i >= 0; i--) {
                    const [id, ref] = headings[i];
                    if (ref && ref.getBoundingClientRect().top <= 100) {
                        setActiveHeading(id);
                        break;
                    }
                }
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
        return () => document.addEventListener('mousedown', handleClickOutside);
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
                            category: response.data.category
                        }
                    });
                    setRelatedArticles(relatedResponse.data.relatedArticles);
                } catch (relatedError) {
                    console.error('Error fetching related articles:', relatedError);
                    // Don't set error for related articles, it's not critical
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

    // Parse article content to extract headings for TOC
    const tableOfContents = useMemo(() => {
        if (!article) return [];
        
        const headingRegex = /^(#{1,3})\s+(.+)$/gm;
        const toc: TOCItem[] = [];
        let match;
        
        while ((match = headingRegex.exec(article.content)) !== null) {
            const level = match[1].length;
            const text = match[2].trim();
            const id = text.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
            
            toc.push({ id, text, level });
        }
        
        return toc;
    }, [article]);

    const handleBack = () => {
        navigate('/articles');
    };

    const handleLikeToggle = async () => {
      if (!article) return;

      const wasLiked = isLiked;
      setIsLiked(!wasLiked); // Optimistic UI update for like state
      setArticle((prev) =>
          prev
              ? {
                    ...prev,
                    meta: {
                        ...prev.meta,
                        likes: wasLiked ? prev.meta.likes - 1 : prev.meta.likes + 1,
                    },
                }
              : prev
      ); // Optimistic UI update for like count

      try {
          const token = localStorage.getItem('token');
          const response = await axios.post(`/api/articles/${article.id}/like`, {}, {
              headers: {
                  Authorization: `Bearer ${token}`,
              },
          });

          // Log response for debugging
          console.log('Like response:', response.data);

          toast.success(wasLiked ? 'Article unliked' : 'Article liked', {
              position: 'bottom-center',
              autoClose: 3000,
          });
      } catch (error: any) {
          console.error('Error toggling like:', {
              message: error.message,
              response: error.response?.data,
              status: error.response?.status,
          });
          setIsLiked(wasLiked); // Revert like status
          setArticle((prev) =>
              prev
                  ? {
                        ...prev,
                        meta: {
                            ...prev.meta,
                            likes: wasLiked ? prev.meta.likes + 1 : prev.meta.likes - 1,
                        },
                    }
                  : prev
          ); // Revert like count
          toast.error('Failed to update like status', {
              position: 'bottom-center',
              autoClose: 3000,
          });
      }
    };

    const handleBookmarkToggle = async () => {
        if (!article) return;

        const wasBookmarked = isBookmarked;
        setIsBookmarked(!wasBookmarked); // Optimistic UI update for bookmark state
        setArticle((prev) =>
            prev
                ? {
                      ...prev,
                      meta: {
                          ...prev.meta,
                          bookmarks: wasBookmarked ? prev.meta.bookmarks - 1 : prev.meta.bookmarks + 1,
                      },
                  }
                : prev
        ); // Optimistic UI update for bookmark count

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`/api/articles/${article.id}/bookmark`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            // Log response for debugging
            console.log('Bookmark response:', response.data);

            toast.success(wasBookmarked ? 'Bookmark removed' : 'Article bookmarked', {
                position: 'bottom-center',
                autoClose: 3000,
            });
        } catch (error: any) {
            console.error('Error toggling bookmark:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
            setIsBookmarked(wasBookmarked); // Revert bookmark status
            setArticle((prev) =>
                prev
                    ? {
                          ...prev,
                          meta: {
                              ...prev.meta,
                              bookmarks: wasBookmarked ? prev.meta.bookmarks + 1 : prev.meta.bookmarks - 1,
                          },
                      }
                    : prev
            ); // Revert bookmark count
            toast.error('Failed to update bookmark status', {
                position: 'bottom-center',
                autoClose: 3000,
            });
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

    const scrollToHeading = (id: string) => {
        const element = headingRefs.current[id];
        if (element) {
            const offset = 80; // Adjust based on any fixed headers
            const elementPosition = element.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({
                top: elementPosition - offset,
                behavior: 'smooth'
            });
            
            // Highlight the heading briefly
            element.classList.add('highlight-heading');
            setTimeout(() => {
                element.classList.remove('highlight-heading');
            }, 1500);
        }
        
        if (window.innerWidth < 768) {
            setShowTOC(false);
        }
    };

    // Function to format date
    const formatDate = (dateString: string) => {
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    // Custom renderer for markdown headings to add IDs for TOC
    const customRenderers: Components = {
        h1: ({ children }: CustomRendererProps) => {
            const text = children?.toString() || '';
            const id = text.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
            
            return (
                <h1 
                    id={id} 
                    className="scroll-mt-24 font-bold text-3xl mt-8 mb-4 text-white relative group"
                    ref={(el) => { headingRefs.current[id] = el; }}
                >
                    {children}
                    <a 
                        href={`#${id}`} 
                        className="absolute -left-6 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500"
                        aria-label={`Link to ${text}`}
                    >
                        #
                    </a>
                </h1>
            );
        },
        h2: ({ children }: CustomRendererProps) => {
            const text = children?.toString() || '';
            const id = text.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
            
            return (
                <h2 
                    id={id} 
                    className="scroll-mt-24 font-bold text-2xl mt-8 mb-4 text-white relative group"
                    ref={(el) => { headingRefs.current[id] = el; }}
                >
                    {children}
                    <a 
                        href={`#${id}`} 
                        className="absolute -left-5 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500"
                        aria-label={`Link to ${text}`}
                    >
                        #
                    </a>
                </h2>
            );
        },
        h3: ({ children }: CustomRendererProps) => {
            const text = children?.toString() || '';
            const id = text.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
            
            return (
                <h3 
                    id={id} 
                    className="scroll-mt-24 font-bold text-xl mt-6 mb-3 text-white relative group"
                    ref={(el) => { headingRefs.current[id] = el; }}
                >
                    {children}
                    <a 
                        href={`#${id}`} 
                        className="absolute -left-5 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500"
                        aria-label={`Link to ${text}`}
                    >
                        #
                    </a>
                </h3>
            );
        },
        p: ({ children }: CustomRendererProps) => (
            <p className="mb-4 text-gray-200 leading-relaxed">{children}</p>
        ),
        ul: ({ children }: CustomRendererProps) => (
            <ul className="mb-4 pl-8 list-disc text-gray-200 space-y-2">{children}</ul>
        ),
        ol: ({ children }: CustomRendererProps) => (
            <ol className="mb-4 pl-8 list-decimal text-gray-200 space-y-2">{children}</ol>
        ),
        li: ({ children }: CustomRendererProps) => (
            <li className="text-gray-200">{children}</li>
        ),
        blockquote: ({ children }: CustomRendererProps) => (
            <blockquote className="pl-4 border-l-4 border-amber-500 my-4 italic text-gray-300 bg-gray-800/50 p-3 rounded-r">{children}</blockquote>
        ),
        code: ({ node, inline, className, children, ...props }: CustomRendererProps) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
                <div className="relative group my-4">
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                setCopySuccess(true);
                                setTimeout(() => setCopySuccess(false), 2000);
                            }}
                            className="bg-gray-700 p-1 rounded hover:bg-gray-600 transition-colors"
                            aria-label="Copy code"
                        >
                            <Copy className="h-4 w-4 text-gray-300" />
                        </button>
                    </div>
                    <pre
                        className={`${
                            match ? 'language-' + match[1] : ''
                        } rounded-lg p-4 bg-gray-900 text-gray-200 border border-gray-700 whitespace-pre-wrap break-words max-w-full`}
                    >
                        <code className={className} {...props}>
                            {children}
                        </code>
                    </pre>
                </div>
            ) : (
                <code className="bg-gray-800 text-amber-400 px-1 py-0.5 rounded text-sm" {...props}>
                    {children}
                </code>
            );
        },
        a: ({ href, children }: CustomRendererProps) => {
            if (!href) return <>{children}</>;
            return (
                <a 
                    href={href} 
                    target={href.startsWith('http') ? "_blank" : undefined}
                    rel={href.startsWith('http') ? "noopener noreferrer" : undefined}
                    className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                >
                    {children}
                </a>
            );
        },
        img: ({ src, alt }: CustomRendererProps) => {
            if (!src) return null;
            return (
                <div className="my-6">
                    <img 
                        src={src} 
                        alt={alt || 'Article image'} 
                        className="rounded-lg shadow-lg max-w-full mx-auto border border-gray-700"
                    />
                    {alt && alt !== 'Article image' && (
                        <p className="text-center text-gray-400 text-sm mt-2 italic">{alt}</p>
                    )}
                </div>
            );
        },
        table: ({ children }: CustomRendererProps) => (
            <div className="overflow-x-auto my-6">
                <table className="min-w-full border border-gray-700 rounded-lg overflow-hidden">
                    {children}
                </table>
            </div>
        ),
        thead: ({ children }: CustomRendererProps) => (
            <thead className="bg-gray-700 text-white">{children}</thead>
        ),
        tbody: ({ children }: CustomRendererProps) => (
            <tbody className="divide-y divide-gray-700">{children}</tbody>
        ),
        tr: ({ children }: CustomRendererProps) => (
            <tr className="hover:bg-gray-800/50 transition-colors">{children}</tr>
        ),
        th: ({ children }: CustomRendererProps) => (
            <th className="px-4 py-3 text-left font-medium">{children}</th>
        ),
        td: ({ children }: CustomRendererProps) => (
            <td className="px-4 py-3 border-t border-gray-700">{children}</td>
        ),
        hr: () => (
            <hr className="my-8 border-gray-700" />
        )
    };

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
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="w-full md:w-2/3 space-y-4">
                                <div className="h-5 bg-gray-700 rounded w-1/2"></div>
                                <div className="h-40 bg-gray-700 rounded-lg w-full"></div>
                                <div className="h-5 bg-gray-700 rounded w-3/4"></div>
                                <div className="h-20 bg-gray-700 rounded-lg w-full"></div>
                            </div>
                            <div className="w-full md:w-1/3 space-y-4">
                                <div className="h-6 bg-gray-700 rounded w-1/2"></div>
                                <div className="h-32 bg-gray-700 rounded-lg w-full"></div>
                                <div className="h-6 bg-gray-700 rounded w-1/3"></div>
                                <div className="h-32 bg-gray-700 rounded-lg w-full"></div>
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
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
                            </svg>
                        ) : (
                            <AlertCircle className="h-20 w-20 mx-auto text-gray-600" />
                        )}
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">{error}</h2>
                    <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                        {error === 'Article not found' 
                            ? "The article you're looking for doesn't exist or has been removed." 
                            : "We're having trouble loading this article. Please try again later."
                        }
                    </p>
                    <button 
                        onClick={handleBack}
                        className="px-6 py-3 flex items-center mx-auto bg-amber-500 text-gray-900 rounded-lg hover:bg-amber-600 transition-colors duration-200 font-medium shadow-lg hover:shadow-amber-500/20"
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
                {/* Hero Section with Cover Image */}
                <div className="relative h-[500px] md:h-[600px] w-full">
                    {/* Gradient overlay for better text visibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent z-10"></div>
                    
                    {/* Cover image */}
                    <img 
                        src={article.coverImageUrl} 
                        alt={article.title}
                        className="w-full h-full object-cover"
                    />
                    
                    {/* Content overlay */}
                    <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 md:p-12 max-w-5xl mx-auto">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <button 
                                onClick={handleBack}
                                className="inline-flex items-center text-gray-300 hover:text-white mb-6 transition-colors duration-200 group"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                                Back to Articles
                            </button>
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <span className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 text-gray-900 text-xs font-medium rounded-full shadow-md">
                                    {article.category}
                                </span>
                                <span className="flex items-center text-gray-300 text-sm backdrop-blur-sm bg-gray-900/30 px-3 py-1.5 rounded-full">
                                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                                    {article.meta.readTime} min read
                                </span>
                                <span className="flex items-center text-gray-300 text-sm backdrop-blur-sm bg-gray-900/30 px-3 py-1.5 rounded-full">
                                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                                    {article.meta.views} views
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
                                {article.title}
                            </h1>
                            <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-3xl font-light leading-relaxed">
                                {article.summary}
                            </p>
                        </motion.div>
                    </div>
                </div>

                {/* Table of Contents toggle for mobile */}
                <div className="md:hidden fixed top-3 right-3 z-40">
                    <button
                        onClick={() => setShowTOC(!showTOC)}
                        className="p-2 rounded-full bg-gray-800/90 backdrop-blur-sm shadow-lg border border-gray-700 text-gray-200 hover:text-amber-400 transition-colors"
                        aria-label={showTOC ? "Close table of contents" : "Open table of contents"}
                    >
                        {showTOC ? <X className="h-5 w-5" /> : <List className="h-5 w-5" />}
                    </button>
                </div>

                {/* Mobile TOC Overlay */}
                <AnimatePresence>
                    {showTOC && (
                        <motion.div
                            initial={{ opacity: 0, x: 300 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 300 }}
                            transition={{ type: 'spring', damping: 20 }}
                            className="fixed inset-0 z-30 md:hidden"
                        >
                            <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setShowTOC(false)}></div>
                            <div className="absolute right-0 top-0 h-full w-4/5 max-w-xs bg-gray-800 border-l border-gray-700 overflow-y-auto p-4 shadow-xl">
                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-700">
                                    <h3 className="text-white font-bold">Table of Contents</h3>
                                    <button onClick={() => setShowTOC(false)} className="text-gray-400 hover:text-white">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                
                                {tableOfContents.length > 0 ? (
                                    <ul className="space-y-2">
                                        {tableOfContents.map((item) => (
                                            <li 
                                                key={item.id}
                                                style={{ paddingLeft: `${(item.level - 1) * 0.75}rem` }}
                                                className="relative"
                                            >
                                                <button
                                                    onClick={() => scrollToHeading(item.id)}
                                                    className={`block text-left w-full py-1.5 px-2 rounded transition-colors truncate hover:bg-gray-700 
                                                    ${activeHeading === item.id ? 'text-amber-400 bg-gray-700/70 font-medium' : 'text-gray-300'}`}
                                                >
                                                    {item.text}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-400 text-sm italic">No headings found in this article.</p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Content */}
                <div className="max-w-5xl mx-auto px-4 lg:px-8 -mt-20 relative z-20">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="relative"
                    >
                        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
                            {/* Sidebar with TOC (desktop) */}
                            <div className="hidden md:block w-64 lg:w-72 shrink-0 top-24 self-start sticky">
                                <div className="bg-gray-800/90 backdrop-blur-md rounded-xl shadow-xl p-6 border border-gray-700/50">
                                    <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                                        <List className="h-4 w-4 mr-2 text-amber-500" />
                                        Table of Contents
                                    </h3>
                                    
                                    {tableOfContents.length > 0 ? (
                                        <ul className="space-y-2">
                                            {tableOfContents.map((item) => (
                                                <li 
                                                    key={item.id}
                                                    style={{ paddingLeft: `${(item.level - 1) * 0.75}rem` }}
                                                    className="relative"
                                                >
                                                    <button
                                                        onClick={() => scrollToHeading(item.id)}
                                                        className={`block text-left w-full py-1.5 px-2 rounded transition-colors truncate hover:bg-gray-700/70
                                                        ${activeHeading === item.id ? 'text-amber-400 font-medium bg-gray-700/50' : 'text-gray-300'}`}
                                                    >
                                                        {activeHeading === item.id && (
                                                            <motion.div
                                                                layoutId="activeHeadingIndicator"
                                                                className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-r"
                                                                transition={{ type: 'spring', damping: 15 }}
                                                            />
                                                        )}
                                                        {item.text}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-gray-400 text-sm italic">No headings found in this article.</p>
                                    )}

                                    {/* Article actions (desktop) */}
                                    <div className="mt-8 pt-6 border-t border-gray-700/50">
                                        <h4 className="text-white font-medium mb-4">Article Actions</h4>
                                        <div className="flex flex-col space-y-3">
                                            <button 
                                                onClick={handleLikeToggle}
                                                disabled={isActionLoading}
                                                className={`flex items-center px-3 py-2 rounded-lg transition-colors
                                                ${isLiked 
                                                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                                                    : 'text-gray-300 hover:bg-gray-700/60'}
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
                                                ${isBookmarked 
                                                    ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' 
                                                    : 'text-gray-300 hover:bg-gray-700/60'}
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
                                                            className="absolute top-0 right-0 mt-2 bg-gray-800 rounded-lg shadow-xl py-2 z-10 border border-gray-700"
                                                        >
                                                            <button 
                                                                onClick={() => handleShare('facebook')}
                                                                className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 flex items-center"
                                                            >
                                                                <Facebook className="h-4 w-4 mr-3 text-blue-500" />
                                                                Facebook
                                                            </button>
                                                            <button 
                                                                onClick={() => handleShare('twitter')}
                                                                className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 flex items-center"
                                                            >
                                                                <Twitter className="h-4 w-4 mr-3 text-blue-400" />
                                                                Twitter
                                                            </button>
                                                            <button 
                                                                onClick={() => handleShare('linkedin')}
                                                                className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 flex items-center"
                                                            >
                                                                <Linkedin className="h-4 w-4 mr-3 text-blue-600" />
                                                                LinkedIn
                                                            </button>
                                                            <button 
                                                                onClick={() => handleShare('email')}
                                                                className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 flex items-center"
                                                            >
                                                                <Mail className="h-4 w-4 mr-3 text-gray-400" />
                                                                Email
                                                            </button>
                                                            <button 
                                                                onClick={() => handleShare('copy')}
                                                                className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 flex items-center"
                                                            >
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
                                    {/* Author info and meta data */}
                                    <div className="flex flex-col md:flex-row md:items-center justify-between px-6 md:px-10 py-6 border-b border-gray-700/70">
                                        <div className="flex items-center mb-4 md:mb-0">
                                            {article.author.avatarUrl ? (
                                                <img 
                                                    src={article.author.avatarUrl} 
                                                    alt={article.author.name}
                                                    className="h-14 w-14 rounded-full object-cover mr-4 border-2 border-amber-500 shadow-lg"
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
                                        
                                        {/* Mobile action buttons */}
                                        <div className="flex items-center space-x-4 md:hidden">
                                            <button 
                                                onClick={handleLikeToggle}
                                                disabled={isActionLoading}
                                                className={`flex items-center ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'} transition-colors duration-200 ${isActionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                aria-label={isLiked ? "Unlike this article" : "Like this article"}
                                            >
                                                <Heart className="h-6 w-6" fill={isLiked ? "currentColor" : "none"} />
                                            </button>
                                            
                                            <button 
                                                onClick={handleBookmarkToggle}
                                                disabled={isActionLoading}
                                                className={`flex items-center ${isBookmarked ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'} transition-colors duration-200 ${isActionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this article"}
                                            >
                                                <Bookmark className="h-6 w-6" fill={isBookmarked ? "currentColor" : "none"} />
                                            </button>
                                            
                                            <div className="relative" data-share-container>
                                                <button 
                                                    onClick={handleShareToggle}
                                                    className="flex items-center text-gray-400 hover:text-amber-500 transition-colors duration-200"
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
                                                            <button 
                                                                onClick={() => handleShare('facebook')}
                                                                className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 flex items-center"
                                                            >
                                                                <Facebook className="h-4 w-4 mr-3 text-blue-500" />
                                                                Facebook
                                                            </button>
                                                            <button 
                                                                onClick={() => handleShare('twitter')}
                                                                className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 flex items-center"
                                                            >
                                                                <Twitter className="h-4 w-4 mr-3 text-blue-400" />
                                                                Twitter
                                                            </button>
                                                            <button 
                                                                onClick={() => handleShare('linkedin')}
                                                                className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 flex items-center"
                                                            >
                                                                <Linkedin className="h-4 w-4 mr-3 text-blue-600" />
                                                                LinkedIn
                                                            </button>
                                                            <button 
                                                                onClick={() => handleShare('email')}
                                                                className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 flex items-center"
                                                            >
                                                                <Mail className="h-4 w-4 mr-3 text-gray-400" />
                                                                Email
                                                            </button>
                                                            <button 
                                                                onClick={() => handleShare('copy')}
                                                                className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 flex items-center"
                                                            >
                                                                <Copy className="h-4 w-4 mr-3 text-gray-400" />
                                                                Copy Link
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Article content */}
                                    <div ref={contentRef} className="p-6 md:p-10">
                                        <div className="prose prose-lg prose-invert prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight prose-p:text-gray-200 prose-p:leading-relaxed prose-strong:text-amber-400 prose-a:text-amber-400 prose-a:no-underline hover:prose-a:text-amber-300 prose-blockquote:border-l-amber-500 prose-blockquote:bg-gray-800/50 prose-blockquote:p-3 prose-blockquote:not-italic prose-blockquote:rounded-r prose-code:text-amber-400 prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm max-w-none">
                                            <ReactMarkdown components={customRenderers}>{article.content}</ReactMarkdown>
                                        </div>
                                    </div>

                                    {/* Tags and mobile actions */}
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
                                                            className="px-3 py-1.5 bg-gray-700/60 hover:bg-gray-700 text-gray-300 rounded-full text-sm transition-colors duration-200 cursor-pointer"
                                                            onClick={() => navigate(`/articles?tag=${tag}`)}
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Mobile-only action bar */}
                                        <div className="md:hidden flex justify-between items-center pt-4 border-t border-gray-700/50">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-gray-400 text-sm">{article.meta.views} views</span>
                                                <span className="text-gray-600">•</span>
                                                <span className="text-gray-400 text-sm">{article.meta.likes} likes</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Related articles section */}
                                {relatedArticles.length > 0 && (
                                    <div className="mt-10">
                                        <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                                            <Sparkles className="h-5 w-5 mr-2 text-amber-500" />
                                            Related Articles
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
                                                                    Read more 
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
                
                {/* Success notification for copy link */}
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
                
                {/* Scroll to top button */}
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: showScrollTop ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={scrollToTop}
                    className={`fixed bottom-8 right-8 p-3 z-10 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-gray-900 shadow-lg hover:bg-amber-600 transition-all duration-200 ${!showScrollTop && 'pointer-events-none'} hover:shadow-amber-500/20`}
                    aria-label="Scroll to top"
                >
                    <ChevronUp className="h-6 w-6" />
                </motion.button>
            </motion.div>
        </BackgroundWrapper>
    );
};

export default ArticleDetailsPage;
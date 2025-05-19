import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Heart, Bookmark, Eye, FileText } from 'lucide-react';

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
    pdfUrl: string;  // Changed from content to pdfUrl
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

// Props for ArticleCard component
interface ArticleCardProps {
    article: ArticleWithMeta;
    isLiked: boolean;
    isBookmarked: boolean;
    onLikeToggle: (articleId: string, e: React.MouseEvent) => void;
    onBookmarkToggle: (articleId: string, e: React.MouseEvent) => void;
    onNavigate: (slug: string) => void;
    formatDate: (dateString: string) => string;
}

const ArticleCard: React.FC<ArticleCardProps> = ({
    article,
    isLiked,
    isBookmarked,
    onLikeToggle,
    onBookmarkToggle,
    onNavigate,
    formatDate,
}) => {
    return (
        <motion.article
        variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
        }}
        whileHover={{ y: -8, transition: { duration: 0.2 } }}
        className="flex flex-col rounded-xl overflow-hidden bg-gray-800/60 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
        onClick={() => onNavigate(article.slug)}
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

            {/* PDF Indicator */}
            {article.pdfUrl && (
                <div className="flex items-center text-amber-400 text-xs mb-4">
                    <FileText className="h-3 w-3 mr-1" />
                    PDF Paper Available
                </div>
            )}

            {/* Article meta */}
            <div className="mt-auto">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={(e) => onLikeToggle(article.id, e)}
                        className={`flex items-center text-xs transition-colors ${
                            isLiked
                            ? 'text-red-500 hover:text-red-400'
                            : 'text-gray-400 hover:text-red-500'
                        }`}
                        aria-label={isLiked ? 'Unlike article' : 'Like article'}
                    >
                        <Heart
                            className="h-3 w-3 mr-1"
                            fill={isLiked ? 'currentColor' : 'none'}
                        />
                        {article.meta.likes}
                    </button>
                    <button
                        onClick={(e) => onBookmarkToggle(article.id, e)}
                        className={`flex items-center text-xs transition-colors ${
                            isBookmarked
                            ? 'text-amber-500 hover:text-amber-400'
                            : 'text-gray-400 hover:text-amber-500'
                        }`}
                        aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark article'}
                    >
                        <Bookmark
                            className="h-3 w-3 mr-1"
                            fill={isBookmarked ? 'currentColor' : 'none'}
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
    );
};

export default ArticleCard;
import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Eye, Heart } from 'lucide-react';

export interface ArticleRecommendation {
    id: number;
    slug: string;
    title: string;
    author: string;
    category: string;
    summary: string;
    pdf_url: string;
    cover_image_url: string;
    read_time: number;
    views: number;
    likes: number;
    reason: string;
}

interface ArticleRecommendationItemProps {
    article: ArticleRecommendation;
    language: 'en' | 'fr' | 'ar';
    onClick: (slug: string) => void;
}

export const ArticleRecommendationItem: React.FC<ArticleRecommendationItemProps> = ({ 
    article, 
    language, 
    onClick 
}) => {
    return (
        <motion.div
            className="rounded-lg overflow-hidden bg-gradient-to-br from-gray-800/80 to-gray-900/80 shadow-md hover:shadow-lg transition-allбельduration-300 cursor-pointer flex h-24"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.02, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onClick(article.slug)}
        >
        <div className="h-full w-16 bg-gray-700 overflow-hidden flex-shrink-0">
            <img 
                src={article.cover_image_url} 
                alt={article.title} 
                className="h-full w-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                onError={(e) => (e.currentTarget.src = '/default_article_cover.jpg')}
            />
        </div>
        <div className="flex-1 p-2 flex flex-col justify-between overflow-hidden">
            <div>
            <h3 className="text-white font-medium text-sm truncate">
                {article.title}
            </h3>
            <p className="text-gray-400 text-xs truncate mt-0.5">
                {article.author}
            </p>
            </div>
            <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-indigo-400" />
                <span className="text-indigo-400 text-xs">{article.read_time} min</span>
                <Eye className="h-3 w-3 text-gray-400" />
                <span className="text-gray-400 text-xs">{article.views}</span>
                <Heart className="h-3 w-3 text-red-400" />
                <span className="text-red-400 text-xs">{article.likes}</span>
            </div>
        </div>
        </motion.div>
    );
};

interface ArticleRecommendationsProps {
    recommendations: ArticleRecommendation[] | undefined;
    language: 'en' | 'fr' | 'ar';
    onArticleClick: (slug: string) => void;
}

const ArticleRecommendations: React.FC<ArticleRecommendationsProps> = ({ 
    recommendations, 
    language, 
    onArticleClick 
}) => {
    if (!recommendations || recommendations.length === 0) return null;
    const translations = {
        en: "Article Recommendations",
        fr: "Recommandations d'Articles",
        ar: "توصيات المقالات"
    };
    return (
        <div className="mt-2 mb-3">
            <p className="text-xs text-indigo-300 mb-2 font-medium">
                {translations[language]}
            </p>
            <div className="grid grid-cols-2 gap-2">
                {recommendations.map((article) => (
                <ArticleRecommendationItem 
                    key={article.id} 
                    article={article} 
                    language={language}
                    onClick={onArticleClick}
                />
                ))}
            </div>
        </div>
    );
};

export default ArticleRecommendations;
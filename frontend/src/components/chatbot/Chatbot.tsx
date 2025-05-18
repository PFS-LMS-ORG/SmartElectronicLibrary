import React, { useState, useRef, useEffect } from 'react';
import { MessageSquareText, Send, X, Loader2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BookRecommendations, { BookRecommendation } from './BookRecommendation';
import ArticleRecommendations, { ArticleRecommendation } from './ArticleRecommendation';
import { R } from 'node_modules/framer-motion/dist/types.d-DUA-weyD';

type MessageRole = 'user' | 'assistant';

interface Message {
  id: string;
  content: string;
  role: MessageRole;
  timestamp: Date;
  book_recommendations?: BookRecommendation[];
  article_recommendations?: ArticleRecommendation[];
  follow_up_question?: string;
}

type LanguageOption = 'en' | 'fr' | 'ar';

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [language, setLanguage] = useState<LanguageOption>('en');
  const [hasLoadedHistory, setHasLoadedHistory] = useState<boolean>(false);
  const [isFirstOpen, setIsFirstOpen] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const translations = {
    en: {
      placeholder: 'Ask me about books or articles...',
      welcomeMessage: `Hello, ${user?.name || 'User'}! I'm AYO+, your library assistant. I can help you find book and article recommendations, answer questions about our library, or assist with borrowing books. How can I assist you today?`,
      sending: 'Thinking...',
      send: 'Send',
      authError: 'You need to be logged in to use the chatbot.',
      borrowSuccess: 'Rental request created successfully!',
      borrowError: 'Failed to create rental request.',
      clearConversation: 'Clear conversation',
      conversationCleared: 'Conversation cleared successfully',
      errorClearing: 'Error clearing conversation'
    },
    fr: {
      placeholder: 'Posez-moi des questions sur les livres ou articles...',
      welcomeMessage: `Bonjour, ${user?.name || 'Utilisateur'} ! Je suis AYO+, votre assistant de bibliothèque. Je peux vous aider à trouver des recommandations de livres et d'articles, répondre à des questions sur notre bibliothèque ou vous aider à emprunter des livres. Comment puis-je vous aider aujourd'hui ?`,
      sending: 'En réflexion...',
      send: 'Envoyer',
      authError: 'Vous devez être connecté pour utiliser le chatbot.',
      borrowSuccess: 'Demande de location créée avec succès !',
      borrowError: 'Échec de la création de la demande de location.',
      clearConversation: 'Effacer la conversation',
      conversationCleared: 'Conversation effacée avec succès',
      errorClearing: 'Erreur lors de l\'effacement de la conversation'
    },
    ar: {
      placeholder: 'اسألني عن الكتب أو المقالات...',
      welcomeMessage: `مرحبًا، ${user?.name || 'مستخدم'}! أنا AYO+، مساعد المكتبة الخاص بك. يمكنني مساعدتك في العثور على توصيات الكتب والمقالات، والإجابة على الأسئلة حول مكتبتنا، أو المساعدة في استعارة الكتب. كيف يمكنني مساعدتك اليوم؟`,
      sending: 'جاري التفكير...',
      send: 'إرسال',
      authError: 'يجب أن تكون مسجل الدخول لاستخدام روبوت المحادثة.',
      borrowSuccess: 'تم إنشاء طلب الاستعارة بنجاح!',
      borrowError: 'فشل في إنشاء طلب الاستعارة.',
      clearConversation: 'مسح المحادثة',
      conversationCleared: 'تم مسح المحادثة بنجاح',
      errorClearing: 'خطأ أثناء مسح المحادثة'
    },
  };

  useEffect(() => {
    if (isOpen && isFirstOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          content: translations[language].welcomeMessage,
          role: 'assistant',
          timestamp: new Date(),
        },
      ]);
      setIsFirstOpen(false);
    }
  }, [isOpen, language, messages.length, isFirstOpen, user?.name]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isOpen || hasLoadedHistory) return;
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/chatbot/history', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.chat_history && response.data.chat_history.length > 0) {
          const processedHistory: Message[] = [];
          response.data.chat_history.forEach((msg: any) => {
            processedHistory.push({
              id: `user-${msg.id}`,
              content: msg.message,
              role: 'user' as MessageRole,
              timestamp: new Date(msg.created_at),
            });
            const hasFollowUp = msg.follow_up_question && msg.follow_up_question.length > 0;
            const mainResponse = hasFollowUp 
              ? msg.response.replace(msg.follow_up_question, '').trim() 
              : msg.response;
            processedHistory.push({
              id: msg.id.toString(),
              content: mainResponse,
              role: 'assistant' as MessageRole,
              timestamp: new Date(msg.created_at),
              book_recommendations: msg.book_recommendations,
              article_recommendations: msg.article_recommendations,
              follow_up_question: msg.follow_up_question
            });
            if (hasFollowUp) {
              processedHistory.push({
                id: `follow-up-${msg.id}`,
                content: msg.follow_up_question,
                role: 'assistant' as MessageRole,
                timestamp: new Date(new Date(msg.created_at).getTime() + 100),
              });
            }
          });
          processedHistory.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          setMessages(processedHistory);
          setIsFirstOpen(false);
        } else if (messages.length === 0) {
          setMessages([
            {
              id: 'welcome',
              content: translations[language].welcomeMessage,
              role: 'assistant',
              timestamp: new Date(),
            },
          ]);
        }
        setHasLoadedHistory(true);
      } catch (error) {
        console.error('Error fetching chat history:', error);
        if (messages.length === 0) {
          setMessages([
            {
              id: 'welcome',
              content: translations[language].welcomeMessage,
              role: 'assistant',
              timestamp: new Date(),
            },
          ]);
        }
        setHasLoadedHistory(true);
      }
    };
    fetchHistory();
  }, [isOpen, language, hasLoadedHistory, messages.length]);

  const toggleChat = () => {
    if (!isOpen && !isAuthenticated) {
      toast.error(translations[language].authError);
      return;
    }
    if (!isOpen) {
      setHasLoadedHistory(false);
    }
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || !isAuthenticated) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
    };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputValue('');
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/chatbot/message',
        { message: userMessage.content, language },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const mappedBookRecommendations = response.data.recommended_books ? 
        response.data.recommended_books.map((book: any) => ({
          id: parseInt(book.id || '0') || 0,
          title: book.title || '',
          author: book.author || '',
          category: book.category || '',
          rating: book.rating || 0,
          cover_url: book.cover_url || '',
          reason: book.reason || ''
        })) : [];
      const mappedArticleRecommendations = response.data.recommended_articles ? 
        response.data.recommended_articles.map((article: any) => ({
          id: parseInt(article.id || '0') || 0,
          slug: article.slug || '',
          title: article.title || '',
          author: article.author || '',
          category: article.category || '',
          summary: article.summary || '',
          pdf_url: article.pdf_url || '',
          cover_image_url: article.cover_image_url || '',
          read_time: article.read_time || 5,
          views: article.views || 0,
          likes: article.likes || 0,
          reason: article.reason || ''
        })) : [];
      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: Date.now().toString(),
          content: response.data.response.replace(response.data.follow_up_question, '').trim(),
          role: 'assistant',
          timestamp: new Date(),
          book_recommendations: mappedBookRecommendations,
          article_recommendations: mappedArticleRecommendations,
          follow_up_question: response.data.follow_up_question,
        },
      ]);
      if (response.data.follow_up_question) {
        setTimeout(() => {
          setMessages(prevMessages => [
            ...prevMessages,
            {
              id: `follow-up-${Date.now().toString()}`,
              content: response.data.follow_up_question,
              role: 'assistant',
              timestamp: new Date(Date.now() + 500),
            },
          ]);
        }, 1000);
      }
    } catch (error) {
      console.error('Error sending message to chatbot:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast.error(translations[language].authError);
        setIsOpen(false);
      } else {
        toast.error('Failed to get a response. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = (lang: LanguageOption) => {
    setLanguage(lang);
  };

  const handleClearConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/chatbot/clear', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages([
        {
          id: 'welcome',
          content: translations[language].welcomeMessage,
          role: 'assistant',
          timestamp: new Date(),
        },
      ]);
      setIsFirstOpen(true);
      toast.success(translations[language].conversationCleared);
    } catch (error) {
      console.error('Error clearing conversation:', error);
      toast.error(translations[language].errorClearing);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleBookClick = (bookId: number) => {
    navigate(`/book/${bookId}`);
  };

  const handleArticleClick = (slug: string) => {
    navigate(`/articles/${slug}`);
  };

  const chatbotVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: 'spring', damping: 25, stiffness: 500 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8, 
      y: 20,
      transition: { duration: 0.2 }
    }
  };

  const buttonVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.1 },
    tap: { scale: 0.95 }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <motion.button
        className="fixed bottom-6 right-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full p-4 shadow-lg z-50"
        onClick={toggleChat}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        variants={buttonVariants}
        aria-label="Open chat"
      >
        <MessageSquareText className="h-6 w-6" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-20 right-6 w-80 sm:w-96 bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/50 flex flex-col overflow-hidden z-50"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={chatbotVariants}
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center">
              <div className="flex items-center">
                <MessageSquareText className="h-5 w-5 text-white mr-2" />
                <h3 className="text-white font-medium">AYO+ Assistant</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  className="text-gray-300 hover:text-white p-1 rounded-full hover:bg-indigo-700 transition-colors"
                  onClick={handleClearConversation}
                  title={translations[language].clearConversation}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button 
                  className={`text-sm ${language === 'en' ? 'text-white font-semibold' : 'text-gray-300'} hover:text-white p-1 rounded-full hover:bg-indigo-700 transition-colors`}
                  onClick={() => handleLanguageChange('en')}
                  title="English"
                >
                  EN
                </button>
                <button 
                  className={`text-sm ${language === 'fr' ? 'text-white font-semibold' : 'text-gray-300'} hover:text-white p-1 rounded-full hover:bg-indigo-700 transition-colors`}
                  onClick={() => handleLanguageChange('fr')}
                  title="Français"
                >
                  FR
                </button>
                <button 
                  className={`text-sm ${language === 'ar' ? 'text-white font-semibold' : 'text-gray-300'} hover:text-white p-1 rounded-full hover:bg-indigo-700 transition-colors`}
                  onClick={() => handleLanguageChange('ar')}
                  title="العربية"
                >
                  AR
                </button>
                <button 
                  onClick={toggleChat}
                  className="text-gray-300 hover:text-white p-1 rounded-full hover:bg-indigo-700 transition-colors"
                  aria-label="Close chat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div 
              className={`flex-1 overflow-y-auto p-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}
              style={{ 
                direction: language === 'ar' ? 'rtl' : 'ltr', 
                maxHeight: '400px',
                '--markdown-img-max-width': '100px',
                '--markdown-img-max-height': '100px',
              } as React.CSSProperties}
            >
              {messages.map((message) => (
                <React.Fragment key={message.id}>
                  <div
                    className={`mb-4 ${message.role === 'user' ? 'flex flex-row-reverse' : 'flex'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl p-3 ${
                        message.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-gray-800/70 text-gray-200 rounded-tl-none'
                      }`}
                    >
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                      <div
                        className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-indigo-200' : 'text-gray-400'
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                  {message.role === 'assistant' && message.book_recommendations && message.book_recommendations.length > 0 && (
                    <div className="mb-4 flex">
                      <div className="max-w-[90%] w-full">
                        <BookRecommendations 
                          recommendations={message.book_recommendations} 
                          language={language} 
                          onBookClick={handleBookClick} 
                        />
                      </div>
                    </div>
                  )}
                  {message.role === 'assistant' && message.article_recommendations && message.article_recommendations.length > 0 && (
                    <div className="mb-4 flex">
                      <div className="max-w-[90%] w-full">
                        <ArticleRecommendations 
                          recommendations={message.article_recommendations} 
                          language={language} 
                          onArticleClick={handleArticleClick} 
                        />
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
              {isLoading && (
                <div className="flex mb-4">
                  <div className="bg-gray-800/70 text-gray-200 rounded-xl rounded-tl-none p-3">
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>{translations[language].sending}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-gray-700/50">
              <form onSubmit={handleSendMessage} className="flex">
                <textarea
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder={translations[language].placeholder}
                  className={`flex-1 bg-gray-800/50 text-white rounded-l-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 ${language === 'ar' ? 'text-right' : 'text-left'}`}
                  style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
                  disabled={isLoading}
                  rows={2}
                />
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-r-lg px-4 font-medium transition-colors disabled:bg-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                  disabled={isLoading || !inputValue.trim()}
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
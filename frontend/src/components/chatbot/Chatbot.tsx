import React, { useState, useRef, useEffect } from 'react';
import { MessageSquareText, Send, X, Loader2, Trash2 } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BookRecommendations, { BookRecommendation } from './BookRecommendation';

// Define a proper type for the role
type MessageRole = 'user' | 'assistant';

interface Message {
  id: string;
  content: string;
  role: MessageRole;
  timestamp: Date;
  book_recommendations?: BookRecommendation[];
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
      placeholder: 'Ask me about books...',
      welcomeMessage: `Hello, ${user?.name || 'User'}! I'm AYO+, your library assistant. I can help you find book recommendations, answer questions about our library, or assist with borrowing books. How can I assist you today?`,
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
      placeholder: 'Posez-moi des questions sur les livres...',
      welcomeMessage: `Bonjour, ${user?.name || 'Utilisateur'} ! Je suis AYO+, votre assistant de bibliothèque. Je peux vous aider à trouver des recommandations de livres, répondre à des questions sur notre bibliothèque ou vous aider à emprunter des livres. Comment puis-je vous aider aujourd'hui ?`,
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
      placeholder: 'اسألني عن الكتب...',
      welcomeMessage: `مرحبًا، ${user?.name || 'مستخدم'}! أنا AYO+، مساعد المكتبة الخاص بك. يمكنني مساعدتك في العثور على توصيات الكتب، والإجابة على الأسئلة حول مكتبتنا، أو المساعدة في استعارة الكتب. كيف يمكنني مساعدتك اليوم؟`,
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
  
  // This effect adds welcome message only on first open or after clearing chat
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
  
  // Load chat history only when the chat is opened
  useEffect(() => {
    if (!isOpen || hasLoadedHistory) return;
    
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/chatbot/history', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.data.chat_history && response.data.chat_history.length > 0) {
          // Process history to include both user and assistant messages
          const processedHistory: Message[] = [];
          
          response.data.chat_history.forEach((msg: any) => {
            // Add the user message first
            processedHistory.push({
              id: `user-${msg.id}`,
              content: msg.message,
              role: 'user' as MessageRole,
              timestamp: new Date(msg.created_at),
            });
            
            // Then add the assistant response
            processedHistory.push({
              id: msg.id.toString(),
              content: msg.response,
              role: 'assistant' as MessageRole,
              timestamp: new Date(msg.created_at),
              book_recommendations: msg.book_recommendations,
            });
          });
          
          // Sort by timestamp in ascending order
          processedHistory.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          
          setMessages(processedHistory);
          setIsFirstOpen(false); // We already have history, don't show welcome
        } else if (messages.length === 0) {
          // If no history and no messages, show welcome message
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
        // If error loading history, at least show welcome message
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
      // When opening, set hasLoadedHistory to false to trigger reload if needed
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
      
      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: Date.now().toString(),
          content: response.data.response,
          role: 'assistant',
          timestamp: new Date(),
          book_recommendations: response.data.book_recommendations,
        },
      ]);
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
      
      // Reset the first open state so welcome message appears after clearing
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
              style={{ direction: language === 'ar' ? 'rtl' : 'ltr', maxHeight: '400px' }}
            >
              {messages.map((message) => (
                <React.Fragment key={message.id}>
                  {/* Message bubble */}
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
                      <p>{message.content}</p>
                      <div
                        className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-indigo-200' : 'text-gray-400'
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Book recommendations */}
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
                </React.Fragment>
              ))}
              
              {/* Loading indicator */}
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
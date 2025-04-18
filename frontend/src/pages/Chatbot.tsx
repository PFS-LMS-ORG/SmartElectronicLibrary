import React, { useState, useRef, useEffect } from 'react';
import { MessageSquareText, Send, X, Loader2} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext'; // Import the auth context

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<'en' | 'fr' | 'ar'>('en');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth(); // Get authentication status
  
  // Translations for UI elements
  const translations = {
    en: {
      placeholder: 'Ask me about books...',
      welcomeMessage: 'Hello! I can help you find book recommendations, answer questions about our library, or provide reading suggestions. How can I assist you today?',
      sending: 'Sending...',
      send: 'Send',
      authError: 'You need to be logged in to use the chatbot.'
    },
    fr: {
      placeholder: 'Posez-moi des questions sur les livres...',
      welcomeMessage: 'Bonjour ! Je peux vous aider à trouver des recommandations de livres, répondre à des questions sur notre bibliothèque ou vous suggérer des lectures. Comment puis-je vous aider aujourd\'hui ?',
      sending: 'Envoi en cours...',
      send: 'Envoyer',
      authError: 'Vous devez être connecté pour utiliser le chatbot.'
    },
    ar: {
      placeholder: 'اسألني عن الكتب...',
      welcomeMessage: 'مرحبًا! يمكنني مساعدتك في العثور على توصيات الكتب، والإجابة على الأسئلة حول مكتبتنا، أو تقديم اقتراحات للقراءة. كيف يمكنني مساعدتك اليوم؟',
      sending: 'جاري الإرسال...',
      send: 'إرسال',
      authError: 'يجب أن تكون مسجل الدخول لاستخدام روبوت المحادثة.'
    },
  };

  // Add welcome message when chat is opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: '1',
          content: translations[language].welcomeMessage,
          role: 'assistant',
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, language, messages.length]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleChat = () => {
    // Only allow opening chat if authenticated
    if (!isOpen && !isAuthenticated) {
      toast.error(translations[language].authError);
      return;
    }
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      // Get the token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Call chatbot API with language parameter and auth token
      const response = await axios.post('/api/chatbot/message', 
        {
          message: userMessage.content,
          language: language,
        },
        {
          headers: { 
            Authorization: `Bearer ${token}` 
          }
        }
      );
      
      // Add response to messages
      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: Date.now().toString(),
          content: response.data.response,
          role: 'assistant',
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Error sending message to chatbot:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast.error(translations[language].authError);
        setIsOpen(false); // Close the chat on auth error
      } else {
        toast.error('Failed to get a response. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = (lang: 'en' | 'fr' | 'ar') => {
    setLanguage(lang);
    // Clear previous messages when changing language
    setMessages([]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Animation variants
  const chatbotVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { 
        type: 'spring',
        damping: 25,
        stiffness: 500
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8, 
      y: 20,
      transition: { 
        duration: 0.2 
      }
    }
  };

  const buttonVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.1 },
    tap: { scale: 0.95 }
  };

  // Only show the chatbot button if user is authenticated
  if (!isAuthenticated) return null;

  return (
    <>
      {/* Floating button */}
      <motion.button
        className="fixed bottom-6 right-6 bg-gradient-to-r from-amber-500 to-amber-600 text-gray-900 rounded-full p-4 shadow-lg z-50"
        onClick={toggleChat}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        variants={buttonVariants}
        aria-label="Open chat"
      >
        <MessageSquareText className="h-6 w-6" />
      </motion.button>

      {/* Chatbot modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-20 right-6 w-80 sm:w-96 bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/50 flex flex-col overflow-hidden z-50"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={chatbotVariants}
          >
            {/* Chat header */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700/50 p-4 flex justify-between items-center">
              <div className="flex items-center">
                <MessageSquareText className="h-5 w-5 text-amber-400 mr-2" />
                <h3 className="text-white font-medium">LMSENSA+ Assistant</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button 
                    className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700/50 transition-colors"
                    onClick={() => handleLanguageChange('en')}
                    title="English"
                  >
                    {language === 'en' ? (
                      <span className="text-amber-400 font-medium">EN</span>
                    ) : (
                      <span>EN</span>
                    )}
                  </button>
                </div>
                <div>
                  <button 
                    className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700/50 transition-colors"
                    onClick={() => handleLanguageChange('fr')}
                    title="Français"
                  >
                    {language === 'fr' ? (
                      <span className="text-amber-400 font-medium">FR</span>
                    ) : (
                      <span>FR</span>
                    )}
                  </button>
                </div>
                <div>
                  <button 
                    className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700/50 transition-colors"
                    onClick={() => handleLanguageChange('ar')}
                    title="العربية"
                  >
                    {language === 'ar' ? (
                      <span className="text-amber-400 font-medium">AR</span>
                    ) : (
                      <span>AR</span>
                    )}
                  </button>
                </div>
                <button 
                  onClick={toggleChat}
                  className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700/50 transition-colors"
                  aria-label="Close chat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Chat messages */}
            <div 
              className={`flex-1 overflow-y-auto p-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}
              style={{ direction: language === 'ar' ? 'rtl' : 'ltr', maxHeight: '400px' }}
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 ${
                    message.role === 'user'
                      ? 'flex flex-row-reverse'
                      : 'flex'
                  }`}
                >
                  <div
                    className={`max-w-3/4 rounded-xl p-3 ${
                      message.role === 'user'
                        ? 'bg-amber-600 text-gray-900 rounded-tr-none'
                        : 'bg-gray-800 text-white rounded-tl-none'
                    }`}
                  >
                    <p>{message.content}</p>
                    <div
                      className={`text-xs mt-1 ${
                        message.role === 'user'
                          ? 'text-amber-200'
                          : 'text-gray-400'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex mb-4">
                  <div className="bg-gray-800 text-white rounded-xl rounded-tl-none p-3">
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>{translations[language].sending}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat input */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-700/50">
              <div className="flex">
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder={translations[language].placeholder}
                  className={`flex-1 bg-gray-800 border border-gray-700 rounded-l-lg py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-amber-500 ${language === 'ar' ? 'text-right' : 'text-left'}`}
                  style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-gray-900 rounded-r-lg px-4 font-medium transition-colors disabled:bg-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                  disabled={isLoading || !inputValue.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;

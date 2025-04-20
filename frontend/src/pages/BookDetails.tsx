import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Star, Clock, Users, Book, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify"; // Add react-toastify for notifications

interface Book {
  id: number;
  title: string;
  cover_url: string;
  description: string;
  rating: number;
  summary: string;
  authors: string[];
  categories: string[];
  borrow_count: number;
  total_books: number;
  available_books: number;
}

interface RentalRequest {
  id: number;
  book_id: number;
  status: "pending" | "approved" | "rejected";
}

const BookDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [relatedBooks, setRelatedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [userRequest, setUserRequest] = useState<RentalRequest | null>(null); // Track user's request
  const [borrowLoading, setBorrowLoading] = useState(false); // Track borrow action
  const { isAuthenticated, isLoading: isAuthLoading, logout, user } = useAuth();
  const [activeRental, setActiveRental] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthLoading) return;
  
    if (!isAuthenticated) {
      console.log("User not authenticated, redirecting to login");
      navigate("/login");
      return;
    }
  
    const fetchBookAndRequest = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No token found");
        }
  
        // Fetch book details
        console.log("Fetching book with token:", token.slice(0, 20) + "...");
        const bookResponse = await axios.get(`/api/books/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("Book response:", bookResponse.data);
        setBook(bookResponse.data);
  
        // Fetch user's rental request for this book
        const requestResponse = await axios.get(`/api/rental_requests/my_requests?page=1&per_page=10`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const requests = requestResponse.data.requests;
        const existingRequest = requests.find(
          (req: RentalRequest) => req.book_id === Number(id) && req.status === "pending"
        );
        setUserRequest(existingRequest || null);
  
        // Check if the user currently has this book rented
        await checkRentalStatus();
  
        // Fetch related books
        fetchRelatedBooks(bookResponse.data.categories, bookResponse.data.id);
      } catch (error: any) {
        console.error("Error fetching data:", error.response?.data || error.message);
        if (error.response?.status === 401) {
          console.log("Unauthorized: Logging out and redirecting to login");
          logout();
          localStorage.removeItem("token");
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };
  
    fetchBookAndRequest();
  }, [id, isAuthenticated, isAuthLoading, logout, navigate, user?.id]);

  const checkRentalStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No token found");
      }
  
      // First check if user has the book rented
      const rentalResponse = await axios.get(`/api/rentals/specific_rental/${user?.id}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // If we got a response, the user has rented this book before
      console.log("Rental status response:", rentalResponse.data);
      
      // Check if the book is still with the user (returned_at is null)
      if (rentalResponse.data && rentalResponse.data.returned_at === null) {
        setActiveRental(rentalResponse.data);
      } else {
        setActiveRental(null);
      }
    } catch (error: any) {
      // 404 is expected if the user has never rented this book
      if (error.response?.status !== 404) {
        console.error("Error checking rental status:", error.response?.data || error.message);
      }
      setActiveRental(null);
    }
  };

  const fetchRelatedBooks = async (categories: string[], bookId: number) => {
    setRelatedLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No token found");
      }

      const categoryParams = categories.map((c) => `category=${encodeURIComponent(c)}`).join("&");
      const response = await axios.get(`/api/books/related?${categoryParams}&exclude=${bookId}&limit=4`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Related books response:", response.data);
      setRelatedBooks(response.data);
    } catch (error: any) {
      console.error("Error fetching related books:", error.response?.data || error.message);
    } finally {
      setRelatedLoading(false);
    }
  };

  const handleBorrow = async () => {
    if (!book || borrowLoading) return;

    setBorrowLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No token found");
      }

      const response = await axios.post(
        "/api/rental_requests",
        { book_id: book.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Rental request response:", response.data);

      // Update userRequest state
      setUserRequest({ id: response.data.id, book_id: book.id, status: "pending" });

      

      toast.success("Rental request created successfully! Awaiting admin approval.");
    } catch (error: any) {
      console.error("Error creating rental request:", error.response?.data || error.message);
      const errorMsg = error.response?.data?.error || "Failed to create rental request.";
      toast.error(errorMsg);
      if (error.response?.status === 401) {
        logout();
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setBorrowLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const navigateToBook = (bookId: number) => {
    navigate(`/book/${bookId}`);
  };

  // Loading state with animated skeleton
  if (loading || isAuthLoading) return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 flex justify-center">
            <div className="w-64 h-96 bg-gray-800 rounded-lg animate-pulse"></div>
          </div>
          <div className="lg:col-span-8">
            <div className="h-12 bg-gray-800 rounded-lg animate-pulse mb-4 w-3/4"></div>
            <div className="h-6 bg-gray-800 rounded-lg animate-pulse mb-8 w-1/2"></div>
            <div className="h-32 bg-gray-800 rounded-lg animate-pulse mb-6"></div>
            <div className="h-24 bg-gray-800 rounded-lg animate-pulse mb-6"></div>
            <div className="h-12 bg-gray-800 rounded-lg animate-pulse w-40"></div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!book) return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-6 py-12 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Book className="w-20 h-20 text-gray-600 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Book Not Found</h1>
          <p className="text-gray-400 mb-8">The book you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={handleGoBack}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium transition-colors duration-300"
          >
            Go Back
          </button>
        </motion.div>
      </div>
    </div>
  );

  // Book gradient colors based on categories
  const gradientColors = {
    "Fiction": "from-blue-600 to-purple-600",
    "Non-Fiction": "from-emerald-600 to-teal-600",
    "Mystery": "from-purple-600 to-pink-600",
    "Science Fiction": "from-cyan-600 to-blue-600",
    "Romance": "from-pink-600 to-red-600",
    "Biography": "from-amber-600 to-orange-600",
    "History": "from-lime-600 to-emerald-600",
    "default": "from-indigo-600 to-purple-600"
  };

  const getGradient = () => {
    if (!book.categories.length) return gradientColors.default;
    const category = book.categories[0];
    return gradientColors[category as keyof typeof gradientColors] || gradientColors.default;
  };

  const tabVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-900 text-white"
    >
      {/* Top color gradient bar */}
      <div className={`h-2 w-full bg-gradient-to-r ${getGradient()}`}></div>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        {/* Back Button */}
        <motion.button
          whileHover={{ x: -5 }}
          onClick={handleGoBack}
          className="flex items-center text-gray-400 hover:text-white mb-8 transition-colors duration-300"
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Back to Books
        </motion.button>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column - Book Cover */}
          <motion.div
            className="lg:col-span-4 flex flex-col items-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Book Cover with Hover Effect */}
            <motion.div
              className="relative mb-6 group"
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <img
                src={book.cover_url}
                alt={book.title}
                className="w-80 h-auto rounded-xl shadow-2xl object-cover z-10 relative"
              />
              {/* Backdrop glow effect */}
              <div
                className={`absolute -inset-2 bg-gradient-to-r ${getGradient()} rounded-xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-500 z-0`}
              ></div>
            </motion.div>

            {/* Book Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="w-full max-w-sm bg-gray-800/50 backdrop-blur-md rounded-lg p-4 border border-gray-700/30 grid grid-cols-3 gap-2 text-center"
            >
              <div className="flex flex-col items-center">
                <div className="bg-gray-700/50 rounded-full w-10 h-10 flex items-center justify-center mb-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                </div>
                <span className="text-lg font-bold">{book.rating.toFixed(1)}</span>
                <span className="text-xs text-gray-400">Rating</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-gray-700/50 rounded-full w-10 h-10 flex items-center justify-center mb-2">
                  <Clock className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-lg font-bold">{book.available_books}</span>
                <span className="text-xs text-gray-400">Available</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-gray-700/50 rounded-full w-10 h-10 flex items-center justify-center mb-2">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-lg font-bold">{book.borrow_count}</span>
                <span className="text-xs text-gray-400">Borrowed</span>
              </div>
            </motion.div>

            {/* Borrow Button */}
            <motion.button
              className={`mt-6 w-full max-w-sm py-4 px-6 rounded-lg font-medium text-lg relative overflow-hidden group ${
                book.available_books === 0 || activeRental || userRequest?.status === "pending" || borrowLoading
                  ? "bg-gray-600 cursor-not-allowed"
                  : ""
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              onClick={handleBorrow}
              whileHover={{ scale: book.available_books === 0 || activeRental || userRequest?.status === "pending" || borrowLoading ? 1 : 1.02 }}
              whileTap={{ scale: book.available_books === 0 || activeRental || userRequest?.status === "pending" || borrowLoading ? 1 : 0.98 }}
              disabled={book.available_books === 0 || activeRental || userRequest?.status === "pending" || borrowLoading}
            >
              {/* Button background with gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${
                  book.available_books === 0 || activeRental || userRequest?.status === "pending" || borrowLoading ? "bg-gray-600" : getGradient()
                } transition-transform duration-500`}
    ></div>

  {/* Button hover animation */}
  <div
    className={`absolute inset-0 opacity-0 ${
      book.available_books === 0 || activeRental || userRequest?.status === "pending" || borrowLoading ? "" : "group-hover:opacity-30"
    } bg-white transition-opacity duration-500`}
  ></div>

  {/* Button text */}
  <span className="relative z-10">
    {borrowLoading
      ? "Requesting..."
      : activeRental
      ? "Currently Borrowed"
      : userRequest?.status === "pending"
      ? "Request Pending"
      : book.available_books === 0
      ? "Not Available"
      : "Borrow Now"}
  </span>
</motion.button>
          </motion.div>

          {/* Right Column - Book Details */}
          <motion.div
            className="lg:col-span-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Title and Authors */}
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
              {book.title}
            </h1>
            {/* Authors in stylish boxes */}
            <div className="flex flex-wrap gap-2 mb-6">
              {book.authors.map((author, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.05, y: -3 }}
                  className={`px-4 py-2 rounded-lg bg-gradient-to-br ${getGradient()} bg-opacity-20 backdrop-blur-md border border-gray-700/30`}
                >
                  <span className="font-medium text-white">{author}</span>
                </motion.div>
              ))}
            </div>
            {/* Categories */}
            <div className="mb-8">
              <div className="flex flex-wrap gap-2 mt-2">
                {book.categories.map((category, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                    whileHover={{ y: -2 }}
                    className="px-3 py-1 bg-gray-800/60 text-gray-200 text-xs rounded-full border border-gray-700/40 hover:border-gray-600 transition-colors duration-300"
                  >
                    {category}
                  </motion.span>
                ))}
              </div>
            </div>
            {/* Tab Navigation */}
            <div className="border-b border-gray-700/50 mb-6">
              <div className="flex space-x-6">
                {["overview", "summary", "details"].map((tab) => (
                  <button
                    key={tab}
                    className={`pb-3 px-2 relative ${
                      activeTab === tab ? "text-white font-medium" : "text-gray-400 hover:text-gray-200"
                    } transition-colors duration-300 capitalize`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="activeTab"
                        className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${getGradient()}`}
                      ></motion.div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            {/* Tab Content */}
            <div className="min-h-56">
              <AnimatePresence mode="wait">
                {activeTab === "overview" && (
                  <motion.div
                    key="overview"
                    variants={tabVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="prose prose-invert max-w-none"
                  >
                    <p className="text-gray-200 leading-relaxed font-light text-lg">
                      {book.description}
                    </p>
                  </motion.div>
                )}
                {activeTab === "summary" && (
                  <motion.div
                    key="summary"
                    variants={tabVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                  >
                    <div className="p-6 bg-gray-800/40 rounded-xl backdrop-blur-sm border border-gray-700/30">
                      <h3 className="text-xl font-semibold mb-4 text-gray-100">Summary</h3>
                      <p className="text-gray-300 leading-relaxed">
                        {book.summary || "No summary available for this book."}
                      </p>
                    </div>
                  </motion.div>
                )}
                {activeTab === "details" && (
                  <motion.div
                    key="details"
                    variants={tabVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                  >
                    <div className="p-6 bg-gray-800/40 rounded-xl backdrop-blur-sm border border-gray-700/30">
                      <h3 className="text-lg font-medium mb-4">Book Information</h3>
                      <ul className="space-y-3">
                        <li className="flex justify-between">
                          <span className="text-gray-400">ID:</span>
                          <span>{book.id}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-gray-400">Total Books:</span>
                          <span>{book.total_books}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-gray-400">Available:</span>
                          <span>{book.available_books}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-gray-400">Borrow Count:</span>
                          <span>{book.borrow_count}</span>
                        </li>
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Similar Books Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="mt-12"
            >
              <h3 className="text-xl font-medium mb-6">You might also like</h3>
              {relatedLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-gray-800/40 rounded-lg overflow-hidden animate-pulse">
                      <div className="h-36 bg-gray-700"></div>
                      <div className="p-3">
                        <div className="h-4 w-3/4 bg-gray-700 rounded mb-2"></div>
                        <div className="h-3 w-1/2 bg-gray-700 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : relatedBooks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {relatedBooks.map((relatedBook) => (
                    <motion.div
                      key={relatedBook.id}
                      whileHover={{ y: -5 }}
                      className="bg-gray-800/40 rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => navigateToBook(relatedBook.id)}
                    >
                      <div className="h-48 bg-gray-700 relative">
                        <img
                          src={relatedBook.cover_url}
                          alt={relatedBook.title}
                          className="w-full h-full object-cover absolute inset-0"
                        />
                      </div>
                      <div className="p-3">
                        <h4 className="font-medium text-sm line-clamp-1">{relatedBook.title}</h4>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                          {relatedBook.authors.join(", ")}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-800/40 rounded-lg p-6 text-center">
                  <p className="text-gray-400">No related books found.</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default BookDetails;
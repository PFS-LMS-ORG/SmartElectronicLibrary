import React, { useState, ChangeEvent, useRef, FormEvent, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BookGallery from '../components/catalog/BookGallery';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

import { 
  loginSchema, 
  LoginFormData, 
  validateWithZod,
  FormErrors 
} from '../utils/validationSchemas';


const LibraryLoginPage: React.FC = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const { isAuthenticated,login } = useAuth();
  const navigate = useNavigate();

  // This useEffect will help us debug re-renders
  useEffect(() => {
    console.log("LibraryLoginPage rendered or re-rendered");
    console.log("Current errors state:", errors);
    
    // Cleanup function to track unmounting
    return () => {
      console.log("LibraryLoginPage component unmounting");
    };
  }, [errors]);

  const validateForm = (): boolean => {
    // Only check if user has attempted to submit
    if (!attemptedSubmit) {
      return false;
    }
    
    return validateWithZod(loginSchema, formData, (newErrors) => {
      setErrors(prev => ({
        ...prev,
        ...newErrors
      }));
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    // Always prevent default to stop browser form submission
    e.preventDefault();
    e.stopPropagation(); // Also stop propagation to prevent bubbling

    // Set flag to show we've attempted a submit (will show validation errors)
    setAttemptedSubmit(true);
    
    // Validate form
    const isValid = validateForm();
    if (!isValid) {
      console.log("Form validation failed");
      return; // Stop here if validation fails
    }

    // Proceed with submission
    try {
      setIsSubmitting(true);
      console.log('Submitting login:', formData.email);
      
      await login(formData.email, formData.password);
      console.log('Login successful, navigating to home');
      navigate('/');
    } catch (error: any) {
      console.error('Login failed:', error.response?.data || error.message);
      
      // Handle different error formats
      let errorMessage = 'Login failed';
      
      if (error.response && error.response.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
          
          // Check for the specific error message
          if (errorMessage === 'Your account is pending admin approval') {
            // Add the toast notification HERE
            toast.info('Your account is awaiting admin approval. Please check your email for updates.', {
              autoClose: 5000,
              position: "top-center"
            });
            
            errorMessage = 'Your account registration is pending admin approval. Please check your email for updates.';
          }
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Update errors state with server error
      setErrors(prev => ({
        ...prev,
        server: errorMessage
      }));
      
      console.log("Updated errors with server message:", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
    
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear respective error when user types
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };


  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="w-full md:w-2/5 flex items-center justify-center p-8 relative">
        {/* Abstract background patterns */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="w-full max-w-md relative z-10 backdrop-blur-sm bg-gray-900/80 p-8 rounded-2xl shadow-2xl border border-gray-800">
          <div className="text-white mb-8">
            {/* <div className="flex items-center mb-4">
              <svg className="w-8 h-8 mr-3 text-amber-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">LMSENSA+</h1>
            </div> */}
            <h2 className="text-2xl font-medium mt-8 mb-3">Welcome back</h2>
            <p className="text-gray-400 text-sm">Access the vast collection of books that will inspire you</p>
          </div>

          {/* The key is to make sure this form doesn't have any action or method attributes */}
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" noValidate>
            {errors.server && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 mb-4">
                <p className="text-red-500 text-sm flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                  </svg>
                  {errors.server}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className={`w-full bg-gray-800/70 text-white rounded-lg py-3 pl-10 pr-3 border focus:ring-2 focus:outline-none transition-all duration-300 ${
                    errors.email 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' 
                      : 'border-gray-700 focus:border-amber-500 focus:ring-amber-500/30'
                  }`}
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className={`w-full bg-gray-800/70 text-white rounded-lg py-3 pl-10 pr-3 border focus:ring-2 focus:outline-none transition-all duration-300 ${
                    errors.password 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' 
                      : 'border-gray-700 focus:border-amber-500 focus:ring-amber-500/30'
                  }`}
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                />
              </div>
              {errors.password && (
                <p id="password-error" className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <input id="remember" type="checkbox" className="h-4 w-4 text-amber-500 rounded border-gray-700 bg-gray-800 focus:ring-amber-500" />
                <label htmlFor="remember" className="ml-2 block text-gray-400">Remember me</label>
              </div>
              <a href="#" className="text-amber-400 hover:text-amber-300 transition-colors duration-300">Forgot password?</a>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium py-3 px-4 rounded-lg transition duration-300 shadow-lg shadow-amber-500/20 flex items-center justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 mr-2 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Logging in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <div className="text-center text-gray-400 text-sm mt-6">
              <Link
                to="/register" 
                className="text-blue-400 hover:text-blue-300 transition duration-300"
              >
                Don't have an account? <span className="font-medium">Register here</span>
              </Link>
            </div>
          </form>
        </div>
      </div>

      <BookGallery />
    </div>
  );
};

export default LibraryLoginPage;
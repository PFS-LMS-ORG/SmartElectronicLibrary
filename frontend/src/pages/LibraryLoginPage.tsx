import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import BookGallery from '../components/catalog/BookGallery';
import { useAuth } from '../context/AuthContext';

interface FormErrors {
  email?: string;
  password?: string;
  server?: string;
}

const LibraryLoginPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false); // Track login request
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (validateForm()) {
      setIsSubmitting(true); // Start spinner
      console.log('Submitting login:', email);
      try {
        await login(email, password);
        console.log('Login successful, navigating to home');
        navigate('/');
      } catch (error: any) {
        console.error('Login failed:', error.response?.data || error.message);
        setErrors({ server: error.response?.data?.message || 'Login failed' });
      } finally {
        setIsSubmitting(false); // Stop spinner
      }
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
  };

  return (
    <div className="flex h-screen w-full bg-gray-100">
      <div className="w-full md:w-2/5 flex items-center justify-center bg-gray-900 p-8">
        <div className="w-full max-w-md">
          <div className="text-white mb-8">
            <div className="flex items-center mb-4">
              <svg className="w-8 h-8 mr-3 text-amber-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">LMSENSA+</h1>
            </div>
            <h2 className="text-2xl font-medium mt-8 mb-3">Welcome back</h2>
            <p className="text-gray-400 text-sm">Access the vast collection of books that will inspire you</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.server && <p className="text-red-500 text-sm">{errors.server}</p>}
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="Email address"
                className={`w-full bg-gray-800 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border border-red-500' : ''}`}
                value={email}
                onChange={handleEmailChange}
                disabled={isSubmitting}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Password"
                className={`w-full bg-gray-800 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border border-red-500' : ''}`}
                value={password}
                onChange={handlePasswordChange}
                disabled={isSubmitting}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-medium py-3 px-4 rounded transition duration-300 flex items-center justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 mr-2 text-gray-900"
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
                'Login'
              )}
            </button>

            <div className="text-center text-gray-400 text-sm">
              <a href="/register" className="hover:text-blue-400 transition duration-300">Don't have an account? Register here</a>
            </div>
          </form>
        </div>
      </div>

      <BookGallery />
    </div>
  );
};

export default LibraryLoginPage;
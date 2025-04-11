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
      try {
        await login(email, password);
        navigate('/'); // Redirect to home after successful login
      } catch (error: any) {
        setErrors({ server: error.response?.data?.message || 'Login failed' });
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
      {/* Left panel with login form */}
      <div className="w-full md:w-2/5 flex items-center justify-center bg-gray-900 p-8">
        <div className="w-full max-w-md">
          <div className="text-white mb-8">
            <div className="flex items-center mb-2">
              <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
              <h1 className="text-2xl font-bold">LMSENSA+</h1>
            </div>
            <h2 className="text-xl font-medium mt-6 mb-2">Welcome back to LMSENSA+</h2>
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
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-medium py-3 px-4 rounded transition duration-300"
            >
              Login
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
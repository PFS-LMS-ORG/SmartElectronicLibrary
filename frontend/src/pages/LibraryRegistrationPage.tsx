import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import BookGallery from '../components/catalog/BookGallery';
import { register } from '../services/auth';

interface FormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  server?: string;
}

const LibraryRegistrationPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Track registration request
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!agreeTerms) {
      newErrors.terms = 'You must agree to the terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (validateForm()) {
      setIsSubmitting(true); // Start spinner
      console.log('Submitting registration:', formData.email);
      try {
        await register({
          name: formData.fullName,
          email: formData.email,
          password: formData.password,
        });
        console.log('Registration successful, navigating to login');
        navigate('/login');
      } catch (error: any) {
        console.error('Registration failed:', error.response?.data || error.message);
        setErrors({ server: error.response?.data?.message || 'Registration failed' });
      } finally {
        setIsSubmitting(false); // Stop spinner
      }
    }
  };

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
            <div className="flex items-center mb-4">
              <svg className="w-8 h-8 mr-3 text-amber-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">LMSENSA+</h1>
            </div>
            <h2 className="text-2xl font-medium mt-8 mb-3">Create Your Library Account</h2>
            <p className="text-gray-400 text-sm">Please complete all fields below to access our online library services</p>
          </div>


            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.server && (
                <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-sm flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                    </svg>
                    {errors.server}
                  </p>
                </div>
              )}
              
              <div>
                <label htmlFor="fullName" className="sr-only">Full Name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Full Name"
                  className={`w-full bg-gray-800/70 text-white rounded-lg py-3 pl-10 pr-3 border focus:ring-2 focus:outline-none transition-all duration-300 ${
                    errors.fullName
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' 
                      : 'border-gray-700 focus:border-amber-500 focus:ring-amber-500/30'
                  }`}
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label htmlFor="email" className="sr-only">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email address (e.g john.doe@example.com)"
                  className={`w-full bg-gray-800/70 text-white rounded-lg py-3 pl-10 pr-3 border focus:ring-2 focus:outline-none transition-all duration-300 ${
                    errors.email 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' 
                      : 'border-gray-700 focus:border-amber-500 focus:ring-amber-500/30'
                  }`}
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Password"
                  className={`w-full bg-gray-800/70 text-white rounded-lg py-3 pl-10 pr-3 border focus:ring-2 focus:outline-none transition-all duration-300 ${
                    errors.password
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' 
                      : 'border-gray-700 focus:border-amber-500 focus:ring-amber-500/30'
                  }`}
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm Password"
                  className={`w-full bg-gray-800/70 text-white rounded-lg py-3 pl-10 pr-3 border focus:ring-2 focus:outline-none transition-all duration-300 ${
                    errors.confirmPassword
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' 
                      : 'border-gray-700 focus:border-amber-500 focus:ring-amber-500/30'
                  }`}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>

              <div className="flex items-start">
                <input
                  id="terms"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 mt-1"
                  checked={agreeTerms}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setAgreeTerms(e.target.checked)}
                  disabled={isSubmitting}
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-400">
                  I accept the <a href="#" className="text-blue-400 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-400 hover:underline">Privacy Policy</a>
                </label>
              </div>
              {errors.terms && <p className="text-red-500 text-xs">{errors.terms}</p>}

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
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
              
              <div className="text-center text-gray-400 text-sm mt-6">
                <a href="/login" className="text-blue-400 hover:text-blue-300 transition duration-300">Already have an account? <span className="font-medium">Login here</span></a>
              </div>
            </form>
        </div>
      </div>

      <BookGallery />
    </div>
  );
};

export default LibraryRegistrationPage;
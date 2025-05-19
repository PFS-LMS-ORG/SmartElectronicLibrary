// LibraryRegistrationPage.tsx

import React, { useState, ChangeEvent, FormEvent, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BookGallery from '../components/catalog/BookGallery';
import { register } from '../services/auth';
import { toast } from 'react-toastify';
import { useAuth  } from '@/context/AuthContext';
import { 
  registrationSchema, 
  RegistrationFormData, 
  validateWithZod, 
  FormErrors,
  passwordRequirements
} from '../utils/validationSchemas';

const LibraryRegistrationPage: React.FC = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<RegistrationFormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    // First check if terms are agreed to
    if (!agreeTerms) {
      setErrors(prev => ({
        ...prev,
        terms: "You must agree to the terms"
      }));
      return false;
    }

    // Only check if user has attempted to submit
    if (!attemptedSubmit) {
      return true;
    }

    // Use the validateWithZod helper
    return validateWithZod(registrationSchema, formData, (newErrors) => {
      setErrors(prev => ({
        ...prev,
        ...newErrors
      }));
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();
    
    setAttemptedSubmit(true);
    
    if (validateForm()) {
      setIsSubmitting(true);
      console.log('Submitting registration:', formData.email);
      try {
        const response = await register({
          name: formData.fullName,
          email: formData.email,
          password: formData.password,
        });
        toast.success(response.message || 'Registration submitted, awaiting approval email.');
        navigate('/login');
      } catch (error: any) {
        console.error('Registration failed:', error.response?.data || error.message);
        toast.error(error.response?.data?.message || 'Registration failed, email not sent');
        
        // Handle different error formats
        let errorMessage = 'Registration failed';
        
        if (error.response && error.response.data) {
          if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setErrors(prev => ({
          ...prev,
          server: errorMessage
        }));
      } finally {
        setIsSubmitting(false);
      }
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

  const handleTermsChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setAgreeTerms(e.target.checked);
    
    // Clear terms error when checked
    if (e.target.checked && errors.terms) {
      setErrors(prev => ({
        ...prev,
        terms: undefined
      }));
    }
  };

  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    navigate('/'); // Redirect to home if already authenticated
    return null;
  }


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
            <h2 className="text-2xl font-medium mt-8 mb-3">Create Your Library Account</h2>
            <p className="text-gray-400 text-sm">Please complete all fields below to access our online library services</p>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
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
            
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 sr-only">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
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
                  aria-invalid={!!errors.fullName}
                  aria-describedby={errors.fullName ? "fullName-error" : undefined}
                />
              </div>
              {errors.fullName && <p id="fullName-error" className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 sr-only">Email address</label>
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
                  placeholder="Email address (e.g john.doe@example.com)"
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
              {errors.email && <p id="email-error" className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 sr-only">Password</label>
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
                  placeholder="Password"
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
              {errors.password && <p id="password-error" className="text-red-500 text-xs mt-1">{errors.password}</p>}
              {!errors.password && (
                <div className="mt-2">
                  <p className="text-gray-500 text-xs mb-1">Password must have:</p>
                  <ul className="space-y-1">
                    {passwordRequirements.map(req => {
                      const isMet = req.regex.test(formData.password);
                      return (
                        <li key={req.id} className="flex items-center text-xs">
                          <span className={`mr-1 ${isMet ? 'text-green-500' : 'text-gray-500'}`}>
                            {isMet ? '✓' : '○'}
                          </span>
                          <span className={isMet ? 'text-green-500' : 'text-gray-500'}>
                            {req.description}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 sr-only">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
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
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                />
              </div>
              {errors.confirmPassword && <p id="confirmPassword-error" className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            <div className="flex items-start">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                className={`h-4 w-4 mt-1 ${errors.terms ? 'border-red-500 focus:ring-red-500' : 'text-blue-600 focus:ring-blue-500'}`}
                checked={agreeTerms}
                onChange={handleTermsChange}
                disabled={isSubmitting}
                aria-invalid={!!errors.terms}
                aria-describedby={errors.terms ? "terms-error" : undefined}
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-400">
                I accept the <a href="#" className="text-blue-400 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-400 hover:underline">Privacy Policy</a>
              </label>
            </div>
            {errors.terms && <p id="terms-error" className="text-red-500 text-xs">{errors.terms}</p>}

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
              <Link 
                to="/login" 
                className="text-blue-400 hover:text-blue-300 transition duration-300"
                >
                  Already have an account? <span className="font-medium">Login here</span>
              </Link>
            </div>
          </form>
        </div>
      </div>

      <BookGallery />
    </div>
  );
};

export default LibraryRegistrationPage;
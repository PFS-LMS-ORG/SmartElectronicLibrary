import React, { useState } from 'react';
import BookGallery from "../components/catalog/BookGallery";

const LibraryRegistrationPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    cne: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.cne.trim()) {
      newErrors.cne = 'CNE is required';
    } else if (!/^[A-Z0-9]{10}$/i.test(formData.cne)) {
      newErrors.cne = 'CNE must be 10 alphanumeric characters';
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('Registration data:', formData);
      // Registration logic here (Later)
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-100">
      {/* Left panel with registration form */}
      <div className="w-full md:w-2/5 flex items-center justify-center bg-gray-900 p-8">
        <div className="w-full max-w-md">
          <div className="text-white mb-6">
            <div className="flex items-center mb-2">
              <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
              <h1 className="text-2xl font-bold">LMSENSA+</h1>
            </div>
            <h2 className="text-xl font-medium mt-4 mb-1">Create Your Library Account</h2>
            <p className="text-gray-400 text-sm">Please complete all fields below and use a valid university ID to access our online library services</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="sr-only">Full Name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Full Name"
                className={`w-full bg-gray-800 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.fullName ? 'border border-red-500' : ''}`}
                value={formData.fullName}
                onChange={handleChange}
              />
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
            </div>
            
            <div>
              <label htmlFor="cne" className="sr-only">CNE (Code National Etudiant)</label>
              <input
                id="cne"
                name="cne"
                type="text"
                placeholder="CNE (e.g L123456789)"
                className={`w-full bg-gray-800 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.cne ? 'border border-red-500' : ''}`}
                value={formData.cne}
                onChange={handleChange}
              />
              {errors.cne && <p className="text-red-500 text-xs mt-1">{errors.cne}</p>}
            </div>
            
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Email address (e.g f.lastName@uca.ac.ma)"
                className={`w-full bg-gray-800 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border border-red-500' : ''}`}
                value={formData.email}
                onChange={handleChange}
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
                className={`w-full bg-gray-800 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border border-red-500' : ''}`}
                value={formData.password}
                onChange={handleChange}
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
                className={`w-full bg-gray-800 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.confirmPassword ? 'border border-red-500' : ''}`}
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>
            
            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                className="h-4 w-4 text-blue-600 mt-1"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-400">
                I accept the <a href="#" className="text-blue-400 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-400 hover:underline">Privacy Policy</a>
              </label>
            </div>
            {errors.terms && <p className="text-red-500 text-xs">{errors.terms}</p>}
            
            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-medium py-3 px-4 rounded transition duration-300"
            >
              Create Account
            </button>
            
            <div className="text-center text-gray-400 text-sm">
              <a href="/login" className="hover:text-blue-400 transition duration-300">Already have an account? Login</a>
            </div>
          </form>
        </div>
      </div>
      
      {/* Right panel with book covers */}
      {/* <div className="hidden md:block md:w-3/5 bg-gray-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-transparent z-10"></div>
        <div className="grid grid-cols-3 gap-4 p-8 h-full overflow-hidden">
          {[...Array(12)].map((_, index) => (
            <div key={index} className="relative h-64 transform hover:scale-105 transition duration-300" style={{ transform: `rotate(${Math.random() * 8 - 4}deg)` }}>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900 opacity-30 rounded-lg z-10"></div>
              <img 
                src={`https://placehold.co/200x${300 + index * 10}`}
                alt="Book cover"
                className="w-full h-full object-cover rounded-lg shadow-lg"
              />
            </div>
          ))}
        </div>
      </div> */}
      <BookGallery />
    </div>
  );
};

export default LibraryRegistrationPage;
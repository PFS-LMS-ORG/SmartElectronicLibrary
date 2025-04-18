import { Link, useNavigate } from 'react-router-dom';
import { Book, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get user initials for the avatar
  const getInitials = (name: string) => {
    const names = name.trim().split(' ');
    const initials = names.map((n) => n.charAt(0).toUpperCase()).join('');
    return initials.slice(0, 2); // Limit to 2 characters
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleProfileClick = () => {
    navigate('/profile');
    setMobileMenuOpen(false);
  };

  return (
    <nav className="text-white bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-md flex items-center justify-between p-4 px-8 lg:px-16 border-b border-gray-700/50 shadow-lg z-50">
      <div className="flex items-center gap-3">
        <Book className="h-7 w-7 text-amber-500" />
        <Link to="/" className="text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
          LMSENSA+
        </Link>
      </div>
      
      {/* Mobile menu button */}
      <button 
        className="md:hidden text-gray-300 hover:text-white"
        onClick={toggleMobileMenu}
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-8">
        {isAuthenticated ? (
          <>
            <Link to="/" className="text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300">
              Home
            </Link>
            <Link to="/search" className="text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300">
              Search
            </Link>
            {user?.role === 'admin' && (
              <Link to="/admin" className="text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300">
                Admin
              </Link>
            )}
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleProfileClick}
            >
              <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-full h-9 w-9 flex items-center justify-center text-white font-medium text-sm border border-teal-400/50 shadow-md">
                {user ? getInitials(user.name) : '??'}
              </div>
              <span className="text-gray-200 font-medium">{user?.name || 'User'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-800/70 hover:bg-gray-700/90 border border-gray-600/50 hover:border-gray-500/70 transition-all duration-300 shadow-sm"
              title="Logout"
            >
              <LogOut size={18} className="text-gray-300 hover:text-amber-400 transition-colors duration-300" />
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300">
              Login
            </Link>
            <Link to="/register" className="text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300">
              Register
            </Link>
          </>
        )}
      </div>
      
      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-gray-900/95 backdrop-blur-md border-b border-gray-700/50 shadow-lg p-4 flex flex-col space-y-4 md:hidden z-50">
          {isAuthenticated ? (
            <>
              <Link 
                to="/" 
                className="text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300 p-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/search" 
                className="text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300 p-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Search
              </Link>
              {user?.role === 'admin' && (
                <Link 
                  to="/admin" 
                  className="text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300 p-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
              <div 
                className="flex items-center gap-3 p-2 cursor-pointer"
                onClick={handleProfileClick}
              >
                <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-full h-9 w-9 flex items-center justify-center text-white font-medium text-sm border border-teal-400/50 shadow-md">
                  {user ? getInitials(user.name) : '??'}
                </div>
                <span className="text-gray-200 font-medium">My Profile</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 text-gray-200 hover:text-amber-400 transition-colors duration-300 p-2"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link 
                to="/login" 
                className="text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300 p-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className="text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300 p-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Register
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
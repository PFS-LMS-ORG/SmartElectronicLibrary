import { Link, useNavigate } from 'react-router-dom';
import { Book } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

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

  return (
    <nav className="text-white bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-md flex items-center justify-between p-4 px-8 lg:px-16 border-b border-gray-700/50 shadow-lg">
      <div className="flex items-center gap-3">
        <Book className="h-7 w-7 text-amber-500" />
        <Link to="/" className="text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
          LMSENSA+
        </Link>
      </div>
      <div className="flex items-center gap-8">
        {isAuthenticated ? (
          <>
            <Link to="/" className="text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300">
              Home
            </Link>
            <Link to="/search" className="text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300">
              Search
            </Link>
            <div className="flex items-center gap-3">
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-300 hover:text-amber-400 transition-colors duration-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
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
    </nav>
  );
};

export default Navbar;
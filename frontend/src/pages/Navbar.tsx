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
    <nav className="text-white bg-transparent flex items-center justify-between p-4 px-8 lg:px-16 border-b border-gray-800">
      <div className="flex items-center gap-2">
        <Book className="h-6 w-6 text-white" />
        <Link to="/" className="text-xl font-bold">
          LMSENSA+
        </Link>
      </div>
      <div className="flex items-center gap-6">
        {isAuthenticated ? (
          <>
            <Link to="/" className="text-yellow-100 hover:text-yellow-200">
              Home
            </Link>
            <Link to="/search" className="hover:text-gray-300">
              Search
            </Link>
            <div className="flex items-center gap-2">
              <div className="bg-teal-500 rounded-full h-8 w-8 flex items-center justify-center text-white">
                {user ? getInitials(user.name) : '??'}
              </div>
              <span>{user?.name || 'User'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-600 hover:bg-gray-700"
              title="Logout"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
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
            <Link to="/login" className="hover:text-gray-300">
              Login
            </Link>
            <Link to="/register" className="hover:text-gray-300">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
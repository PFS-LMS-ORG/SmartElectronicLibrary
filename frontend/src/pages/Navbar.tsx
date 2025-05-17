import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Book, LogOut, Menu, X, Search, FileText, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createPortal } from 'react-dom';
import NotificationDropdown from '@/components/notification/NotificationDropDown';
import { useNotifications } from '../context/NotificationContext'; // Import the notifications hook

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useNotifications(); // Get unread count from the notification context
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [notificationPos, setNotificationPos] = useState({ top: 0, left: 0 });
  const [domReady, setDomReady] = useState(false);
  const searchButtonRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideNotificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    setDomReady(true);
    return () => setDomReady(false);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    const names = name.trim().split(' ');
    const initials = names.map((n) => n.charAt(0).toUpperCase()).join('');
    return initials.slice(0, 2);
  };

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const handleProfileClick = () => {
    navigate('/profile');
    setMobileMenuOpen(false);
  };

  // Search dropdown hover functionality
  const openSearchDropdown = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    const button = searchButtonRef.current;
    if (button) {
      const rect = button.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
      setSearchDropdownOpen(true);
    }
  };

  const closeDropdownWithDelay = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setSearchDropdownOpen(false);
    }, 150);
  };

  // Notification dropdown hover functionality
  const openNotificationDropdown = () => {
    if (hideNotificationTimeoutRef.current) clearTimeout(hideNotificationTimeoutRef.current);

    const button = notificationButtonRef.current;
    if (button) {
      const rect = button.getBoundingClientRect();
      setNotificationPos({
        top: rect.bottom + window.scrollY,
        left: rect.right + window.scrollX - 320, // Adjust positioning to align properly
      });
      setNotificationDropdownOpen(true);
    }
  };

  const closeNotificationWithDelay = () => {
    hideNotificationTimeoutRef.current = setTimeout(() => {
      setNotificationDropdownOpen(false);
    }, 150);
  };

  const closeNotificationDropdown = () => {
    setNotificationDropdownOpen(false);
  };

  // For mobile, we need click functionality
  const toggleNotificationDropdown = () => {
    const button = notificationButtonRef.current;
    if (button) {
      const rect = button.getBoundingClientRect();
      setNotificationPos({
        top: rect.bottom + window.scrollY,
        left: rect.right + window.scrollX - 320,
      });
      setNotificationDropdownOpen(!notificationDropdownOpen);
    }
  };

  return (
    <nav className="relative text-white bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-md flex items-center justify-between p-4 px-8 lg:px-16 border-b border-gray-700/50 shadow-lg z-50">
      <div className="flex items-center gap-3">
        <Book className="h-7 w-7 text-amber-500" />
        <Link to="/" className="text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
          LMSENSA+
        </Link>
      </div>

      <button className="md:hidden text-gray-300 hover:text-white" onClick={toggleMobileMenu}>
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-8">
        {isAuthenticated ? (
          <>
            <Link to="/" className="text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300">
              Home
            </Link>

            {/* Search Dropdown Hover Trigger */}
            <div
              ref={searchButtonRef}
              onMouseEnter={openSearchDropdown}
              onMouseLeave={closeDropdownWithDelay}
              className="relative"
            >
              <button className="text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300 flex items-center gap-1">
                Search <span className="text-xs mt-1">▼</span>
              </button>
            </div>

            {/* Portal Dropdown for Search */}
            {domReady && searchDropdownOpen && createPortal(
              <div
                onMouseEnter={openSearchDropdown}
                onMouseLeave={closeDropdownWithDelay}
                className="absolute py-2 w-48 bg-gray-800 rounded-md shadow-xl z-[9999] border border-gray-700"
                style={{ position: 'absolute', top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px` }}
              >
                <button
                  onClick={() => {
                    setSearchDropdownOpen(false);
                    navigate('/search');
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 hover:text-amber-400 w-full text-left"
                >
                  <Search size={16} />
                  Search Books
                </button>
                <button
                  onClick={() => {
                    setSearchDropdownOpen(false);
                    navigate('/articles');
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 hover:text-amber-400 w-full text-left"
                >
                  <FileText size={16} />
                  Browse Articles
                </button>
              </div>,
              document.body
            )}

            {user?.role === 'admin' && (
              <Link to="/admin" className="text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300">
                Admin
              </Link>
            )}

            {/* Notification Bell with Hover */}
            <div
              ref={notificationButtonRef}
              onMouseEnter={openNotificationDropdown}
              onMouseLeave={closeNotificationWithDelay}
              className="relative"
            >
              <button
                className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-800/70 hover:bg-gray-700/90 border border-gray-600/50 hover:border-gray-500/70 transition-all duration-300 shadow-sm relative"
                title="Notifications"
              >
                <Bell size={18} className="text-gray-300 hover:text-amber-400 transition-colors duration-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Notification Dropdown Portal */}
            {domReady && notificationDropdownOpen && createPortal(
              <div
                onMouseEnter={openNotificationDropdown}
                onMouseLeave={closeNotificationWithDelay}
                style={{ position: 'absolute', top: `${notificationPos.top}px`, left: `${notificationPos.left}px` }}
              >
                <NotificationDropdown onClose={closeNotificationDropdown} />
              </div>,
              document.body
            )}

            <div onClick={handleProfileClick} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
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

      {/* Mobile Navigation Portal */}
      {mobileMenuOpen && domReady && createPortal(
        <div className="fixed top-[60px] left-0 right-0 bg-gray-900/95 backdrop-blur-md border-b border-gray-700/50 shadow-lg p-4 flex flex-col space-y-4 md:hidden z-[9999]">
          {isAuthenticated ? (
            <>
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300 p-2">
                Home
              </Link>
              <div className="border-t border-gray-700 pt-2">
                <div className="text-gray-400 text-xs uppercase tracking-wider px-2 mb-1">Search</div>
                <Link to="/search" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300 p-2 pl-4">
                  <Search size={16} />
                  Search Books
                </Link>
                <Link to="/articles" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300 p-2 pl-4">
                  <FileText size={16} />
                  Browse Articles
                </Link>
              </div>
              
              {/* Mobile Notifications - Keep click functionality for mobile */}
              <button 
                onClick={toggleNotificationDropdown} 
                className="flex items-center justify-between text-gray-200 hover:text-amber-400 transition-colors duration-300 p-2"
              >
                <div className="flex items-center gap-3">
                  <Bell size={18} />
                  <span>Notifications</span>
                </div>
                {unreadCount > 0 && (
                  <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {user?.role === 'admin' && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300 p-2">
                  Admin
                </Link>
              )}
              <div onClick={handleProfileClick} className="flex items-center gap-3 p-2 cursor-pointer">
                <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-full h-9 w-9 flex items-center justify-center text-white font-medium text-sm border border-teal-400/50 shadow-md">
                  {user ? getInitials(user.name) : '??'}
                </div>
                <span className="text-gray-200 font-medium">
                  {user ? user.name : 'User'}
                </span>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-3 text-gray-200 hover:text-amber-400 transition-colors duration-300 p-2">
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300 p-2">
                Login
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="text-gray-200 font-medium hover:text-amber-400 transition-colors duration-300 p-2">
                Register
              </Link>
            </>
          )}
        </div>,
        document.body
      )}

      {/* Mobile Notification Dropdown Portal */}
      {notificationDropdownOpen && mobileMenuOpen && domReady && createPortal(
        <div className="fixed top-[60px] left-0 right-0 z-[10000]">
          <NotificationDropdown onClose={closeNotificationDropdown} />
        </div>,
        document.body
      )}
    </nav>
  );
};

export default Navbar;





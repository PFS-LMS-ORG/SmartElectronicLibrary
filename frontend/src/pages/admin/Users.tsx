import React, { useState, useEffect } from 'react';
import { 
  Search, User, Trash2, ChevronUp, ChevronDown, 
  Users as UsersIcon, Filter, ArrowUpDown, Shield, UserCheck, 
  BookOpen, Calendar, Mail, RefreshCw 
} from 'lucide-react';
import Layout from '@/components/layout/layout';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  books_borrowed?: number;
  date_joined?: string;
}

// Color mapping for roles
const roleColors = {
  admin: {
    bg: 'bg-green-900/30',
    text: 'text-green-400',
    border: 'border-green-800',
    icon: <Shield size={14} className="mr-1" />
  },
  user: {
    bg: 'bg-indigo-900/30',
    text: 'text-indigo-400',
    border: 'border-indigo-800',
    icon: <UserCheck size={14} className="mr-1" />
  }
};

const UsersTable: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof User>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [roleDropdownVisible, setRoleDropdownVisible] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Apply filters whenever users, searchQuery, or filterRole changes
    let result = [...users];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user => 
        user.name.toLowerCase().includes(query) || 
        user.email.toLowerCase().includes(query)
      );
    }
    
    // Apply role filter
    if (filterRole) {
      result = result.filter(user => user.role.toLowerCase() === filterRole.toLowerCase());
    }
    
    setFilteredUsers(result);
  }, [users, searchQuery, filterRole]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add UI-specific attributes if they don't exist in the API response
      const enhancedUsers = data.map((user: User) => ({
        ...user,
        books_borrowed: user.books_borrowed || Math.floor(Math.random() * 30) + 5,
        date_joined: user.date_joined || 'Dec 19 2023'
      }));
      
      setUsers(enhancedUsers);
      setFilteredUsers(enhancedUsers);
      setError(null);
    } catch (err) {
      setError('Failed to fetch users. Please try again later.');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Update the local state to reflect the change immediately
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      setRoleDropdownVisible(null);
    } catch (err) {
      console.error('Error updating user role:', err);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const response = await fetch(`/api/users/${userId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        setUsers(users.filter(user => user.id !== userId));
      } catch (err) {
        console.error('Error deleting user:', err);
      }
    }
  };

  const handleSort = (field: keyof User) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleRoleDropdown = (userId: number | null) => {
    setRoleDropdownVisible(roleDropdownVisible === userId ? null : userId);
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const clearFilters = () => {
    setSearchQuery('');
    setFilterRole(null);
    setFilteredUsers(users);
  };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const valueA = a[sortField] ?? '';
    const valueB = b[sortField] ?? '';
    
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
    }
    
    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const getSortIcon = (field: keyof User) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-50" />;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <Layout>
      <div className="w-full p-6">
        <div className="bg-gray-900 rounded-xl shadow-md border border-gray-800 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center">
                <div className="mr-4 bg-indigo-900/30 p-2 rounded-lg">
                  <UsersIcon className="text-indigo-400" size={20} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Users</h1>
                  <p className="text-sm text-gray-400">
                    Manage library system users and their roles
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="pl-10 pr-4 py-2 border border-gray-700 rounded-lg bg-gray-800 text-gray-100 w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                </div>
                
                <button 
                  onClick={() => setShowFilters(!showFilters)} 
                  className={`p-2 rounded-lg border ${showFilters 
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-900/20' 
                    : 'border-gray-700 text-gray-300'}`}
                >
                  <Filter size={20} />
                </button>
                
                <button 
                  onClick={fetchUsers} 
                  className="p-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800"
                  title="Refresh users"
                >
                  <RefreshCw size={20} />
                </button>
              </div>
            </div>
            
            {/* Filters */}
            {showFilters && (
              <div className="mt-4 flex flex-wrap items-center gap-2 pt-4 border-t border-gray-800">
                <div className="text-sm font-medium text-gray-300 mr-2">Filter by:</div>
                
                <button
                  onClick={() => setFilterRole(null)}
                  className={`px-3 py-1.5 text-sm rounded-lg flex items-center ${
                    filterRole === null 
                      ? 'bg-indigo-900/30 text-indigo-400' 
                      : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  All
                </button>
                
                <button
                  onClick={() => setFilterRole('admin')}
                  className={`px-3 py-1.5 text-sm rounded-lg flex items-center ${
                    filterRole === 'admin' 
                      ? 'bg-green-900/30 text-green-400' 
                      : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  <Shield size={14} className="mr-1" /> Admins
                </button>
                
                <button
                  onClick={() => setFilterRole('user')}
                  className={`px-3 py-1.5 text-sm rounded-lg flex items-center ${
                    filterRole === 'user' 
                      ? 'bg-indigo-900/30 text-indigo-400' 
                      : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  <UserCheck size={14} className="mr-1" /> Users
                </button>
                
                {(searchQuery || filterRole) && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 text-gray-300 ml-auto"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Error message */}
          {error && (
            <div className="m-6 bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded-lg flex items-start">
              <div className="mr-2 mt-0.5">⚠️</div>
              <div>{error}</div>
            </div>
          )}
          
          {/* Table */}
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-800/50">
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-300">
                      <button 
                        className="flex items-center font-medium focus:outline-none"
                        onClick={() => handleSort('name')}
                      >
                        <User size={14} className="mr-2" />
                        User Information
                        <span className="ml-1">{getSortIcon('name')}</span>
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-300">
                      <button 
                        className="flex items-center font-medium focus:outline-none"
                        onClick={() => handleSort('date_joined')}
                      >
                        <Calendar size={14} className="mr-2" />
                        Date Joined
                        <span className="ml-1">{getSortIcon('date_joined')}</span>
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-300">
                      <button 
                        className="flex items-center font-medium focus:outline-none"
                        onClick={() => handleSort('role')}
                      >
                        <Shield size={14} className="mr-2" />
                        Role
                        <span className="ml-1">{getSortIcon('role')}</span>
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-300">
                      <button 
                        className="flex items-center font-medium focus:outline-none"
                        onClick={() => handleSort('books_borrowed')}
                      >
                        <BookOpen size={14} className="mr-2" />
                        Books Borrowed
                        <span className="ml-1">{getSortIcon('books_borrowed')}</span>
                      </button>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-sm text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 px-4 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center">
                          <UsersIcon size={40} className="text-gray-600 mb-3" strokeWidth={1} />
                          <p className="text-gray-400 mb-1">No users found</p>
                          <p className="text-sm text-gray-500">
                            {searchQuery || filterRole ? 'Try clearing your filters' : 'Add users to get started'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedUsers.map((user) => (
                      <tr 
                        key={user.id} 
                        className="border-b border-gray-800 hover:bg-gray-800/60 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                              user.id % 4 === 0 ? 'bg-indigo-900/30 text-indigo-400' :
                              user.id % 4 === 1 ? 'bg-purple-900/30 text-purple-400' :
                              user.id % 4 === 2 ? 'bg-blue-900/30 text-blue-400' :
                              'bg-green-900/30 text-green-400'
                            }`}>
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div className="font-medium text-white">{user.name}</div>
                              <div className="text-sm text-gray-400 flex items-center">
                                <Mail size={12} className="mr-1" />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-300">
                          {user.date_joined}
                        </td>
                        <td className="py-4 px-4 relative">
                          <div 
                            className={`px-3 py-1.5 rounded-full text-sm inline-flex items-center gap-1 cursor-pointer border ${
                              user.role.toLowerCase() === 'admin' 
                                ? 'bg-green-900/30 text-green-400 border-green-800' 
                                : 'bg-indigo-900/30 text-indigo-400 border-indigo-800'
                            }`}
                            onClick={() => toggleRoleDropdown(user.id)}
                          >
                            {user.role.toLowerCase() === 'admin' 
                              ? <Shield size={14} className="mr-1" /> 
                              : <UserCheck size={14} className="mr-1" />}
                            {user.role}
                            <ChevronDown size={14} className="ml-1" />
                          </div>
                          
                          {roleDropdownVisible === user.id && (
                            <div className="absolute z-10 mt-1 w-36 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
                              <div 
                                className={`px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center ${
                                  user.role.toLowerCase() === 'user' 
                                    ? 'text-indigo-400 font-medium' 
                                    : 'text-gray-300'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRoleChange(user.id, 'user');
                                }}
                              >
                                <UserCheck size={14} className="mr-2" />
                                User
                                {user.role.toLowerCase() === 'user' && (
                                  <CheckIcon className="ml-auto" />
                                )}
                              </div>
                              <div 
                                className={`px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center ${
                                  user.role.toLowerCase() === 'admin' 
                                    ? 'text-green-400 font-medium' 
                                    : 'text-gray-300'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRoleChange(user.id, 'admin');
                                }}
                              >
                                <Shield size={14} className="mr-2" />
                                Admin
                                {user.role.toLowerCase() === 'admin' && (
                                  <CheckIcon className="ml-auto" />
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-300">
                          <div className="flex items-center">
                            <BookOpen size={14} className="mr-2 text-indigo-400" />
                            {user.books_borrowed}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button 
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-red-400 hover:bg-red-900/20 transition-colors"
                            onClick={() => handleDeleteUser(user.id)}
                            title="Delete user"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Footer with pagination */}
          <div className="p-4 border-t border-gray-800 flex justify-between items-center">
            <div className="text-sm text-gray-400">
              Showing <span className="font-medium text-gray-300">{sortedUsers.length}</span> of{' '}
              <span className="font-medium text-gray-300">{users.length}</span> users
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 border border-gray-700 rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 disabled:opacity-50" disabled>
                Previous
              </button>
              <button className="px-3 py-1 border border-gray-700 rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 disabled:opacity-50" disabled>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Small check icon component
const CheckIcon = ({ className = "" }: { className?: string }) => (
  <svg 
    className={className} 
    width="16" 
    height="16" 
    viewBox="0 0 16 16" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      d="M13.3334 4L6.00008 11.3333L2.66675 8" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export default UsersTable;
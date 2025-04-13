import React, { useState, useEffect } from 'react';
import { FiEye, FiTrash2, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import Layout from '@/components/layout/layout';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  books_borrowed?: number;
  university_id?: string;
  date_joined?: string;
}

const UsersTable: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof User>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [roleDropdownVisible, setRoleDropdownVisible] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

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
        university_id: user.university_id || '901244237789',
        date_joined: user.date_joined || 'Dec 19 2023'
      }));
      
      setUsers(enhancedUsers);
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

  const sortedUsers = [...users].sort((a, b) => {
    if (a[sortField] < b[sortField]) return sortDirection === 'asc' ? -1 : 1;
    if (a[sortField] > b[sortField]) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const getSortIcon = (field: keyof User) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <FiChevronUp className="inline" /> : <FiChevronDown className="inline" />;
  };

  return (
    <Layout>
      <div className="container mx-auto bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">All Users</h1>
          <div className="flex gap-2">
            <button 
              className="px-3 py-1 text-sm border border-gray-300 rounded"
              onClick={() => handleSort('name')}
            >
              A-Z {getSortIcon('name')}
            </button>
            <button className="px-3 py-1 text-sm border border-gray-300 rounded">
              <span className="inline"><FiChevronDown /></span>
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-dotted border-gray-300">
                  <th className="text-left py-2 px-4 font-medium text-sm text-gray-600 cursor-pointer" onClick={() => handleSort('name')}>
                    Name {getSortIcon('name')}
                  </th>
                  <th className="text-left py-2 px-4 font-medium text-sm text-gray-600 cursor-pointer" onClick={() => handleSort('date_joined')}>
                    Date Joined {getSortIcon('date_joined')}
                  </th>
                  <th className="text-left py-2 px-4 font-medium text-sm text-gray-600 cursor-pointer" onClick={() => handleSort('role')}>
                    Role {getSortIcon('role')}
                  </th>
                  <th className="text-left py-2 px-4 font-medium text-sm text-gray-600 cursor-pointer" onClick={() => handleSort('books_borrowed')}>
                    Books Borrowed {getSortIcon('books_borrowed')}
                  </th>
                  <th className="text-left py-2 px-4 font-medium text-sm text-gray-600">
                    University ID No
                  </th>
                  <th className="text-left py-2 px-4 font-medium text-sm text-gray-600">
                    University ID Card
                  </th>
                  <th className="text-left py-2 px-4 font-medium text-sm text-gray-600">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 px-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  sortedUsers.map((user) => (
                    <tr key={user.id} className="border-b border-dotted border-gray-300 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm">{user.date_joined}</td>
                      <td className="py-4 px-4 relative">
                        <div 
                          className={`px-2 py-1 rounded-md text-sm inline-flex items-center gap-1 cursor-pointer ${
                            user.role.toLowerCase() === 'admin' ? 'text-green-600' : 'text-pink-600'
                          }`}
                          onClick={() => toggleRoleDropdown(user.id)}
                        >
                          {user.role}
                          {roleDropdownVisible === user.id && (
                            <div className="absolute z-10 top-12 left-0 bg-white border border-gray-200 rounded-md shadow-lg">
                              <div 
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-pink-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRoleChange(user.id, 'user');
                                }}
                              >
                                User {user.role.toLowerCase() === 'user' && '✓'}
                              </div>
                              <div 
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-green-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRoleChange(user.id, 'admin');
                                }}
                              >
                                Admin {user.role.toLowerCase() === 'admin' && '✓'}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">{user.books_borrowed}</td>
                      <td className="py-4 px-4">{user.university_id}</td>
                      <td className="py-4 px-4">
                        <button className="text-blue-500 flex items-center gap-1 text-sm">
                          <FiEye /> View ID Card
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <button 
                          className="text-red-500"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UsersTable;
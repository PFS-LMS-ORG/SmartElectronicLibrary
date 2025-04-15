import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/layout';

interface Book {
  id: number;
  title: string;
  cover_url: string;
  description: string;
  rating: number;
  summary: string;
  authors: string[];
  categories: string[];
  borrow_count: number;
  total_books: number;
  available_books: number;
  featured_book: boolean;
}

const EditBookPage: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // Get book ID from URL
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState<Partial<Book>>({
    title: '',
    cover_url: '',
    description: '',
    rating: 0,
    summary: '',
    authors: [],
    categories: [],
    borrow_count: 0,
    total_books: 0,
    available_books: 0,
    featured_book: false,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Fetch book data
  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch(`/api/books/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 404) throw new Error('Book not found');
          if (response.status === 401) throw new Error('Unauthorized: Please log in again');
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        setBook(data);
        setFormData({
          title: data.title,
          cover_url: data.cover_url,
          description: data.description,
          rating: data.rating,
          summary: data.summary,
          authors: data.authors,
          categories: data.categories,
          borrow_count: data.borrow_count,
          total_books: data.total_books,
          available_books: data.available_books,
          featured_book: data.featured_book,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch book');
        console.error('Error fetching book:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [id]);

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle authors and categories (comma-separated input)
  const handleArrayChange = (name: 'authors' | 'categories', value: string) => {
    const array = value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item);
    setFormData((prev) => ({ ...prev, [name]: array }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/books/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        if (response.status === 403) throw new Error('Forbidden: Admin access required');
        if (response.status === 404) throw new Error('Book not found');
        if (response.status === 400) {
          const data = await response.json();
          throw new Error(data.error || 'Invalid data provided');
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      navigate('/admin/books', { state: { message: 'Book updated successfully' } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update book');
      console.error('Error updating book:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-800 mb-6">Edit Book</h1>

          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Cover URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Cover URL</label>
                <input
                  type="url"
                  name="cover_url"
                  value={formData.cover_url || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formData.cover_url && (
                  <img
                    src={formData.cover_url}
                    alt="Cover preview"
                    className="mt-2 w-24 h-32 object-cover rounded"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  value={formData.description || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Rating (0-5)</label>
                <input
                  type="number"
                  name="rating"
                  value={formData.rating || 0}
                  onChange={handleChange}
                  min="0"
                  max="5"
                  step="0.1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Summary */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Summary</label>
                <textarea
                  name="summary"
                  value={formData.summary || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              {/* Authors */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Authors (comma-separated)</label>
                <input
                  type="text"
                  value={formData.authors?.join(', ') || ''}
                  onChange={(e) => handleArrayChange('authors', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jane Austen, John Smith"
                />
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Categories (comma-separated)</label>
                <input
                  type="text"
                  value={formData.categories?.join(', ') || ''}
                  onChange={(e) => handleArrayChange('categories', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Fiction, Classic"
                />
              </div>

              {/* Borrow Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Borrow Count</label>
                <input
                  type="number"
                  name="borrow_count"
                  value={formData.borrow_count || 0}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Total Books */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Books</label>
                <input
                  type="number"
                  name="total_books"
                  value={formData.total_books || 0}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Available Books */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Available Books</label>
                <input
                  type="number"
                  name="available_books"
                  value={formData.available_books || 0}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Featured Book */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="featured_book"
                  checked={formData.featured_book || false}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm font-medium text-gray-700">Featured Book</label>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed`}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/admin/books')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default EditBookPage;
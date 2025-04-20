import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/layout';
import { 
  Book, ChevronLeft, Save, X, Image, Star, Bookmark, 
  FileText, Users, Tag, Repeat, Hash, Check, AlertTriangle 
} from 'lucide-react';

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    setSuccessMessage(null);

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

      setSuccessMessage('Book updated successfully');
      
      // Optional: Navigate back after a delay
      setTimeout(() => {
        navigate('/admin/books');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update book');
      console.error('Error updating book:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Input component with consistent styling
  const FormInput = ({ 
    label, name, value, type = 'text', onChange, icon, required = false, min, max, step, disabled = false
  }: { 
    label: string,
    name: string,
    value: string | number | undefined,
    type?: string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    icon: React.ReactNode,
    required?: boolean,
    min?: string | number,
    max?: string | number,
    step?: string | number,
    disabled?: boolean
  }) => (
    <div className="mb-5">
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          {icon}
        </div>
        <input
          type={type}
          name={name}
          value={value || ''}
          onChange={onChange}
          className="w-full pl-10 pr-4 py-2.5 bg-[#1e263a] border border-[#2a2f42] rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          required={required}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
        />
      </div>
    </div>
  );

  // Textarea component with consistent styling
  const FormTextarea = ({ 
    label, name, value, onChange, icon, rows = 4, required = false
  }: { 
    label: string,
    name: string,
    value: string | undefined,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void,
    icon: React.ReactNode,
    rows?: number,
    required?: boolean
  }) => (
    <div className="mb-5">
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-3 text-gray-400">
          {icon}
        </div>
        <textarea
          name={name}
          value={value || ''}
          onChange={onChange}
          rows={rows}
          className="w-full pl-10 pr-4 py-2.5 bg-[#1e263a] border border-[#2a2f42] rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          required={required}
        />
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="w-full p-6">
        <div className="bg-[#1a2032] rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-[#2a2f42]">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="mr-4 bg-indigo-900/30 p-2 rounded-lg">
                  <Book className="text-indigo-400" size={20} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-100">Edit Book</h1>
                  <p className="text-sm text-gray-400">
                    Update book information and details
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/books')}
                className="flex items-center px-3 py-1.5 bg-[#252b3d] text-gray-300 rounded-lg hover:bg-[#2a314a] transition-colors"
              >
                <ChevronLeft size={16} className="mr-1" /> Back to Books
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400"></div>
              </div>
            ) : error ? (
              <div className="mb-6 bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded-lg flex items-start">
                <AlertTriangle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            ) : successMessage ? (
              <div className="mb-6 bg-green-900/20 border border-green-800 text-green-400 px-4 py-3 rounded-lg flex items-start">
                <Check size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                <div>{successMessage}</div>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <FormInput
                    label="Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    icon={<Book size={16} />}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <FormInput
                    label="Cover Image URL"
                    name="cover_url"
                    value={formData.cover_url}
                    onChange={handleChange}
                    icon={<Image size={16} />}
                  />
                  
                  {formData.cover_url && (
                    <div className="mt-2 flex items-center">
                      <div className="w-16 h-24 bg-[#1e263a] rounded overflow-hidden mr-3">
                        <img
                          src={formData.cover_url}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.classList.add('flex', 'items-center', 'justify-center', 'bg-indigo-900/30');
                            const icon = document.createElement('div');
                            icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-400"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>';
                            e.currentTarget.parentElement!.appendChild(icon);
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-400">Cover preview</span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <FormTextarea
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    icon={<FileText size={16} />}
                    rows={3}
                  />
                </div>

                <div>
                  <FormInput
                    label="Rating (0-5)"
                    name="rating"
                    value={formData.rating}
                    type="number"
                    onChange={handleChange}
                    icon={<Star size={16} />}
                    min={0}
                    max={5}
                    step={0.1}
                  />
                </div>

                <div>
                  <FormInput
                    label="Borrow Count"
                    name="borrow_count"
                    value={formData.borrow_count}
                    type="number"
                    onChange={handleChange}
                    icon={<Repeat size={16} />}
                    min={0}
                  />
                </div>

                <div className="md:col-span-2">
                  <FormTextarea
                    label="Summary"
                    name="summary"
                    value={formData.summary}
                    onChange={handleChange}
                    icon={<Bookmark size={16} />}
                    rows={3}
                  />
                </div>

                <div>
                  <FormInput
                    label="Authors (comma-separated)"
                    name="authors_string"
                    value={formData.authors?.join(', ')}
                    onChange={(e) => handleArrayChange('authors', e.target.value)}
                    icon={<Users size={16} />}
                    required
                  />
                </div>

                <div>
                  <FormInput
                    label="Categories (comma-separated)"
                    name="categories_string"
                    value={formData.categories?.join(', ')}
                    onChange={(e) => handleArrayChange('categories', e.target.value)}
                    icon={<Tag size={16} />}
                  />
                </div>

                <div>
                  <FormInput
                    label="Total Books"
                    name="total_books"
                    value={formData.total_books}
                    type="number"
                    onChange={handleChange}
                    icon={<Hash size={16} />}
                    min={0}
                    required
                  />
                </div>

                <div>
                  <FormInput
                    label="Available Books"
                    name="available_books"
                    value={formData.available_books}
                    type="number"
                    onChange={handleChange}
                    icon={<Book size={16} />}
                    min={0}
                    max={formData.total_books}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center p-3 bg-[#1e263a] border border-[#2a2f42] rounded-lg">
                    <input
                      type="checkbox"
                      id="featured_book"
                      name="featured_book"
                      checked={formData.featured_book || false}
                      onChange={handleChange}
                      className="h-4 w-4 bg-[#252b3d] border-[#2a2f42] rounded checked:bg-indigo-500 checked:border-indigo-500 focus:ring-indigo-400 focus:ring-opacity-25"
                    />
                    <label htmlFor="featured_book" className="ml-2 text-sm text-gray-300">
                      Feature this book on the homepage
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/books')}
                    className="flex items-center px-4 py-2 bg-[#252b3d] text-gray-300 rounded-lg hover:bg-[#2a314a] transition-colors"
                    disabled={submitting}
                  >
                    <X size={16} className="mr-2" /> Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} className="mr-2" /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EditBookPage;
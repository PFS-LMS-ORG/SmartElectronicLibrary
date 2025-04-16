import React, { useState, useEffect, FormEvent } from 'react';
import { Book, CheckCircle, X, Info, Image, Type, Star, Hash, Users, Tag, FileText, AlignLeft, Bookmark, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '@/components/layout/layout';

interface BookFormData {
  title: string;
  authors: string[];
  categories: string[];
  cover_url: string;
  description: string;
  summary: string;
  rating: number;
  total_books: number;
  available_books: number;
  featured_book: boolean;
}

interface Category {
  id: number;
  name: string;
}

const CreateBookPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<BookFormData>({
    title: '',
    authors: [''],
    categories: [''],
    cover_url: '',
    description: '',
    summary: '',
    rating: 0,
    total_books: 1,
    available_books: 1,
    featured_book: false,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'details' | 'advanced'>('basic');
  const [existingCategories, setExistingCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState<number | null>(null);

  // Fetch existing categories for dropdown suggestions
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found');

        const response = await fetch('/api/books/categories', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }

        const data = await response.json();
        setExistingCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Update cover preview when URL changes
  useEffect(() => {
    if (formData.cover_url) {
      setCoverPreview(formData.cover_url);
    } else {
      setCoverPreview(null);
    }
  }, [formData.cover_url]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    index?: number,
    field?: string
  ) => {
    if (index !== undefined && field) {
      const updatedArray = [...(formData[field as keyof BookFormData] as string[])];
      updatedArray[index] = e.target.value;
      setFormData({ ...formData, [field]: updatedArray });
    } else {
      let value: string | number | boolean = e.target.value;
      
      // Handle numeric inputs
      if (e.target.type === 'number') {
        value = e.target.value === '' ? 0 : Number(e.target.value);
      }
      
      setFormData({ ...formData, [e.target.name]: value });
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.checked });
  };

  const handleRatingChange = (newRating: number) => {
    setFormData({ ...formData, rating: newRating });
  };

  const addField = (field: 'authors' | 'categories') => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };

  const removeField = (field: 'authors' | 'categories', index: number) => {
    const updatedArray = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: updatedArray });
  };

  const selectCategory = (categoryName: string, index: number) => {
    const updatedCategories = [...formData.categories];
    updatedCategories[index] = categoryName;
    setFormData({ ...formData, categories: updatedCategories });
    setShowCategoryDropdown(null);
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    // Basic validation
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (formData.authors.every((a) => !a.trim())) newErrors.authors = 'At least one author is required';
    if (formData.categories.every((c) => !c.trim())) newErrors.categories = 'At least one category is required';
    
    // Numeric validation
    if (formData.total_books < 1) newErrors.total_books = 'Total books must be at least 1';
    if (formData.available_books < 0) newErrors.available_books = 'Available books cannot be negative';
    if (formData.available_books > formData.total_books) {
      newErrors.available_books = 'Available books cannot exceed total books';
    }
    
    // Rating validation
    if (formData.rating < 0 || formData.rating > 5) {
      newErrors.rating = 'Rating must be between 0 and 5';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      // Show toast for validation errors
      toast.error('Please fix the form errors before submitting');
      return;
    }

    // Clean up the data before submission (remove empty authors/categories)
    const cleanedFormData = {
      ...formData,
      authors: formData.authors.filter(author => author.trim() !== ''),
      categories: formData.categories.filter(category => category.trim() !== '')
    };

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create book');
      }

      const bookData = await response.json();
      toast.success('Book created successfully!');
      navigate('/admin/books');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create book');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset available books when total books changes
  useEffect(() => {
    if (formData.available_books > formData.total_books) {
      setFormData(prev => ({...prev, available_books: prev.total_books}));
    }
  }, [formData.total_books]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gray-700 px-6 py-4 border-b border-gray-600">
            <div className="flex items-center">
              <Book className="h-6 w-6 text-amber-400 mr-2" />
              <h1 className="text-2xl font-bold text-white">Create New Book</h1>
            </div>
          </div>

          {/* Form Nav Tabs */}
          <div className="flex border-b border-gray-600">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-3 font-medium text-sm flex items-center ${
                activeTab === 'basic'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Type className="h-4 w-4 mr-2" />
              Basic Info
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 font-medium text-sm flex items-center ${
                activeTab === 'details'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <FileText className="h-4 w-4 mr-2" />
              Description & Summary
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`px-4 py-3 font-medium text-sm flex items-center ${
                activeTab === 'advanced'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <MoreHorizontal className="h-4 w-4 mr-2" />
              Advanced Settings
            </button>
          </div>
          
          {/* Form Content */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
            {errors.server && (
              <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-2 rounded-lg mb-6">
                <p className="text-sm">{errors.server}</p>
              </div>
            )}
            
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center">
                        <Type className="h-4 w-4 mr-1 text-amber-400" />
                        Title <span className="text-red-400 ml-1">*</span>
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 bg-gray-700 border ${
                          errors.title ? 'border-red-500' : 'border-gray-600'
                        } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500`}
                        placeholder="Enter book title"
                      />
                      {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
                    </div>

                    {/* Authors */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center">
                        <Users className="h-4 w-4 mr-1 text-amber-400" />
                        Authors <span className="text-red-400 ml-1">*</span>
                      </label>
                      {formData.authors.map((author, index) => (
                        <div key={index} className="flex items-center space-x-2 mb-2">
                          <input
                            type="text"
                            value={author}
                            onChange={(e) => handleInputChange(e, index, 'authors')}
                            className={`flex-1 px-3 py-2 bg-gray-700 border ${
                              errors.authors && index === 0 ? 'border-red-500' : 'border-gray-600'
                            } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500`}
                            placeholder={`Author ${index + 1}`}
                          />
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => removeField('authors', index)}
                              className="p-1 text-red-400 hover:text-red-300"
                              title="Remove author"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addField('authors')}
                        className="mt-1 px-3 py-1 bg-gray-700 border border-gray-600 text-amber-400 rounded-md hover:bg-gray-600 flex items-center text-sm"
                      >
                        <span className="mr-1">+</span> Add Author
                      </button>
                      {errors.authors && <p className="text-red-400 text-xs mt-1">{errors.authors}</p>}
                    </div>

                    {/* Categories */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center">
                        <Tag className="h-4 w-4 mr-1 text-amber-400" />
                        Categories <span className="text-red-400 ml-1">*</span>
                      </label>
                      {formData.categories.map((category, index) => (
                        <div key={index} className="relative mb-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={category}
                              onChange={(e) => handleInputChange(e, index, 'categories')}
                              onFocus={() => setShowCategoryDropdown(index)}
                              className={`flex-1 px-3 py-2 bg-gray-700 border ${
                                errors.categories && index === 0 ? 'border-red-500' : 'border-gray-600'
                              } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500`}
                              placeholder={`Category ${index + 1}`}
                            />
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => removeField('categories', index)}
                                className="p-1 text-red-400 hover:text-red-300"
                                title="Remove category"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                          
                          {/* Category dropdown */}
                          {showCategoryDropdown === index && existingCategories.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-gray-700 border border-gray-600 rounded-md shadow-lg">
                              {existingCategories
                                .filter(c => c.name.toLowerCase().includes(category.toLowerCase()))
                                .map(c => (
                                  <div
                                    key={c.id}
                                    className="px-3 py-2 cursor-pointer hover:bg-gray-600 text-white"
                                    onClick={() => selectCategory(c.name, index)}
                                  >
                                    {c.name}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addField('categories')}
                        className="mt-1 px-3 py-1 bg-gray-700 border border-gray-600 text-amber-400 rounded-md hover:bg-gray-600 flex items-center text-sm"
                      >
                        <span className="mr-1">+</span> Add Category
                      </button>
                      {errors.categories && <p className="text-red-400 text-xs mt-1">{errors.categories}</p>}
                    </div>
                  </div>
                  
                  {/* Right Column - Cover Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center">
                      <Image className="h-4 w-4 mr-1 text-amber-400" />
                      Cover Image URL
                    </label>
                    <input
                      type="text"
                      name="cover_url"
                      value={formData.cover_url}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500 mb-3"
                      placeholder="https://example.com/book-cover.jpg"
                    />
                    
                    <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center">
                      {coverPreview ? (
                        <div className="relative">
                          <img 
                            src={coverPreview} 
                            alt="Cover preview" 
                            className="max-h-64 max-w-full rounded-md shadow-lg object-contain"
                            onError={() => {
                              setCoverPreview(null);
                              toast.error('Invalid image URL');
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({...formData, cover_url: ''});
                              setCoverPreview(null);
                            }}
                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                            title="Remove image"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Image className="h-16 w-16 text-gray-500 mx-auto mb-3" />
                          <p className="text-gray-400 text-sm">Cover preview will appear here</p>
                          <p className="text-gray-500 text-xs mt-1">Recommended size: 500x750 pixels</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Description & Summary Tab */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center">
                    <AlignLeft className="h-4 w-4 mr-1 text-amber-400" />
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Enter a short description (max 500 characters)"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-gray-400 text-xs mt-1">
                    {formData.description?.length || 0}/500 characters
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center">
                    <FileText className="h-4 w-4 mr-1 text-amber-400" />
                    Summary
                  </label>
                  <textarea
                    name="summary"
                    value={formData.summary}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Enter a detailed summary of the book"
                    rows={8}
                  />
                </div>
              </div>
            )}
            
            {/* Advanced Settings Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Rating */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center">
                      <Star className="h-4 w-4 mr-1 text-amber-400" />
                      Rating (0-5)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        name="rating"
                        value={formData.rating}
                        onChange={handleInputChange}
                        min="0"
                        max="5"
                        step="0.1"
                        className={`w-20 px-3 py-2 bg-gray-700 border ${
                          errors.rating ? 'border-red-500' : 'border-gray-600'
                        } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500`}
                      />
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleRatingChange(star)}
                            className={`focus:outline-none ${
                              formData.rating >= star ? 'text-amber-400' : 'text-gray-600'
                            }`}
                          >
                            <Star className="h-5 w-5 fill-current" />
                          </button>
                        ))}
                      </div>
                    </div>
                    {errors.rating && <p className="text-red-400 text-xs mt-1">{errors.rating}</p>}
                  </div>
                  
                  {/* Featured Book */}
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                      <input
                        type="checkbox"
                        name="featured_book"
                        checked={formData.featured_book}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded border-gray-600 text-amber-600 focus:ring-amber-500 bg-gray-700"
                      />
                      <span className="flex items-center">
                        <Bookmark className="h-4 w-4 mr-1 text-amber-400" />
                        Featured Book
                      </span>
                    </label>
                    <p className="text-gray-400 text-xs mt-1 ml-6">
                      Featured books appear prominently on the homepage.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  {/* Total Books */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center">
                      <Hash className="h-4 w-4 mr-1 text-amber-400" />
                      Total Copies <span className="text-red-400 ml-1">*</span>
                    </label>
                    <input
                      type="number"
                      name="total_books"
                      value={formData.total_books}
                      onChange={handleInputChange}
                      min="1"
                      className={`w-full px-3 py-2 bg-gray-700 border ${
                        errors.total_books ? 'border-red-500' : 'border-gray-600'
                      } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500`}
                    />
                    {errors.total_books && <p className="text-red-400 text-xs mt-1">{errors.total_books}</p>}
                    <p className="text-gray-400 text-xs mt-1">
                      Total number of copies in the library.
                    </p>
                  </div>
                  
                  {/* Available Books */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center">
                      <Hash className="h-4 w-4 mr-1 text-amber-400" />
                      Available Copies <span className="text-red-400 ml-1">*</span>
                    </label>
                    <input
                      type="number"
                      name="available_books"
                      value={formData.available_books}
                      onChange={handleInputChange}
                      min="0"
                      max={formData.total_books}
                      className={`w-full px-3 py-2 bg-gray-700 border ${
                        errors.available_books ? 'border-red-500' : 'border-gray-600'
                      } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500`}
                    />
                    {errors.available_books && <p className="text-red-400 text-xs mt-1">{errors.available_books}</p>}
                    <p className="text-gray-400 text-xs mt-1">
                      Number of copies currently available for borrowing (must be ≤ total copies).
                    </p>
                  </div>
                </div>
                
                <div className="bg-blue-900/20 border border-blue-800 rounded-md p-4 mt-4">
                  <div className="flex">
                    <Info className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-blue-300 font-medium">Advanced Settings Note</p>
                      <p className="text-gray-300 text-sm mt-1">
                        The borrow count field is not shown here as it is automatically
                        incremented when users borrow books.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Form Actions - Always visible */}
            <div className="border-t border-gray-600 mt-6 pt-6 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/admin/books')}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:bg-amber-800 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <span className="animate-spin h-5 w-5 border-b-2 border-white rounded-full mr-2"></span>
                ) : (
                  <CheckCircle className="h-5 w-5 mr-2" />
                )}
                Create Book
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateBookPage;
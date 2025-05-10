import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/layout";
import {
  Search,
  Trash2,
  ChevronUp,
  ChevronDown,
  Book,
  Edit,
  ArrowUpDown,
  Plus,
  Filter,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import Pagination from "@/components/common/Pagination";
import axios from "axios";

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
}

interface PaginationData {
  books: Book[];
  total_count: number;
  total_pages: number;
}

const BooksPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("search") || "");
  const [sortField, setSortField] = useState<keyof Book>("title");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(parseInt(searchParams.get("page") || "1", 10));
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalBooks, setTotalBooks] = useState<number>(0);
  const [perPage, setPerPage] = useState<number>(parseInt(searchParams.get("per_page") || "10", 10));
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get("category") || "");
  const [allCategories, setAllCategories] = useState<string[]>([]);
  
  const navigate = useNavigate();

  // Update URL when pagination params change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (currentPage !== 1) params.set("page", currentPage.toString());
    if (perPage !== 10) params.set("per_page", perPage.toString());
    if (categoryFilter) params.set("category", categoryFilter);
    setSearchParams(params);
  }, [currentPage, perPage, searchQuery, categoryFilter, setSearchParams]);

  // Fetch books when parameters change
  useEffect(() => {
    fetchBooks(searchQuery, currentPage, perPage, categoryFilter);
  }, [currentPage, perPage, categoryFilter]);

  // Fetch categories on initial load
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            throw new Error("No authentication token found");
        }

        const response = await axios.get("/api/books/categories", {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        const categories = response.data.map((category: any) => category.name);
        setAllCategories(categories);
    } catch (error: any) {
        console.error("Error fetching categories:", {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
        });
    }
  };

  const fetchBooks = async (query: string = "", page: number = 1, itemsPerPage: number = 10, category: string = "") => {
    try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        if (!token) {
            throw new Error("No authentication token found");
        }

        const params = new URLSearchParams();
        if (query) params.append("search", query);
        params.append("page", page.toString());
        params.append("per_page", itemsPerPage.toString());
        if (category) params.append("category", category);

        const response = await axios.get(`/api/books?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.data.books || !Array.isArray(response.data.books)) {
            throw new Error("Invalid response format: Expected { books: [...], total_count, total_pages }");
        }

        setBooks(response.data.books);
        setTotalBooks(response.data.total_count);
        setTotalPages(response.data.total_pages);
        setError(null);
    } catch (err: any) {
        const errorMessage =
            err instanceof Error
                ? err.message
                : "Failed to fetch books. Please try again later.";
        setError(errorMessage);
        console.error("Error fetching books:", {
            message: err.message,
            response: err.response?.data,
            status: err.response?.status,
        });
        setBooks([]);
        setTotalBooks(0);
        setTotalPages(1);
    } finally {
        setLoading(false);
    }
  };
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    fetchBooks(searchQuery, 1, perPage, categoryFilter);
  };

  const handleSort = (field: keyof Book) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDeleteBook = async (bookId: number) => {
    if (window.confirm("Are you sure you want to delete this book?")) {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                throw new Error("No authentication token found");
            }

            await axios.delete(`/api/books/${bookId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            toast.success("Book deleted successfully");
            fetchBooks(searchQuery, currentPage, perPage, categoryFilter);
        } catch (err: any) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "Failed to delete book. Please try again.";
            setError(errorMessage);
            console.error("Error deleting book:", {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
            });
        }
    }
  };

  const handleEditBook = (bookId: number) => {
    navigate(`/admin/edit/${bookId}`);
  };

  const handlePageChange = (pageNumber: number) => {
    // Ensure page number is within valid range
    const page = Math.max(1, Math.min(pageNumber, totalPages));
    setCurrentPage(page);
  };

  const handlePerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPerPage = parseInt(e.target.value, 10);
    setPerPage(newPerPage);
    setCurrentPage(1); // Reset to first page when items per page changes
  };

  const handleCategoryFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryFilter(e.target.value);
    setCurrentPage(1); // Reset to first page when category filter changes
  };

  const getSortIcon = (field: keyof Book) => {
    if (sortField !== field)
      return <ArrowUpDown size={14} className="opacity-50" />;
    return sortDirection === "asc" ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  };

  const sortedBooks = [...books].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }
    return 0;
  });

  const getCoverColor = (bookId: number) => {
    const colorVariants = [
      "bg-indigo-900/30 text-indigo-400",
      "bg-purple-900/30 text-purple-400",
      "bg-blue-900/30 text-blue-400",
      "bg-green-900/30 text-green-400",
    ];
    return colorVariants[bookId % colorVariants.length];
  };


  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("");
    setCurrentPage(1);
    fetchBooks("", 1, perPage, "");
  };

  return (
    <Layout>
      <div className="w-full p-6">
        <div className="bg-[#1a2032] rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-[#2a2f42]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center">
                <div className="mr-4 bg-indigo-900/30 p-2 rounded-lg">
                  <Book className="text-indigo-400" size={20} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-100">All Books</h1>
                  <p className="text-sm text-gray-400">
                    Manage library books collection
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSort("title")}
                  className="px-3 py-1.5 text-sm rounded-lg flex items-center bg-[#252b3d] text-gray-300 hover:bg-[#2a314a] transition-colors"
                >
                  A-Z <span className="ml-1">{getSortIcon("title")}</span>
                </button>
                <button
                  onClick={() => navigate("/books/create")}
                  className="px-3 py-1.5 text-sm rounded-lg flex items-center bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800 transition-colors"
                >
                  <Plus size={16} className="mr-1" /> Create a New Book
                </button>
              </div>
            </div>

            {/* Search and Filter Area */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search Form */}
              <div className="md:col-span-2">
                <form onSubmit={handleSearch} className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-[#2a2f42] rounded-lg bg-[#1e263a] text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Search books by title or author..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-md bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800 transition-colors"
                  >
                    <Search size={16} />
                  </button>
                </form>
              </div>

              {/* Category Filter */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter size={16} className="text-gray-400" />
                </div>
                <select
                  value={categoryFilter}
                  onChange={handleCategoryFilterChange}
                  className="w-full pl-10 pr-4 py-2 border border-[#2a2f42] rounded-lg bg-[#1e263a] text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                  style={{ backgroundImage: "none" }} // Remove default arrow
                >
                  <option value="">All Categories</option>
                  {allCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown size={16} className="text-gray-400" />
                </div>
              </div>
            </div>

            {/* Active filters display */}
            {(searchQuery || categoryFilter) && (
              <div className="mt-3 flex items-center flex-wrap gap-2">
                <span className="text-xs text-gray-400">Active filters:</span>
                {searchQuery && (
                  <span className="inline-flex items-center px-2 py-1 bg-indigo-900/30 text-indigo-300 text-xs rounded">
                    Search: {searchQuery}
                    <button 
                      onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                      className="ml-1.5 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {categoryFilter && (
                  <span className="inline-flex items-center px-2 py-1 bg-indigo-900/30 text-indigo-300 text-xs rounded">
                    Category: {categoryFilter}
                    <button 
                      onClick={() => { setCategoryFilter(""); setCurrentPage(1); }}
                      className="ml-1.5 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                <button
                  onClick={clearFilters}
                  className="text-xs text-gray-400 hover:text-gray-300 ml-2"
                >
                  Clear all
                </button>
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
                  <tr className="border-b border-[#2a2f42] bg-[#1e263a]">
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-300">
                      <button
                        className="flex items-center font-medium focus:outline-none"
                        onClick={() => handleSort("title")}
                      >
                        <Book size={14} className="mr-2" />
                        Book Information
                        <span className="ml-1">{getSortIcon("title")}</span>
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-300">
                      Authors
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-300">
                      Categories
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-300">
                      <button
                        className="flex items-center font-medium focus:outline-none"
                        onClick={() => handleSort("available_books")}
                      >
                        Available
                        <span className="ml-1">
                          {getSortIcon("available_books")}
                        </span>
                      </button>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-sm text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBooks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 px-4 text-center text-gray-400"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <Book
                            size={40}
                            className="text-gray-600 mb-3"
                            strokeWidth={1}
                          />
                          <p className="text-gray-400 mb-1">No books found</p>
                          <p className="text-sm text-gray-500">
                            {searchQuery || categoryFilter
                              ? "Try different search criteria or clear filters"
                              : "Add your first book to get started"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedBooks.map((book) => (
                      <tr
                        key={book.id}
                        className="border-b border-[#2a2f42] hover:bg-[#1e263a] transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <div
                              className={`w-10 h-14 flex-shrink-0 ${getCoverColor(
                                book.id
                              )} rounded flex items-center justify-center mr-3`}
                            >
                              {book.cover_url ? (
                                <img
                                  src={book.cover_url}
                                  alt={book.title}
                                  className="w-full h-full object-cover rounded"
                                  onError={(e) => {
                                    (
                                      e.currentTarget.parentNode as HTMLElement
                                    ).classList.add(getCoverColor(book.id));
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <Book size={18} />
                              )}
                            </div>
                            <div className="font-medium text-gray-100">
                              {book.title}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-300">
                          {book.authors.length > 0
                            ? book.authors.join(", ")
                            : "Unknown Author"}
                        </td>
                        <td className="py-4 px-4 text-gray-300">
                          <div className="flex flex-wrap gap-1">
                            {book.categories.length > 0 ? (
                              book.categories.map((category, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block px-2 py-0.5 bg-[#252b3d] text-xs rounded text-gray-300"
                                >
                                  {category}
                                </span>
                              ))
                            ) : (
                              <span className="inline-block px-2 py-0.5 bg-[#252b3d] text-xs rounded text-gray-300">
                                Uncategorized
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-300">
                          <span
                            className={`${
                              book.available_books > 0
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {book.available_books}
                          </span>
                          /{book.total_books}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex justify-center gap-3">
                            <button
                              className="p-1.5 rounded-full text-indigo-400 hover:bg-indigo-900/30 transition-colors"
                              onClick={() => handleEditBook(book.id)}
                              title="Edit book"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="p-1.5 rounded-full text-red-400 hover:bg-red-900/30 transition-colors"
                              onClick={() => handleDeleteBook(book.id)}
                              title="Delete book"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Enhnaced Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            perPage={perPage}
            totalItems={totalBooks}
            itemsPerPageOptions={[5, 10, 20, 50]}
            itemLabel="books"
            colorScheme="indigo"
          />

        </div>
      </div>
    </Layout>
  );
};

export default BooksPage;
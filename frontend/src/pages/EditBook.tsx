import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  featured_book: boolean;
  created_at: string;
}

const EditBookPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book>({
    id: 0,
    title: "",
    cover_url: "",
    description: "",
    rating: 0,
    summary: "",
    authors: [],
    categories: [],
    borrow_count: 0,
    total_books: 0,
    available_books: 0,
    featured_book: false,
    created_at: "",
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);  // Set loading to true when fetching starts
    fetch(`/api/books/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();  // Parse the JSON data
      })
      .then((data) => {
        setBook(data);  // Update the book state with the fetched data
        console.log(data);
        setLoading(false);  // Set loading to false when data is fetched
      })
      .catch((error) => {
        console.error("Error fetching book:", error);  // Handle errors
        setLoading(false);  // Set loading to false even if there's an error
      });
  }, [id]);
  

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    setBook(prevBook => ({
      ...prevBook,
      [name]:
        type === "number"
          ? parseFloat(value)
          : name === "featured_book"
          ? value === "true"
          : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const updatedBook = {
      ...book,
      authors: book.authors.filter(a => a.trim() !== ""),
      categories: book.categories.filter(c => c.trim() !== "")
    };

    axios.put(`/api/books/${id}`, updatedBook)
      .then(() => {
        navigate("/books");
      })
      .catch(error => {
        console.error("Error updating book:", error);
        setSubmitting(false);
      });
  };

  if (loading) return <div>Loading book data...</div>;

  console.log(book.title);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Edit Book</h1>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              name="title"
              value={book.title}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
            <input
              type="text"
              name="cover_url"
              value={book.cover_url}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
            <textarea
              name="summary"
              value={book.summary}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={book.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
            <input
              type="number"
              name="rating"
              value={book.rating}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
              step="0.1"
              min="0"
              max="5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Borrow Count</label>
            <input
              type="number"
              name="borrow_count"
              value={book.borrow_count}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Books</label>
            <input
              type="number"
              name="total_books"
              value={book.total_books}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Available Books</label>
            <input
              type="number"
              name="available_books"
              value={book.available_books}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Featured</label>
            <select
              name="featured_book"
              value={book.featured_book ? "true" : "false"}
              onChange={(e) =>
                setBook((prev) => ({
                  ...prev,
                  featured_book: e.target.value === "true",
                }))
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Authors (comma separated)
            </label>
            <textarea
              name="authors"
              value={book.authors? book.authors.join(", "):''}
              onChange={(e) =>
                setBook((prev) => ({
                  ...prev,
                  authors: e.target.value.split(",").map((a) => a.trim()),
                }))
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
              rows={2}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categories (comma separated)
            </label>
            <textarea
              name="categories"
              value={book.categories?book.categories.join(", "):''}
              onChange={(e) =>
                setBook((prev) => ({
                  ...prev,
                  categories: e.target.value.split(",").map((c) => c.trim()),
                }))
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
              rows={2}
            />
          </div>

        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {submitting ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
};

export default EditBookPage;

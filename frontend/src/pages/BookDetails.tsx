import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

interface Book {
  id: number;
  title: string;
  cover_url: string;
  description: string;
  rating: number;
  summary: string;
  authors: { name: string }[];
  categories: { name: string }[];
  borrow_count: number;
  total_books: number;
  available_books: number;
}

const BookDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/books/${id}`)
      .then(response => {
        setBook(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching book:", error);
        setLoading(false);
      });
  }, [id]);

  const handleBorrow = () => {
    // Future logic to borrow the book
    alert("Borrow feature coming soon!");
  };

  if (loading) return <div className="text-white text-center py-10">Loading...</div>;
  if (!book) return <div className="text-white text-center py-10">Book not found!</div>;

  return (
    <div className="container mx-auto px-6 lg:px-20 py-10 text-white">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Book Cover */}
        <div className="flex justify-center">
          <img
            src={book.cover_url}
            alt={book.title}
            className="rounded-xl shadow-lg w-64 h-96 object-cover"
          />
        </div>

        {/* Book Info */}
        <div>
          <h1 className="text-4xl font-bold mb-2">{book.title}</h1>
          <h2 className="text-lg text-gray-300 mb-4">
            By {book.authors.toString()}
          </h2>

          <p className="text-sm text-gray-400 mb-4">
            <span className="font-semibold text-white">Categories:</span>{" "}
            {book.categories.toString()}
          </p>

          <p className="text-sm text-gray-400 mb-2">
            <span className="font-semibold text-white">Rating:</span> {book.rating} ⭐
          </p>

          <p className="text-sm text-gray-400 mb-6">
            <span className="font-semibold text-white">Available:</span> {book.available_books} / {book.total_books}
          </p>

          <p className="text-base leading-relaxed mb-6 text-gray-200">{book.description}</p>

          {book.summary && (
            <div className="p-4 bg-gray-800 rounded-lg mb-6 h-auto">
              <h3 className="font-semibold text-lg mb-2">Summary</h3>
              <p className="text-sm text-gray-300">{book.summary}</p>
            </div>
          )}

          {/* Borrow Button */}
          <button
            onClick={handleBorrow}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 transition duration-200 text-white font-semibold rounded-lg shadow"
          >
            Borrow Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookDetails;

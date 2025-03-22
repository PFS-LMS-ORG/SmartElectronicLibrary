import { useParams } from "react-router-dom";

const books = [
  { id: "1", title: "Origin", author: "Dan Brown", description: "A mystery-thriller...", coverImage: "https://th.bing.com/th/id/OIP._nr-URRb3s2MWuZwe1N5AgHaLj?rs=1&pid=ImgDetMain" },
  { id: "2", title: "The Fury", author: "Alex Michaelides", description: "A gripping novel...", coverImage: "https://th.bing.com/th/id/R.0236080380cecfbb88b31137b3884702?rik=mYNHB3E0PfVAgQ&pid=ImgRaw&r=0" }
];


const BookDetails = () => {
  const { id } = useParams();
  const book = books.find(b => b.id === id);

  if (!book) {
    return <div className="text-white">Book not found!</div>;
  }

  return (
    <div className="container mx-auto px-8 lg:px-16 py-8 text-white">
      <h1 className="text-4xl font-bold">{book.title}</h1>
      <h2 className="text-xl">By {book.author}</h2>
      <img src={book.coverImage} alt={book.title} className="h-80" />
      <p>{book.description}</p>
    </div>
  );
};

export default BookDetails;

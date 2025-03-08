// pages/BookWiseHomepage.tsx
import Navbar from './Navbar';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import BookCover from '@/components/ui/BookCover';
import { Button } from '@/components/ui/button';

const BookWiseHomepage = () => {
  const featuredBook = {
    title: "Origin",
    author: "Dan Brown",
    category: "Thriller / Suspense",
    rating: 4.5,
    totalBooks: 100,
    availableBooks: 42,
    description: "Origin is a 2017 mystery-thriller novel by American author Dan Brown. It is the fifth installment in the Robert Langdon series, following previous bestsellers such as The Da Vinci Code and Angels & Demons.",
    coverImage: "https://th.bing.com/th/id/OIP._nr-URRb3s2MWuZwe1N5AgHaLj?rs=1&pid=ImgDetMain"
  };

  const popularBooks = [
    { id: 1, title: "Origin", author: "Dan Brown", coverImage: "https://th.bing.com/th/id/OIP._nr-URRb3s2MWuZwe1N5AgHaLj?rs=1&pid=ImgDetMain" },
    { id: 2, title: "The Fury", author: "Alex Michaelides", coverImage: "https://th.bing.com/th/id/R.0236080380cecfbb88b31137b3884702?rik=mYNHB3E0PfVAgQ&pid=ImgRaw&r=0" },
    { id: 3, title: "The Maidens", author: "Alex Michaelides", coverImage: "https://th.bing.com/th/id/OIP.QgMgOIcvBT9ciSRLPuy55wHaLb?rs=1&pid=ImgDetMain" },
    { id: 4, title: "Gerald's Game", author: "Stephen King", coverImage: "https://hachette.imgix.net/books/9781848940710.jpg?auto=compress,format" },
    { id: 5, title: "Don't Turn Around", author: "Jessica Barry", coverImage: "https://th.bing.com/th/id/R.fe08f2a0a8cbd00466e200cacfda6374?rik=fajyD%2fySWxiALw&pid=ImgRaw&r=0" },
    { id: 6, title: "Don't Turn Around", author: "Jessica Barry", coverImage: "https://th.bing.com/th/id/R.fe08f2a0a8cbd00466e200cacfda6374?rik=fajyD%2fySWxiALw&pid=ImgRaw&r=0" }
  ];

  return (
    <BackgroundWrapper>
      {/* Navbar */}
      <Navbar />

      {/* Main Content */}

      <main className="container mx-auto px-8 lg:px-16 py-8 text-white">

        {/* Featured Book Section */}
        <section className="flex flex-col md:flex-row gap-10 mb-16">
          <div className="flex-1">
            <h1 className="text-6xl font-bold mb-4">{featuredBook.title}</h1>
            <div className="mb-4">

              <span>By {featuredBook.author}</span>
              <span className="mx-4">Category: {featuredBook.category}</span>
              <span className="flex items-center">

                {/* Star rating */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {featuredBook.rating}/5
              </span>

            </div>

            <div className="flex gap-6 mb-6">
              <div>Total books: {featuredBook.totalBooks}</div>
              <div>Available books: {featuredBook.availableBooks}</div>
            </div>
            <p className="mb-6">{featuredBook.description}</p>

            <Button className='px-6 py-7'>Borrow Book Request</Button>
          </div>
          
          {/* Featured Book Cover */}
          <BookCover coverImage={featuredBook.coverImage} title={featuredBook.title} />
        </section>

        {/* Popular Books Section */}
        <section>
          <h2 className="text-3xl font-bold mb-8">Popular Books</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {popularBooks.map(book => (
              <div key={book.id} className="flex flex-col">
                {/* Book Cover */}
                <div className="relative mb-4 h-60 group cursor-pointer">
                  <img 
                    src={book.coverImage} 
                    alt={book.title} 
                    className="rounded-lg shadow-lg h-60 object-cover relative z-10"
                    style={{
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -2px rgba(0, 0, 0, 0.4)"
                    }}
                  />
                </div>
                <h3 className="font-bold">{book.title} - By {book.author}</h3>
              </div>
            ))}
          </div>
        </section>
      </main>
    </BackgroundWrapper>
  );
};

export default BookWiseHomepage;

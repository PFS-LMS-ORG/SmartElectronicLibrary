// pages/BookWiseHomepage.tsx
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import BookCover from '@/components/ui/BookCover';
import { Button } from '@/components/ui/button';
import { useState , useEffect } from 'react';


interface Book {
  id: number;
  title: string;
  cover_url: string;
  description: string;
  rating: number;
  summary: string;
  authors: { name: string }[];
  categories: { name: string }[];
  borrow_count : number;
  total_books : number;
  available_books : number;
}

const BookWiseHomepage = () => {
  const [featuredBook, setFeaturedBook] = useState<Book>();
  const [popularBooks, setPopularBooks] = useState<Book[]>([]);

  useEffect(() => {
    const fetchPopularBooks = async () => {
      const response = await fetch('/api/books/popular');
      const data: Book[] = await response.json();
      setPopularBooks(data); // Update the state with fetched books
    }

    const fetchFeaturedBook = async () => {
      const response = await fetch('/api/books/featured');
      const data: Book = await response.json();
      setFeaturedBook(data);  // Update the state with fetched books
    }

    fetchFeaturedBook();
    fetchPopularBooks();
  },[]);

  return (
    <BackgroundWrapper>
      

      {/* Main Content */}

      <main className="container mx-auto px-8 lg:px-16 py-8">

        {/* Featured Book Section */}
        <section className="flex flex-col md:flex-row gap-10 mb-16 text-white">
          <div className="flex-1">
            {featuredBook && <h1 className="text-6xl font-bold mb-4">{featuredBook.title}</h1>}
            <div className="mb-4">

              {featuredBook && <span>By {featuredBook.authors.toString()}</span>}
              <span className="mx-4">Category: {featuredBook?.categories.toString()}</span>
              <span className="flex items-center">

                {/* Star rating */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {featuredBook && featuredBook.rating}/5
              </span>

            </div>

            <div className="flex gap-6 mb-6">
              <div>Total books: {featuredBook && featuredBook.total_books}</div>
              <div>Available books: {featuredBook && featuredBook.available_books}</div>
            </div>
            <p className="mb-6">{featuredBook && featuredBook.description}</p>

            <Button className='px-6 py-7' style={{ backgroundColor: '#EED1AC', color: '#16191E' }}> <svg width="18" height="16" viewBox="0 0 18 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8.375 1.77751C7.06925 0.941149 5.55063 0.497712 4 0.500009C3.07749 0.499066 2.16158 0.655475 1.29167 0.962509C1.16983 1.00559 1.06433 1.08537 0.989715 1.19088C0.915096 1.2964 0.875018 1.42244 0.875 1.55168V13.4267C0.875014 13.5267 0.899014 13.6252 0.944985 13.714C0.990955 13.8027 1.05755 13.8792 1.13919 13.9369C1.22083 13.9946 1.31512 14.0319 1.41416 14.0457C1.51319 14.0594 1.61407 14.0492 1.70833 14.0158C2.44444 13.7562 3.21945 13.624 4 13.625C5.6625 13.625 7.18583 14.2142 8.375 15.1967V1.77751ZM9.625 15.1967C10.8553 14.1785 12.403 13.6225 14 13.625C14.805 13.625 15.575 13.7633 16.2917 14.0167C16.386 14.05 16.487 14.0602 16.5861 14.0465C16.6851 14.0327 16.7795 13.9953 16.8611 13.9375C16.9428 13.8797 17.0094 13.8031 17.0553 13.7142C17.1012 13.6253 17.1251 13.5267 17.125 13.4267V1.55168C17.125 1.42244 17.0849 1.2964 17.0103 1.19088C16.9357 1.08537 16.8302 1.00559 16.7083 0.962509C15.8384 0.655475 14.9225 0.499066 14 0.500009C12.4494 0.497712 10.9307 0.941149 9.625 1.77751V15.1967Z" fill="#16191E"/>
</svg> Borrow Book Request</Button>
          </div>
          
          {/* Featured Book Cover */}
          <BookCover id={featuredBook?.id ?? 0} cover_url={featuredBook?.cover_url ?? ''} title={featuredBook?.title ?? 'Untitled'} />
        </section>

        {/* Popular Books Section */}
        <section className="text-white">
          <h2 className="text-3xl font-bold mb-8">Popular Books</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {popularBooks.map(book => (
            <div key={book.id} className="flex flex-col">
              <div className="relative mb-6 h-60 group cursor-pointer">
              <BookCover 
                id={book.id}
                cover_url={book.cover_url} 
                title={book.title}
                size="sm"
              />
              </div>
              <h3 className="font-bold">{book.title} - By {book.authors.toString()}</h3>
              <p className="text-xs text-gray-400">{book.categories.toString()}</p>
            </div>
))}
          </div>
        </section>
      </main>
    </BackgroundWrapper>
  );
};

export default BookWiseHomepage;

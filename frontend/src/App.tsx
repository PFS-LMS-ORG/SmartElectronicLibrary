import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Search from "./pages/SearchPage";
import Reservations from "./pages/Reservations";
import LibraryLoginPage from "./pages/LibraryLoginPage"
import LibraryRegistrationPage from "./pages/LibraryRegistrationPage"
import BookDetails from "./pages/BookDetails";
import AdminDashboard from "./pages/AdminDashboard";
import Users from "./pages/Users";
import BooksPage from "./pages/Books";
import EditBookPage from "./pages/EditBook";

function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<Search />} />
      <Route path="/login" element={<LibraryLoginPage />} />
      <Route path="/register" element={<LibraryRegistrationPage />} />
      <Route path="/reservations" element={<Reservations />} />
      <Route path="/edit/:id" element={<EditBookPage />} />
      <Route path="/book/:id" element={<BookDetails />} />
      <Route path="*" element={<div>Page Not Found</div>} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/users" element={<Users />} />
      <Route path="/books" element={<BooksPage />} />
    </Routes>
    </>
  );
}

export default App;

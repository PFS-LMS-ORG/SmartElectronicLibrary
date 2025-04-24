import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Search from "./pages/SearchPage";
import Reservations from "./pages/Reservations";
import Navbar from "./pages/Navbar";
import BackgroundWrapper from "./components/ui/BackgroundWrapper";
import LibraryLoginPage from "./pages/LibraryLoginPage";
import LibraryRegistrationPage from "./pages/LibraryRegistrationPage";
import BookDetails from "./pages/BookDetails";
import AdminDashboard from "./pages/admin/AdminDashboard";
import BooksPage from "./pages/admin/Books";
import UsersTable from "./pages/admin/Users";
import EditBookPage from "./pages/admin/EditBook";
import AdminRequestsPage from "./pages/admin/Requests";
import AdminRentalsPage from "./pages/admin/AdminRentalsPage";
import CreateBookPage from "./pages/admin/CreateBookPage";
import AccountRequestsPage from "./pages/admin/AccountRequestsPage";
import UserProfilePage from "./pages/UserProfilePage";
import ArticlesPage from "./pages/ArticlesPage";
import ArticleDetailsPage from "./pages/ArticleDetailsPage";

import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

function App() {
  const location = useLocation();
  
  return (
    <AuthProvider>
      <BackgroundWrapper>
        <Navbar />
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/login" element={<LibraryLoginPage />} />
              <Route path="/register" element={<LibraryRegistrationPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/search"
                element={
                  <ProtectedRoute>
                    <Search />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reservations"
                element={
                  <ProtectedRoute>
                    <Reservations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/book/:id"
                element={
                  <ProtectedRoute>
                    <BookDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <UserProfilePage />
                  </ProtectedRoute>
                }
              />
              {/* New Article Routes */}
              <Route
                path="/articles"
                element={
                  <ProtectedRoute>
                    <ArticlesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/articles/:slug"
                element={
                  <ProtectedRoute>
                    <ArticleDetailsPage />
                  </ProtectedRoute>
                }
              />
              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <UsersTable />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/books"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <BooksPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/edit/:id"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <EditBookPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/requests"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminRequestsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/rentals"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminRentalsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/books/create"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <CreateBookPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/account-requests"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AccountRequestsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="*"
                element={
                  <div className="container mx-auto px-8 py-8 text-white">
                    Page Not Found
                  </div>
                }
              />
            </Routes>
          </AnimatePresence>
        <ToastContainer position="top-right" autoClose={3000} />
      </BackgroundWrapper>
    </AuthProvider>
  );
}

export default App;
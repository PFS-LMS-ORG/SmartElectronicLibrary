import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Search from './pages/SearchPage';
import Reservations from './pages/Reservations';
import Navbar from './pages/Navbar';
import BackgroundWrapper from './components/ui/BackgroundWrapper';
import LibraryLoginPage from './pages/LibraryLoginPage';
import LibraryRegistrationPage from './pages/LibraryRegistrationPage';
import BookDetails from './pages/BookDetails';
import Product from './pages/Product';

function App() {
  return (
    <AuthProvider>
      <BackgroundWrapper>
        <Navbar />
        <Routes>
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
            path="/product"
            element={
              <ProtectedRoute>
                <Product />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<div className="container mx-auto px-8 py-8 text-white">Page Not Found</div>} />
        </Routes>
      </BackgroundWrapper>
    </AuthProvider>
  );
}

export default App;
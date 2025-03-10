import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Search from "./pages/SearchPage";
import Reservations from "./pages/Reservations";
import Navbar from "./pages/Navbar";
import BackgroundWrapper from "./components/ui/BackgroundWrapper";
import LibraryLoginPage from "./pages/LibraryLoginPage"
import LibraryRegistrationPage from "./pages/LibraryRegistrationPage"

function App() {
  return (
    <BackgroundWrapper>
    <Navbar />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<Search />} />
      <Route path="/login" element={<LibraryLoginPage />} />
      <Route path="/register" element={<LibraryRegistrationPage />} />
      <Route path="/reservations" element={<Reservations />} />
    </Routes>
    </BackgroundWrapper>
  );
}

export default App;

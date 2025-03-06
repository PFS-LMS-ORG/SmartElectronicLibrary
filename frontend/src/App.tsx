import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Reservations from "./pages/Reservations";
import LibraryLoginPage from "./pages/LibraryLoginPage"
import LibraryRegistrationPage from "./pages/LibraryRegistrationPage"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<Search />} />
      <Route path="/login" element={<LibraryLoginPage />} />
      <Route path="/register" element={<LibraryRegistrationPage />} />
      <Route path="/reservations" element={<Reservations />} />
    </Routes>
  );
}

export default App;

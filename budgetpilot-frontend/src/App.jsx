import { BrowserRouter, Routes, Route } from "react-router-dom";
import Intro from "./components/Intro";
import RegionPage from "./pages/RegionPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Intro />} />
        <Route path="/question/region" element={<RegionPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

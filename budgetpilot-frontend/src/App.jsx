import { BrowserRouter, Routes, Route } from "react-router-dom";
import Intro from "./components/Intro";
import RegionPage from "./pages/RegionPage";

function App() {
  return (
    <BrowserRouter>
      <div
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <Routes>
          <Route path="/" element={<Intro />} />
          <Route path="/question/region" element={<RegionPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Intro from "./components/Intro";
import Layout from "./components/Layout";
import RegionPage from "./pages/RegionPage";
import PeriodPage from "./pages/PeriodPage"; // 경로는 실제 위치에 맞게 조정

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Intro />} />

        <Route element={<Layout />}>
          <Route path="/question/region" element={<RegionPage />} />
          <Route path="/question/period" element={<PeriodPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

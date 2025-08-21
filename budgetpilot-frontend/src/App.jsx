import { BrowserRouter, Routes, Route } from "react-router-dom";
import Intro from "./components/Intro";
import Layout from "./components/Layout";
import RegionPage from "./pages/RegionPage";
import PeriodPage from "./pages/PeriodPage";
import WhoPage from "./pages/WhoPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Intro />} />

        <Route element={<Layout />}>
          <Route path="/question/region" element={<RegionPage />} />
          <Route path="/question/period" element={<PeriodPage />} />
          <Route path="/question/who" element={<WhoPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

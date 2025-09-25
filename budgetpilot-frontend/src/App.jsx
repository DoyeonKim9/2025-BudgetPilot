import { BrowserRouter, Routes, Route } from "react-router-dom";
import Intro from "./components/Intro";
import Layout from "./components/Layout";
import RegionPage from "./pages/RegionPage";
import PeriodPage from "./pages/PeriodPage";
import WhoPage from "./pages/WhoPage";
import StylePage from "./pages/StylePage";
import BudgetPage from "./pages/BudgetPage";
import HotelPage from "./pages/HotelPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Intro />} />

        <Route element={<Layout />}>
          <Route path="/question/region" element={<RegionPage />} />
          <Route path="/question/period" element={<PeriodPage />} />
          <Route path="/question/who" element={<WhoPage />} />
          <Route path="/question/style" element={<StylePage />} />
          <Route path="/question/budget" element={<BudgetPage />} />
          <Route path="/hotel" element={<HotelPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

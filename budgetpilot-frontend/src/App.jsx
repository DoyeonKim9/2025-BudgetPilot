import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Intro from './components/Intro';
import TravelInput from './components/TravelInput';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Intro />} />
        <Route path="/input" element={<TravelInput />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

// src/pages/RegionPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const RegionPage = () => {
  const navigate = useNavigate();
  const [selectedRegion, setSelectedRegion] = useState(null);

  const regions = [
    { category: "강원도", items: ["춘천", "속초", "강릉"] },
    { category: "전라도", items: ["전주", "여수", "목포"] },
    { category: "경상도", items: ["부산", "경주", "통영"] },
    { category: "수도권", items: ["서울", "인천", "수원"] },
    { category: "기타", items: ["제주도", "울릉도"] },
  ];

  const handleSelect = (region) => {
    setSelectedRegion(region);
  };

  const handleNext = () => {
    if (selectedRegion) {
      navigate(`/question/period?region=${selectedRegion}`);
    }
  };

  return (
    <div className="min-h-screen bg-white px-6 py-10">
      <h2 className="text-2xl font-bold mb-4">떠나고 싶은 도시는?</h2>
      <p className="mb-6 text-gray-600">도시 1곳을 선택해주세요.</p>

      <div className="space-y-6">
        {regions.map(({ category, items }) => (
          <div key={category}>
            <h4 className="font-semibold mb-2">{category}</h4>
            <div className="flex flex-wrap gap-3">
              {items.map((region) => (
                <button
                  key={region}
                  className={`px-4 py-2 rounded-full border ${
                    selectedRegion === region
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-gray-100 text-gray-800 border-gray-300"
                  }`}
                  onClick={() => handleSelect(region)}
                >
                  {region}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        className={`mt-10 w-full py-3 rounded-lg ${
          selectedRegion
            ? "bg-blue-500 text-white"
            : "bg-gray-300 text-gray-500"
        }`}
        onClick={handleNext}
        disabled={!selectedRegion}
      >
        다음
      </button>
    </div>
  );
};

export default RegionPage;

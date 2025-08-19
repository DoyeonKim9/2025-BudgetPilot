// src/pages/RegionPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const RegionPage = () => {
  const navigate = useNavigate();
  const [selectedRegion, setSelectedRegion] = useState(null);

  const regions = [
    { category: "서울", items: ["강남", "홍대", "성수", "종로"] },
    { category: "경기도", items: ["가평", "인천", "수원"] },
    { category: "충청도", items: ["대전", "천안", "단양"] },
    { category: "강원도", items: ["춘천", "속초", "강릉"] },
    { category: "전라도", items: ["전주", "여수", "목포", "광주"] },
    { category: "경상도", items: ["부산", "대구", "경주", "통영"] },
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
    <div className="min-h-screen bg-blue-50 px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-extrabold text-center text-blue-700 mb-2">
          🗺️ 떠나고 싶은 도시는?
        </h2>
        <p className="text-center text-gray-600 mb-8">
          여행하고 싶은 도시 한 곳을 선택해주세요.
        </p>

        <div className="space-y-8">
          {regions.map(({ category, items }) => (
            <div key={category}>
              <h4 className="font-semibold text-lg text-gray-700 mb-2">
                {category}
              </h4>
              <div className="flex flex-wrap gap-3">
                {items.map((region) => (
                  <button
                    key={region}
                    className={`px-4 py-2 rounded-full transition border text-sm shadow-sm 
                      ${
                        selectedRegion === region
                          ? "bg-blue-500 text-white border-blue-500"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-blue-100"
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
          className={`mt-12 w-full py-3 rounded-xl font-semibold text-lg transition 
            ${
              selectedRegion
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          onClick={handleNext}
          disabled={!selectedRegion}
        >
          다음
        </button>
      </div>
    </div>
  );
};

export default RegionPage;

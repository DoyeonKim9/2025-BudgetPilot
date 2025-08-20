import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../RegionPage.css";
import { IoArrowBackSharp } from "react-icons/io5";
import { useQueryNavigator } from "../hook/useQueryNavigator";

const RegionPage = () => {
  const { goTo } = useQueryNavigator();
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

  const handleCityClick = (city) => {
    setSelectedRegion(city);
  };

  const handleNextClick = () => {
    if (selectedRegion) {
      goTo("/question/period", { regionIds: selectedRegion });
    } else {
      alert("도시를 선택해주세요!");
    }
  };

  const handleBackClick = () => {
    navigate(-1); // 뒤로 가기
  };

  return (
    <div className="region-page">
      {/* Header 고정 */}
      <header className="region-header">
        <button className="back-button" onClick={handleBackClick}>
          <IoArrowBackSharp size={24} />
        </button>
        <span className="step-indicator">1/5</span>
      </header>

      {/* 중간 스크롤 영역 */}
      <div className="region-scroll-container">
        <h1 className="title">🌏 떠나고 싶은 여행지는?</h1>
        <p className="subtitle">여행지 1곳을 선택해주세요.</p>
        {regions.map(({ category, items }) => (
          <div key={category} className="region-group">
            <h2 className="region-title">{category}</h2>
            <div className="button-group">
              {items.map((city) => (
                <button
                  key={city}
                  className={`city-button ${
                    selectedRegion === city ? "selected" : ""
                  }`}
                  onClick={() => handleCityClick(city)}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer 고정 */}
      <footer className="region-footer">
        <button className="next-button" onClick={handleNextClick}>
          다음
        </button>
      </footer>
    </div>
  );
};

export default RegionPage;

// src/pages/StylePage.jsx
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IoArrowBackSharp } from "react-icons/io5";
import { useQueryNavigator } from "../hook/useQueryNavigator";
import "../WhoPage.css"; // 같은 스타일 유지

const styleOptions = [
  "힐링, 휴향",
  "쇼핑",
  "액티비티",
  "감성, 핫플",
  "맛집 탐방",
  "명소 관람",
];

const StylePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { region, period, who } = location.state || {};

  const [selectedStyles, setSelectedStyles] = useState([]);

  const toggleStyle = (style) => {
    if (selectedStyles.includes(style)) {
      setSelectedStyles(selectedStyles.filter((s) => s !== style));
    } else {
      setSelectedStyles([...selectedStyles, style]);
    }
  };

  const handleNext = () => {
    if (selectedStyles.length > 0) {
      goTo("/question/budget", {
        region,
        period,
        who,
        style: selectedStyles.join(","),
      });
    } else {
      alert("여행 스타일을 1개 이상 선택해주세요!");
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="container">
      <header className="region-header">
        <button className="back-button" onClick={handleBack}>
          <IoArrowBackSharp size={24} />
        </button>
        <span className="step-indicator">4/5</span>
      </header>

      <main className="period-content">
        <h1 className="title">🧳 여행 스타일은?</h1>
        <p className="subtitle">선호하는 여행 스타일을 모두 선택해주세요.</p>
        <div className="period-grid">
          {styleOptions.map((style) => (
            <button
              key={style}
              className={`period-button ${
                selectedStyles.includes(style) ? "selected" : ""
              }`}
              onClick={() => toggleStyle(style)}
            >
              {style}
            </button>
          ))}
        </div>
      </main>

      <footer className="period-footer">
        <button className="next-button" onClick={handleNext}>
          다음
        </button>
      </footer>
    </div>
  );
};

export default StylePage;

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IoArrowBackSharp } from "react-icons/io5";
import { useQueryNavigator } from "../hook/useQueryNavigator";
import "../WhoPage.css";

const whoOptions = ["혼자", "반려동물", "친구", "연인", "부모님", "기타"];

const WhoPage = () => {
  const location = useLocation();
  const navigate = useNavigate(); // ← 뒤로가기용
  const { goTo } = useQueryNavigator();

  const searchParams = new URLSearchParams(location.search);
  const regionIds = searchParams.get("region");
  const period = searchParams.get("period");
  const [selectedWho, setSelectedWho] = useState([]);

  const toggleWho = (who) => {
    if (selectedWho.includes(who)) {
      setSelectedWho(selectedWho.filter((item) => item !== who));
    } else {
      setSelectedWho([...selectedWho, who]);
    }
  };

  const handleNext = () => {
    if (selectedWho.length > 0) {
      goTo("/question/style", {
        regionIds,
        period,
        who: selectedWho.join(","),
      });
    } else {
      alert("동행자를 1명 이상 선택해주세요!");
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
        <span className="step-indicator">3/5</span>
      </header>

      <main className="period-content">
        <h1 className="title">👯 누구와 함께하나요?</h1>
        <p className="subtitle">해당하는 모든 항목을 선택해주세요.</p>
        <div className="period-grid">
          {whoOptions.map((who) => (
            <button
              key={who}
              className={`period-button ${
                selectedWho.includes(who) ? "selected" : ""
              }`}
              onClick={() => toggleWho(who)}
            >
              {who}
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

export default WhoPage;

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IoArrowBackSharp } from "react-icons/io5";
import { recommendHotels, getOptimalRecommendations } from "../utils/hotelRecommendation";
import "../BudgetPage.css";

const BudgetPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const region = searchParams.get("region") ?? searchParams.get("regionIds");
  const period = searchParams.get("period");
  const who = searchParams.get("who");
  const style = searchParams.get("style");

  const isDayTrip = period === "당일치기";

  const [totalAmountInput, setTotalAmountInput] = useState(""); // 빈칸에서 시작
  const totalAmount = Number(totalAmountInput.replaceAll(",", "")) || 0;

  const [budget, setBudget] = useState({
    숙소: isDayTrip ? 0 : 25,
    식비: 25,
    관광: 25,
    기타: 25,
  });

  const [showTooltip, setShowTooltip] = useState(false);
  const [showHotelRecommendations, setShowHotelRecommendations] = useState(false);
  const [hotelRecommendations, setHotelRecommendations] = useState(null);
  const tooltipBtnRef = useRef(null);
  const tooltipBoxRef = useRef(null);

  useEffect(() => {
    if (isDayTrip) setBudget((prev) => ({ ...prev, 숙소: 0 }));
  }, [isDayTrip]);

  const formatNumber = (n) =>
    typeof n === "number" && !Number.isNaN(n) ? n.toLocaleString("ko-KR") : "";
  const formatCurrency = (n) => `₩${formatNumber(Math.round(n || 0))}`;

  const handleTotalAmountChange = (e) => {
    const raw = e.target.value.replace(/,/g, "").replace(/\D/g, "");
    setTotalAmountInput(formatNumber(Number(raw)));
  };

  const handleChange = (key, val) => {
    setBudget((p) => ({ ...p, [key]: Number(val) }));
  };

  const calcAmount = (p) => (p / 100) * totalAmount;
  const totalPercent = Object.values(budget).reduce((a, b) => a + b, 0);

  const handleSubmit = () => {
    if (!totalAmount) return alert("총 예산 금액을 입력해주세요.");
    if (totalPercent !== 100)
      return alert("총 예산 비율이 100%가 되도록 조정해주세요.");

    const budgetData = {
      region,
      period,
      who,
      style,
      totalAmount,
      budget,
      breakdown: {
        숙소: calcAmount(budget.숙소),
        식비: calcAmount(budget.식비),
        관광: calcAmount(budget.관광),
        기타: calcAmount(budget.기타),
      },
    };

    console.log(budgetData);
    
    // 1박 이상이고 숙소 예산이 있을 때 호텔 추천
    if (!isDayTrip && budget.숙소 > 0) {
      const nights = period === "1박2일" ? 1 : period === "2박3일" ? 2 : period === "3박4일" ? 3 : 1;
      const hotelBudget = calcAmount(budget.숙소);
      const budgetPerNight = hotelBudget / nights;
      
      const recommendations = getOptimalRecommendations(budgetPerNight, nights, {
        location: region
      });
      
      setHotelRecommendations(recommendations);
      setShowHotelRecommendations(true);
    } else {
      alert("예산 설정 완료!");
    }
  };

  const handleBack = () => navigate(-1);

  useEffect(() => {
    if (!showTooltip) return;
    const onDocClick = (e) => {
      if (
        tooltipBtnRef.current?.contains(e.target) ||
        tooltipBoxRef.current?.contains(e.target)
      )
        return;
      setShowTooltip(false);
    };
    const onEsc = (e) => e.key === "Escape" && setShowTooltip(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [showTooltip]);

  const Row = ({ label, keyName }) => {
    const value = budget[keyName];
    const fillStyle = {
      background: `linear-gradient(to right, var(--range-fill) ${value}%, var(--range-bg) ${value}%)`,
    };
    return (
      <div className="budget-item compact">
        <div className="label-row">
          <label className="label">
            {label}
            {keyName === "기타" && (
              <>
                <button
                  ref={tooltipBtnRef}
                  type="button"
                  className="tooltip-icon"
                  aria-haspopup="dialog"
                  aria-expanded={showTooltip}
                  aria-label="기타 항목 설명 열기"
                  onClick={() => setShowTooltip((v) => !v)}
                >
                  ?
                </button>
                {showTooltip && (
                  <div
                    ref={tooltipBoxRef}
                    className="tooltip-box"
                    role="dialog"
                    aria-label="기타 항목 설명"
                  >
                    기념품, 쇼핑, 팁 등 다양한 기타 지출이 포함돼요.
                  </div>
                )}
              </>
            )}
            : <span className="percent">{value}%</span>
            {totalAmount > 0 && (
              <span className="amount">
                {" "}
                ({formatCurrency(calcAmount(value))})
              </span>
            )}
          </label>
        </div>

        <input
          className="range"
          type="range"
          min="0"
          max="100"
          step="1"
          value={value}
          onChange={(e) => handleChange(keyName, e.target.value)}
          style={fillStyle}
        />
      </div>
    );
  };

  return (
    <div className="container no-scroll">
      {/* Header 고정 */}
      <header className="region-header">
        <button className="back-button" onClick={handleBack}>
          <IoArrowBackSharp size={24} />
        </button>
        <span className="step-indicator">5/5</span>
      </header>

      {/* 한 화면에 맞춰 딱 떨어지는 본문 */}
      <main className="budget-fit">
        <h1 className="title center">💰 예산을 분배해주세요</h1>
        <p className="subtitle center">
          총 예산을 입력하고, 항목별 비율을 %로 조정하세요 (총합 100%)
        </p>

        {/* 총 예산 입력 (압축) */}
        <div className="total-input compact">
          <label htmlFor="totalBudget" className="total-label">
            총 예산 (₩)
          </label>
          <input
            type="text"
            id="totalBudget"
            className="total-field"
            placeholder="예: 200,000"
            value={totalAmountInput}
            onChange={handleTotalAmountChange}
            inputMode="numeric"
            autoComplete="off"
          />
        </div>

        {/* 항목 4개 */}
        <div className="budget-grid compact">
          {!isDayTrip && <Row label="숙소" keyName="숙소" />}
          <Row label="식비" keyName="식비" />
          <Row label="관광" keyName="관광" />
          <Row label="기타" keyName="기타" />
        </div>

        <div className={`total-check ${totalPercent === 100 ? "ok" : "warn"}`}>
          총합: {totalPercent}%
        </div>
      </main>

      {/* Footer 고정 */}
      <footer className="period-footer">
        <button className="next-button" onClick={handleSubmit}>
          제출
        </button>
      </footer>

      {/* 호텔 추천 모달 */}
      {showHotelRecommendations && hotelRecommendations && (
        <div className="hotel-modal-overlay">
          <div className="hotel-modal">
            <div className="hotel-modal-header">
              <h2>🏨 예산에 맞는 호텔 추천</h2>
              <button 
                className="close-button"
                onClick={() => setShowHotelRecommendations(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="hotel-modal-content">
              <p className="recommendation-message">{hotelRecommendations.message}</p>
              
              {hotelRecommendations.recommendations.length > 0 ? (
                <div className="hotel-list">
                  {hotelRecommendations.recommendations.map((hotel) => (
                    <div key={hotel.id} className="hotel-card">
                      <img 
                        src={hotel.image} 
                        alt={hotel.name}
                        className="hotel-image"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400';
                        }}
                      />
                      <div className="hotel-info">
                        <h3 className="hotel-name">{hotel.name}</h3>
                        <p className="hotel-location">{hotel.location}</p>
                        <p className="hotel-description">{hotel.description}</p>
                        <div className="hotel-rating">⭐ {hotel.rating}</div>
                        <div className="hotel-amenities">
                          {hotel.amenities.slice(0, 3).map((amenity, index) => (
                            <span key={index} className="amenity-tag">{amenity}</span>
                          ))}
                        </div>
                        <div className="hotel-price">
                          <span className="price-per-night">
                            ￦{hotel.price_per_night.toLocaleString()}/박
                          </span>
                          <span className="total-price">
                            총 ￦{hotel.total_price.toLocaleString()} ({hotel.nights}박)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-hotels">
                  <p>😔 예산 범위에 맞는 숙소를 찾을 수 없습니다.</p>
                  <p>예산을 조정하거나 다른 지역을 선택해보세요.</p>
                </div>
              )}
            </div>
            
            <div className="hotel-modal-footer">
              <button 
                className="close-modal-button"
                onClick={() => setShowHotelRecommendations(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetPage;

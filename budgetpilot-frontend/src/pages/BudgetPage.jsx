import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IoArrowBackSharp } from "react-icons/io5";
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
    
    // 1박 이상이고 숙소 예산이 있을 때 호텔 페이지로 이동
    if (!isDayTrip && budget.숙소 > 0) {
      const queryParams = new URLSearchParams({
        region: region || '',
        period: period || '',
        totalAmount: totalAmount.toString(),
        budget: JSON.stringify(budget),
        breakdown: JSON.stringify(budgetData.breakdown)
      });
      
      navigate(`/hotel?${queryParams.toString()}`);
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
          {!isDayTrip && budget.숙소 > 0 ? "호텔 추천 보기" : "제출"}
        </button>
      </footer>
    </div>
  );
};

export default BudgetPage;

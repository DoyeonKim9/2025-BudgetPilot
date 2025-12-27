import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IoArrowBackSharp } from "react-icons/io5";
import {
  MdHotel,
  MdRestaurant,
  MdCameraAlt,
  MdMoreHoriz,
} from "react-icons/md";
import "../BudgetPage.css";

/**
 * ✅ 핵심 수정
 * - BudgetRow 컴포넌트를 BudgetPage 밖(파일 최상단)으로 빼서
 *   리렌더 시 input이 언마운트/리마운트 되며 포커스가 날아가는 문제 해결
 */

const BudgetRow = ({
  label,
  keyName,
  value,
  onChange,
  showTooltip,
  onToggleTooltip,
  tooltipBtnRef,
  tooltipBoxRef,
  icon,
  color,
}) => {
  return (
    <div className="budget-card" style={{ borderLeftColor: color }}>
      <div className="budget-card-header">
        <div
          className="budget-icon-wrapper"
          style={{
            backgroundColor: `${color}15`,
            color: color,
          }}
        >
          {icon}
        </div>

        <div className="budget-card-title-area">
          <label className="budget-card-label" htmlFor={`budget-${keyName}`}>
            {label}
          </label>

          {keyName === "기타" && (
            <>
              <button
                ref={tooltipBtnRef}
                type="button"
                className="tooltip-icon"
                aria-haspopup="dialog"
                aria-expanded={showTooltip}
                aria-label="기타 항목 설명 열기"
                onClick={onToggleTooltip}
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
        </div>
      </div>

      <div className="budget-input-wrapper">
        <span className="currency-unit">₩</span>
        <input
          id={`budget-${keyName}`}
          className="budget-input"
          type="text"
          placeholder="0"
          value={value}
          onChange={onChange}
          inputMode="numeric"
          autoComplete="off"
        />
      </div>
    </div>
  );
};

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
    숙소: "",
    식비: "",
    관광: "",
    기타: "",
  });

  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipBtnRef = useRef(null);
  const tooltipBoxRef = useRef(null);

  useEffect(() => {
    if (isDayTrip) setBudget((prev) => ({ ...prev, 숙소: "" }));
  }, [isDayTrip]);

  const formatNumber = (n) =>
    typeof n === "number" && !Number.isNaN(n) ? n.toLocaleString("ko-KR") : "";
  const formatCurrency = (n) => `₩${formatNumber(Math.round(n || 0))}`;

  const handleTotalAmountChange = (e) => {
    const input = e.target;
    const inputValue = input.value;
    const raw = inputValue.replace(/,/g, "").replace(/\D/g, "");

    if (raw === "") {
      setTotalAmountInput("");
      return;
    }

    const numValue = Number(raw);
    if (!isNaN(numValue)) {
      const formatted = formatNumber(numValue);
      setTotalAmountInput(formatted);

      // 포맷팅 후 커서를 끝으로 이동
      setTimeout(() => {
        input.setSelectionRange(formatted.length, formatted.length);
      }, 0);
    }
  };

  const handleBudgetChange = useCallback((key, e) => {
    const input = e.target;
    const inputValue = input.value;
    const raw = inputValue.replace(/,/g, "").replace(/\D/g, "");

    if (raw === "") {
      setBudget((p) => ({ ...p, [key]: "" }));
      return;
    }

    const numValue = Number(raw);
    if (!isNaN(numValue)) {
      const formatted = formatNumber(numValue);

      setBudget((p) => ({ ...p, [key]: formatted }));

      // 포맷팅 후 커서를 끝으로 이동
      setTimeout(() => {
        input.setSelectionRange(formatted.length, formatted.length);
      }, 0);
    }
  }, []);

  const getBudgetAmount = (val) => {
    return Number((val ?? "").replaceAll(",", "")) || 0;
  };

  const totalBudgetAmount = Object.values(budget).reduce((sum, val) => {
    return sum + getBudgetAmount(val);
  }, 0);

  const handleSubmit = () => {
    if (!totalAmount) return alert("총 예산 금액을 입력해주세요.");
    if (Math.abs(totalBudgetAmount - totalAmount) > 100)
      return alert(
        `입력한 항목별 예산 합계(₩${formatNumber(
          totalBudgetAmount
        )})가 총 예산(₩${formatNumber(totalAmount)})과 일치하지 않습니다.`
      );

    const breakdown = {
      숙소: getBudgetAmount(budget.숙소),
      식비: getBudgetAmount(budget.식비),
      관광: getBudgetAmount(budget.관광),
      기타: getBudgetAmount(budget.기타),
    };

    const budgetData = {
      region,
      period,
      who,
      style,
      totalAmount,
      budget: {
        숙소: breakdown.숙소,
        식비: breakdown.식비,
        관광: breakdown.관광,
        기타: breakdown.기타,
      },
      breakdown,
    };

    console.log(budgetData);

    // 1박 이상이고 숙소 예산이 있을 때 호텔 페이지로 이동
    if (!isDayTrip && breakdown.숙소 > 0) {
      // 기존 URL 파라미터 유지
      const queryParams = new URLSearchParams(location.search);
      queryParams.set("region", region || "");
      queryParams.set("period", period || "");
      queryParams.set("who", who || "");
      queryParams.set("style", style || "");
      queryParams.set("totalAmount", totalAmount.toString());
      queryParams.set("budget", JSON.stringify(budgetData.budget));
      queryParams.set("breakdown", JSON.stringify(breakdown));

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

  const getColor = (keyName) => {
    switch (keyName) {
      case "숙소":
        return "var(--color-accommodation)";
      case "식비":
        return "var(--color-food)";
      case "관광":
        return "var(--color-tourism)";
      case "기타":
        return "var(--color-etc)";
      default:
        return "var(--color-default)";
    }
  };

  const getIcon = (keyName) => {
    switch (keyName) {
      case "숙소":
        return <MdHotel className="budget-icon" />;
      case "식비":
        return <MdRestaurant className="budget-icon" />;
      case "관광":
        return <MdCameraAlt className="budget-icon" />;
      case "기타":
        return <MdMoreHoriz className="budget-icon" />;
      default:
        return null;
    }
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

      {/* 본문 */}
      <main className="budget-fit">
        <div className="budget-header">
          <h1 className="title">💰 예산을 분배해주세요</h1>
          <p className="subtitle">
            총 예산을 입력하고, 각 항목에 사용할 금액을 직접 입력하세요
          </p>
        </div>

        {/* 총 예산 입력 */}
        <div className="total-budget-card">
          <label htmlFor="totalBudget" className="total-label">
            총 예산
          </label>
          <div className="total-input-wrapper">
            <span className="currency-unit-large">₩</span>
            <input
              type="text"
              id="totalBudget"
              className="total-field"
              placeholder="200,000"
              value={totalAmountInput}
              onChange={handleTotalAmountChange}
              inputMode="numeric"
              autoComplete="off"
            />
          </div>
        </div>

        {/* 항목들 */}
        <div className="budget-grid">
          {!isDayTrip && (
            <BudgetRow
              label="숙소"
              keyName="숙소"
              value={budget.숙소 || ""}
              onChange={(e) => handleBudgetChange("숙소", e)}
              showTooltip={false}
              onToggleTooltip={() => {}}
              icon={getIcon("숙소")}
              color={getColor("숙소")}
            />
          )}

          <BudgetRow
            label="식비"
            keyName="식비"
            value={budget.식비 || ""}
            onChange={(e) => handleBudgetChange("식비", e)}
            showTooltip={false}
            onToggleTooltip={() => {}}
            icon={getIcon("식비")}
            color={getColor("식비")}
          />

          <BudgetRow
            label="관광"
            keyName="관광"
            value={budget.관광 || ""}
            onChange={(e) => handleBudgetChange("관광", e)}
            showTooltip={false}
            onToggleTooltip={() => {}}
            icon={getIcon("관광")}
            color={getColor("관광")}
          />

          <BudgetRow
            label="기타"
            keyName="기타"
            value={budget.기타 || ""}
            onChange={(e) => handleBudgetChange("기타", e)}
            showTooltip={showTooltip}
            onToggleTooltip={() => setShowTooltip((v) => !v)}
            tooltipBtnRef={tooltipBtnRef}
            tooltipBoxRef={tooltipBoxRef}
            icon={getIcon("기타")}
            color={getColor("기타")}
          />
        </div>

        <div
          className={`total-check ${
            Math.abs(totalBudgetAmount - totalAmount) <= 100 ? "ok" : "warn"
          }`}
        >
          <div className="total-check-label">예산 확인</div>
          <div className="total-check-amounts">
            <span className="total-check-item">
              입력 합계 <strong>{formatCurrency(totalBudgetAmount)}</strong>
            </span>
            <span className="total-check-divider">/</span>
            <span className="total-check-item">
              총 예산 <strong>{formatCurrency(totalAmount)}</strong>
            </span>
          </div>
        </div>
      </main>

      {/* Footer 고정 */}
      <footer className="period-footer">
        <button className="next-button" onClick={handleSubmit}>
          {!isDayTrip && getBudgetAmount(budget.숙소) > 0
            ? "호텔 추천 보기"
            : "제출"}
        </button>
      </footer>
    </div>
  );
};

export default BudgetPage;

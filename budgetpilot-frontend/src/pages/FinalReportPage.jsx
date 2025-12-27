import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IoArrowBackSharp, IoLocation, IoTime } from "react-icons/io5";
import { MdHotel, MdRestaurant, MdCameraAlt } from "react-icons/md";
import "../FinalReportPage.css";

const BACKEND_URL =
  window.__BACKEND__ ||
  import.meta?.env?.VITE_BACKEND_URL ||
  "http://localhost:8000";

const FinalReportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const region =
    searchParams.get("region") || searchParams.get("regionIds") || "강릉";
  const period = searchParams.get("period") || "2박3일";
  const who = decodeURIComponent(searchParams.get("who") || "");
  const style = decodeURIComponent(searchParams.get("style") || "");
  const totalAmount = Number(searchParams.get("totalAmount")) || 0;
  const hotelId = searchParams.get("hotelId") || "";
  const hotelName = decodeURIComponent(searchParams.get("hotelName") || "");
  
  const budgetStr = useMemo(
    () => searchParams.get("budget") || "{}",
    [searchParams]
  );
  const budget = useMemo(() => {
    try {
      return JSON.parse(budgetStr) || {};
    } catch (e) {
      return {};
    }
  }, [budgetStr]);

  const breakdownStr = useMemo(
    () => searchParams.get("breakdown") || "{}",
    [searchParams]
  );

  const breakdown = useMemo(() => {
    try {
      return JSON.parse(breakdownStr) || {};
    } catch (e) {
      return {};
    }
  }, [breakdownStr]);

  const selectedRestaurantsStr = searchParams.get("selectedRestaurants") || "[]";
  const selectedRestaurants = useMemo(() => {
    try {
      // URLSearchParams.get()은 자동으로 디코딩하므로 바로 파싱
      return JSON.parse(selectedRestaurantsStr);
    } catch (e) {
      console.error("Failed to parse selectedRestaurants:", e, selectedRestaurantsStr);
      return [];
    }
  }, [selectedRestaurantsStr]);

  const selectedTouristsStr = searchParams.get("selectedTourists") || "[]";
  const selectedTourists = useMemo(() => {
    try {
      // URLSearchParams.get()은 자동으로 디코딩하므로 바로 파싱
      const parsed = JSON.parse(selectedTouristsStr);
      console.log("Selected Tourists:", parsed); // 디버깅용
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse selectedTourists:", e, selectedTouristsStr);
      return [];
    }
  }, [selectedTouristsStr]);

  const restaurantTotalPrice = Number(searchParams.get("restaurantTotalPrice")) || 0;
  const touristTotalPrice = Number(searchParams.get("touristTotalPrice")) || 0;

  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 기간에서 박수 추출
  const nights = useMemo(() => {
    const match = period.match(/(\d+)박/);
    return match ? Number(match[1]) : 2;
  }, [period]);

  useEffect(() => {
    const generateSchedule = async () => {
      setLoading(true);
      setError("");

      try {
        // LLM API 호출 (백엔드 엔드포인트가 있다면 사용, 없으면 임시 데이터)
        // TODO: 실제 백엔드 API 엔드포인트로 교체
        const scheduleData = await generateScheduleWithLLM({
          region,
          period,
          nights,
          who,
          style,
          hotelName,
          selectedRestaurants,
          selectedTourists,
          budget: breakdown,
        });

        setSchedule(scheduleData);
      } catch (err) {
        console.error("일정 생성 실패:", err);
        // 에러 발생 시 기본 일정 생성
        setSchedule(generateDefaultSchedule());
      } finally {
        setLoading(false);
      }
    };

    generateSchedule();
  }, [region, period, nights, who, style, hotelName, selectedRestaurants, selectedTourists, breakdown]);

  // LLM으로 일정 생성 (임시 구현 - 실제로는 백엔드 API 호출)
  const generateScheduleWithLLM = async (data) => {
    // TODO: 실제 백엔드 API 호출
    // const response = await fetch(`${BACKEND_URL}/schedule/generate`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data)
    // });
    // return await response.json();

    // 임시: 기본 일정 생성
    return generateDefaultSchedule();
  };

  // 기본 일정 생성 (LLM 대신 사용)
  const generateDefaultSchedule = () => {
    const days = [];
    const restaurantNames = selectedRestaurants.map(r => r.name);
    const touristNames = selectedTourists.map(t => t.name);

    for (let day = 1; day <= nights + 1; day++) {
      const daySchedule = {
        day,
        date: `Day ${day}`,
        activities: [],
      };

      // 아침
      if (day === 1) {
        daySchedule.activities.push({
          time: "09:00",
          type: "hotel",
          title: "숙소 체크인",
          description: `${hotelName}에서 체크인하고 짐을 풀어요.`,
          location: hotelName,
        });
      }

      // 점심
      if (restaurantNames.length > 0) {
        const lunchIndex = (day - 1) % restaurantNames.length;
        daySchedule.activities.push({
          time: "12:00",
          type: "restaurant",
          title: restaurantNames[lunchIndex] || "점심 식사",
          description: "선택한 맛집에서 점심을 즐겨요.",
          location: region,
        });
      }

      // 관광지
      if (touristNames.length > 0) {
        const touristIndex = (day - 1) % touristNames.length;
        daySchedule.activities.push({
          time: "14:00",
          type: "tourist",
          title: touristNames[touristIndex] || "관광지 탐방",
          description: "선택한 관광지를 둘러봐요.",
          location: region,
        });
      }

      // 저녁
      if (restaurantNames.length > 1) {
        const dinnerIndex = (day) % restaurantNames.length;
        daySchedule.activities.push({
          time: "18:00",
          type: "restaurant",
          title: restaurantNames[dinnerIndex] || "저녁 식사",
          description: "선택한 맛집에서 저녁을 즐겨요.",
          location: region,
        });
      }

      // 마지막 날 체크아웃
      if (day === nights + 1) {
        daySchedule.activities.push({
          time: "11:00",
          type: "hotel",
          title: "숙소 체크아웃",
          description: `${hotelName}에서 체크아웃하고 여행을 마무리해요.`,
          location: hotelName,
        });
      }

      days.push(daySchedule);
    }

    return {
      summary: {
        region,
        period,
        nights,
        who,
        style,
        totalBudget: totalAmount,
        usedBudget: (breakdown.숙소 || 0) + restaurantTotalPrice + touristTotalPrice,
      },
      days,
      recommendations: [
        `${region}에서 ${period} 동안 즐거운 여행 되세요!`,
        "선택하신 숙소와 식당, 관광지를 중심으로 일정을 구성했습니다.",
        "날씨를 확인하고 편안한 복장으로 준비하세요.",
      ],
    };
  };

  const handleBack = () => navigate(-1);
  const formatCurrency = (amount) =>
    `₩${(Number(amount) || 0).toLocaleString()}`;

  const getActivityIcon = (type) => {
    switch (type) {
      case "hotel":
        return <MdHotel className="activity-icon" />;
      case "restaurant":
        return <MdRestaurant className="activity-icon" />;
      case "tourist":
        return <MdCameraAlt className="activity-icon" />;
      default:
        return null;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "hotel":
        return "var(--color-accommodation)";
      case "restaurant":
        return "var(--color-food)";
      case "tourist":
        return "var(--color-tourism)";
      default:
        return "#666";
    }
  };

  if (loading) {
    return (
      <div className="final-report-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>여행 일정을 생성하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (error && !schedule) {
    return (
      <div className="final-report-page">
        <div className="error-container">
          <h2>일정 생성 실패</h2>
          <p>{error}</p>
          <button onClick={handleBack}>돌아가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="final-report-page">
      {/* Header */}
      <header className="report-header">
        <button className="back-button" onClick={handleBack}>
          <IoArrowBackSharp size={22} />
        </button>
        <span className="page-title">📋 여행 일정 리포트</span>
      </header>

      {/* Summary Card */}
      <div className="summary-section">
        <div className="summary-card">
          <h2>여행 요약</h2>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">여행지</span>
              <span className="summary-value">{region}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">기간</span>
              <span className="summary-value">{period}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">동행</span>
              <span className="summary-value">{who.trim() || "미지정"}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">스타일</span>
              <span className="summary-value">{style.trim() || "미지정"}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">총 예산</span>
              <span className="summary-value highlight">
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">사용 예산</span>
              <span className="summary-value">
                {formatCurrency(
                  (breakdown.숙소 || 0) + restaurantTotalPrice + touristTotalPrice
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Items */}
      <div className="selected-items-section">
        <div className="selected-card">
          <h3>선택한 숙소</h3>
          <div className="selected-item">
            <MdHotel className="selected-icon" />
            <span>{hotelName || "미선택"}</span>
          </div>
        </div>

        <div className="selected-card">
          <h3>선택한 식당 ({selectedRestaurants.length}개)</h3>
          {selectedRestaurants.length > 0 ? (
            selectedRestaurants.map((restaurant, idx) => (
              <div key={idx} className="selected-item">
                <MdRestaurant className="selected-icon" />
                <span>{restaurant.name}</span>
                <span className="selected-price">
                  {formatCurrency(restaurant.price)}
                </span>
              </div>
            ))
          ) : (
            <p className="no-selection">선택한 식당이 없습니다.</p>
          )}
        </div>

        <div className="selected-card">
          <h3>선택한 관광지 ({selectedTourists.length}개)</h3>
          {selectedTourists.length > 0 ? (
            selectedTourists.map((tourist, idx) => (
              <div key={idx} className="selected-item">
                <MdCameraAlt className="selected-icon" />
                <span>{tourist.name}</span>
                <span className="selected-price">
                  {tourist.price === 0 ? "무료" : formatCurrency(tourist.price)}
                </span>
              </div>
            ))
          ) : (
            <p className="no-selection">선택한 관광지가 없습니다.</p>
          )}
        </div>
      </div>

      {/* Schedule */}
      {schedule && (
        <main className="schedule-content">
          <h2 className="schedule-title">📅 상세 일정</h2>
          {schedule.days.map((day, dayIdx) => (
            <div key={dayIdx} className="day-card">
              <div className="day-header">
                <h3>{day.date}</h3>
              </div>
              <div className="activities-list">
                {day.activities.map((activity, actIdx) => (
                  <div
                    key={actIdx}
                    className="activity-item"
                    style={{ borderLeftColor: getActivityColor(activity.type) }}
                  >
                    <div className="activity-time">
                      <IoTime className="time-icon" />
                      <span>{activity.time}</span>
                    </div>
                    <div className="activity-content">
                      <div className="activity-header">
                        <div
                          className="activity-icon-wrapper"
                          style={{
                            backgroundColor: `${getActivityColor(activity.type)}15`,
                            color: getActivityColor(activity.type),
                          }}
                        >
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="activity-info">
                          <h4 className="activity-title">{activity.title}</h4>
                          <div className="activity-location">
                            <IoLocation className="location-icon-small" />
                            <span>{activity.location}</span>
                          </div>
                        </div>
                      </div>
                      <p className="activity-description">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </main>
      )}

      {/* Recommendations */}
      {schedule && schedule.recommendations && (
        <div className="recommendations-section">
          <div className="recommendations-card">
            <h3>💡 여행 팁</h3>
            <ul className="recommendations-list">
              {schedule.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="report-footer">
        <button className="share-button" onClick={() => alert("공유 기능은 준비 중입니다.")}>
          일정 공유하기
        </button>
      </footer>
    </div>
  );
};

export default FinalReportPage;


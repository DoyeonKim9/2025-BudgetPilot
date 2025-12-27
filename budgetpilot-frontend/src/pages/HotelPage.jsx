import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IoArrowBackSharp, IoStar, IoLocation } from "react-icons/io5";
import "../HotelPage.css";

const BACKEND_URL =
  window.__BACKEND__ ||
  import.meta?.env?.VITE_BACKEND_URL ||
  "http://localhost:8000";

const HotelPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  // 질문 페이지에서 전달하는 기본 파라미터
  const region =
    searchParams.get("region") || searchParams.get("regionIds") || "서울";
  const period = searchParams.get("period") || "1박2일";
  const totalAmount = Number(searchParams.get("totalAmount")) || 0;
  const budgetStr = useMemo(
    () => searchParams.get("budget") || "{}",
    [searchParams]
  );
  const budget = useMemo(() => {
    try {
      return JSON.parse(budgetStr) || {};
    } catch (e) {
      console.warn("Invalid budget JSON", e);
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
      console.warn("Invalid breakdown JSON", e);
      return {};
    }
  }, [breakdownStr]);

  const [hotels, setHotels] = useState([]);
  const [message, setMessage] = useState("");
  const [nights, setNights] = useState(1);
  const [budgetPerNight, setBudgetPerNight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const deriveNights = (periodValue) => {
      if (!periodValue) return 1;
      const match = periodValue.match(/(\d+)박/);
      if (match) {
        const nightsNum = Number(match[1]);
        if (!Number.isNaN(nightsNum) && nightsNum > 0) return nightsNum;
      }
      if (periodValue.includes("당일")) return 1;
      if (periodValue.includes("2박")) return 2;
      if (periodValue.includes("3박")) return 3;
      return 1;
    };

    const calcBudgetPerNight = (n) => {
      if (!n || n <= 0) return 0;
      const lodgingBudget = breakdown?.숙소 ?? 0;
      if (lodgingBudget > 0) return Math.round(lodgingBudget / n);
      if (totalAmount > 0) return Math.round(totalAmount / n);
      return 0;
    };

    (async () => {
      setLoading(true);
      setErr("");

      try {
        const derivedNights = deriveNights(period);
        setNights(derivedNights);

        const perNight = calcBudgetPerNight(derivedNights);
        setBudgetPerNight(perNight);

        const roomsUrl = new URL(`${BACKEND_URL}/rooms`);
        if (region) roomsUrl.searchParams.set("city_keyword", region);
        if (perNight > 0)
          roomsUrl.searchParams.set("max_price", String(perNight));
        roomsUrl.searchParams.set("include_images", "3");

        const res = await fetch(roomsUrl.toString());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let rooms = await res.json();
        let usedFallback = false;

        if (rooms.length === 0 && region) {
          usedFallback = true;
          const fallbackUrl = new URL(`${BACKEND_URL}/rooms`);
          if (perNight > 0)
            fallbackUrl.searchParams.set("max_price", String(perNight));
          fallbackUrl.searchParams.set("include_images", "3");

          const fallbackRes = await fetch(fallbackUrl.toString());
          if (fallbackRes.ok) {
            rooms = await fallbackRes.json();
          }
        }

        const mapped = rooms.map((room, idx) => {
          const pricePerNight = Number(room.daily_price) || 0;
          const totalPrice = pricePerNight * Math.max(derivedNights, 1);
          const imageUrl =
            room.images?.[0] ||
            "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800";

          const ratingValue = Number(room.rating_star_score);

          const amenities = [
            ratingValue
              ? `리뷰 ${room.review_count}개 · 별점 ${ratingValue.toFixed(1)}`
              : `리뷰 ${room.review_count}개`,
            `침대 ${room.bed_count}개 · 욕실 ${room.bathroom_count}개`,
            `최대 ${room.headcount_capacity}인 · 청소비 ₩${(
              room.cleaning_fee || 0
            ).toLocaleString()}`,
          ];

          return {
            id: room.room_id || `r-${idx}`,
            name: room.title || "(이름 없음)",
            image: imageUrl,
            rating: ratingValue ? ratingValue.toFixed(1) : "-",
            type: `${room.bedroom_count || 0}BR · ${
              room.headcount_capacity || 0
            }인`,
            location: room.address || region,
            description: room.description || "상세 정보가 없습니다.",
            amenities,
            price_per_night: pricePerNight,
            total_price: totalPrice,
            nights: derivedNights,
            raw: room,
          };
        });

        setHotels(mapped);
        if (mapped.length > 0) {
          const prefix = usedFallback
            ? "입력한 지역과 가까운 다른 숙소까지 함께 "
            : "";
          setMessage(
            `${prefix}조건에 맞는 숙소 ${mapped.length.toLocaleString()}곳을 찾았어요.`
          );
        } else {
          setMessage("");
        }
      } catch (e) {
        setErr(e.message || "검색 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, [region, period, totalAmount, breakdownStr, location.search]);

  const handleBack = () => navigate(-1);
  const handleGoToBudget = () => navigate(-1);
  const formatCurrency = (amount) =>
    `￦${(Number(amount) || 0).toLocaleString()}`;

  if (loading) {
    return (
      <div className="hotel-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>호텔을 찾고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="hotel-page">
      {/* Header */}
      <header className="hotel-header">
        <button className="back-button" onClick={handleBack}>
          <IoArrowBackSharp size={22} />
        </button>
        <span className="page-title">🏨 숙소 추천</span>
      </header>

      {/* Budget Summary */}
      <div className="budget-summary">
        <div className="summary-card">
          <h3>예산 요약</h3>
          <div className="budget-details">
            <div className="budget-item">
              <span className="budget-label">총 예산</span>
              <span className="budget-value">
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <div className="budget-item">
              <span className="budget-label">숙소 예산</span>
              <span className="budget-value highlight">
                {formatCurrency(breakdown?.숙소 || 0)}
              </span>
            </div>
            <div className="budget-item">
              <span className="budget-label">1박 예산(최대)</span>
              <span className="budget-value highlight">
                {formatCurrency(budgetPerNight)}
              </span>
            </div>
            <div className="budget-item">
              <span className="budget-label">숙박 기간</span>
              <span className="budget-value">{nights}박</span>
            </div>
          </div>
        </div>
      </div>

      {/* GPT 메시지 / 에러 */}
      {message && (
        <div className="recommendation-banner good">
          <h2>{message}</h2>
        </div>
      )}
      {err && (
        <div className="recommendation-banner error">
          <h2>검색 실패</h2>
          <p>{err}</p>
        </div>
      )}

      {/* Hotel List */}
      <main className="hotel-content">
        {hotels.length > 0 ? (
          <div className="hotel-grid">
            {hotels.map((hotel) => (
              <div key={hotel.id} className="hotel-card">
                <div className="hotel-image-container">
                  <img
                    src={hotel.image}
                    alt={hotel.name}
                    className="hotel-image"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800";
                    }}
                  />
                  <div className="hotel-rating">
                    <IoStar className="star-icon" />
                    <span>{hotel.rating}</span>
                  </div>
                </div>

                <div className="hotel-info">
                  <div className="hotel-header">
                    <h3 className="hotel-name">{hotel.name}</h3>
                  </div>
                  <span className="hotel-type">{hotel.type}</span>

                  <div className="hotel-location">
                    <IoLocation className="location-icon" />
                    <span>{hotel.location}</span>
                  </div>

                  <p className="hotel-description">{hotel.description}</p>

                  <div className="hotel-amenities">
                    {hotel.amenities.slice(0, 4).map((amenity, index) => (
                      <span key={index} className="amenity-tag">
                        {amenity}
                      </span>
                    ))}
                    {hotel.amenities.length > 4 && (
                      <span className="amenity-tag more">
                        +{hotel.amenities.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                <div className="hotel-price-section">
                  <div className="price-info">
                    <div className="price-per-night">
                      <span className="price-label">1박</span>
                      <span className="price-value">
                        {formatCurrency(hotel.price_per_night)}
                      </span>
                    </div>
                    <div className="total-price">
                      <span className="price-label">총 {hotel.nights}박</span>
                      <span className="price-value total">
                        {formatCurrency(hotel.total_price)}
                      </span>
                    </div>
                  </div>

                  <button className="select-button">선택하기</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-hotels">
            <div className="no-hotels-icon">🏨</div>
            <h3>예산에 맞는 호텔이 없습니다</h3>
            <p>예산을 조정하거나 다른 지역을 선택해보세요.</p>
            <button className="adjust-budget-button" onClick={handleGoToBudget}>
              예산 다시 설정하기
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="hotel-footer">
        <button className="back-to-budget-button" onClick={handleGoToBudget}>
          예산 수정하기
        </button>
      </footer>
    </div>
  );
};

export default HotelPage;

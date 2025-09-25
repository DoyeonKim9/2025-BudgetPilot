import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IoArrowBackSharp, IoStar, IoLocation, IoBed } from "react-icons/io5";
import { getOptimalRecommendations, generateRecommendationMessage } from "../utils/hotelRecommendation";
import "./HotelPage.css";

const HotelPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  // URL 파라미터에서 데이터 가져오기
  const region = searchParams.get("region");
  const period = searchParams.get("period");
  const totalAmount = Number(searchParams.get("totalAmount")) || 0;
  const budget = JSON.parse(searchParams.get("budget") || "{}");
  const breakdown = JSON.parse(searchParams.get("breakdown") || "{}");

  const [hotelRecommendations, setHotelRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 호텔 추천 데이터 생성
    const generateRecommendations = () => {
      const nights = period === "1박2일" ? 1 : period === "2박3일" ? 2 : period === "3박4일" ? 3 : 1;
      const hotelBudget = breakdown.숙소 || 0;
      const budgetPerNight = hotelBudget / nights;

      if (budgetPerNight <= 0) {
        setHotelRecommendations({
          message: "숙소 예산이 설정되지 않았습니다.",
          recommendations: [],
          totalBudget: 0
        });
        setLoading(false);
        return;
      }

      const recommendations = getOptimalRecommendations(budgetPerNight, nights, {
        location: region
      });

      const messageInfo = generateRecommendationMessage(budgetPerNight, nights, recommendations.recommendations.length);

      setHotelRecommendations({
        ...recommendations,
        messageInfo,
        budgetPerNight,
        nights
      });
      setLoading(false);
    };

    generateRecommendations();
  }, [region, period, breakdown.숙소]);

  const handleBack = () => navigate(-1);
  const handleGoToBudget = () => navigate(-1);

  const formatCurrency = (amount) => `￦${amount.toLocaleString()}`;

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
          <IoArrowBackSharp size={24} />
        </button>
        <span className="page-title">🏨 호텔 추천</span>
        <div className="header-spacer"></div>
      </header>

      {/* Budget Summary */}
      <div className="budget-summary">
        <div className="summary-card">
          <h3>예산 요약</h3>
          <div className="budget-details">
            <div className="budget-item">
              <span className="budget-label">총 예산</span>
              <span className="budget-value">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="budget-item">
              <span className="budget-label">숙소 예산</span>
              <span className="budget-value highlight">{formatCurrency(breakdown.숙소)}</span>
            </div>
            <div className="budget-item">
              <span className="budget-label">1박 예산</span>
              <span className="budget-value highlight">{formatCurrency(hotelRecommendations?.budgetPerNight || 0)}</span>
            </div>
            <div className="budget-item">
              <span className="budget-label">숙박 기간</span>
              <span className="budget-value">{hotelRecommendations?.nights}박</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendation Message */}
      {hotelRecommendations?.messageInfo && (
        <div className={`recommendation-banner ${hotelRecommendations.messageInfo.category.category}`}>
          <h2>{hotelRecommendations.messageInfo.message}</h2>
          <p>{hotelRecommendations.messageInfo.totalBudget}</p>
        </div>
      )}

      {/* Hotel List */}
      <main className="hotel-content">
        {hotelRecommendations?.recommendations.length > 0 ? (
          <div className="hotel-grid">
            {hotelRecommendations.recommendations.map((hotel) => (
              <div key={hotel.id} className="hotel-card">
                <div className="hotel-image-container">
                  <img 
                    src={hotel.image} 
                    alt={hotel.name}
                    className="hotel-image"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400';
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
                    <span className="hotel-type">{hotel.type}</span>
                  </div>
                  
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
                      <span className="price-value">{formatCurrency(hotel.price_per_night)}</span>
                    </div>
                    <div className="total-price">
                      <span className="price-label">총 {hotel.nights}박</span>
                      <span className="price-value total">{formatCurrency(hotel.total_price)}</span>
                    </div>
                  </div>
                  
                  <button className="select-button">
                    선택하기
                  </button>
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

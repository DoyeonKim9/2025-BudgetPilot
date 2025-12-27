import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IoArrowBackSharp, IoStar, IoLocation } from "react-icons/io5";
import { MdRestaurant, MdLocalCafe } from "react-icons/md";
import "../RestaurantPage.css";

const BACKEND_URL =
  window.__BACKEND__ ||
  import.meta?.env?.VITE_BACKEND_URL ||
  "http://localhost:8000";

const RestaurantPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const region =
    searchParams.get("region") || searchParams.get("regionIds") || "강릉";
  const period = searchParams.get("period") || "1박2일";
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

  const foodBudget = breakdown?.식비 || budget?.식비 || 0;
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurants, setSelectedRestaurants] = useState(new Set());
  const [totalSelectedPrice, setTotalSelectedPrice] = useState(0);
  const [loading, setLoading] = useState(true);

  // 강릉 지역 식당/카페 데이터 (임시)
  const gangneungRestaurants = [
    {
      id: "r-1",
      name: "강릉 커피거리 카페",
      type: "카페",
      location: "강릉시 창해로14번길",
      rating: 4.5,
      reviewCount: 234,
      price: 15000,
      description: "강릉 커피거리의 대표 카페. 원두의 깊은 맛과 아늑한 분위기로 유명합니다.",
      image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
    },
    {
      id: "r-2",
      name: "안목해변 회센터",
      type: "식당",
      location: "강릉시 안목해변",
      rating: 4.7,
      reviewCount: 456,
      price: 35000,
      description: "신선한 회와 해산물을 맛볼 수 있는 해변 인근 식당. 조식 특선이 인기입니다.",
      image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800",
    },
    {
      id: "r-3",
      name: "경포해수욕장 막국수집",
      type: "식당",
      location: "강릉시 경포동",
      rating: 4.3,
      reviewCount: 189,
      price: 12000,
      description: "강릉 특색 막국수와 해물파전이 유명한 식당. 가성비 최고입니다.",
      image: "https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=800",
    },
    {
      id: "r-4",
      name: "중앙시장 순두부찌개",
      type: "식당",
      location: "강릉시 중앙시장",
      rating: 4.4,
      reviewCount: 312,
      price: 10000,
      description: "강릉 중앙시장의 대표 맛집. 부드러운 순두부찌개와 밑반찬이 일품입니다.",
      image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800",
    },
    {
      id: "r-5",
      name: "오대산 산채비빔밥",
      type: "식당",
      location: "강릉시 옥계면",
      rating: 4.6,
      reviewCount: 278,
      price: 18000,
      description: "신선한 산채와 나물로 만든 비빔밥. 건강한 한끼 식사로 좋습니다.",
      image: "https://images.unsplash.com/photo-1572441713132-51c75654db73?w=800",
    },
    {
      id: "r-6",
      name: "바다뷰 카페",
      type: "카페",
      location: "강릉시 강동면",
      rating: 4.5,
      reviewCount: 198,
      price: 13000,
      description: "동해바다가 보이는 로컬 카페. 감성적인 분위기와 맛있는 디저트가 인기입니다.",
      image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800",
    },
    {
      id: "r-7",
      name: "강릉 대게 전문점",
      type: "식당",
      location: "강릉시 주문진읍",
      rating: 4.8,
      reviewCount: 567,
      price: 45000,
      description: "신선한 대게 요리를 맛볼 수 있는 전문점. 특별한 날 추천합니다.",
      image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800",
    },
    {
      id: "r-8",
      name: "커피향기",
      type: "카페",
      location: "강릉시 옥계면",
      rating: 4.4,
      reviewCount: 145,
      price: 11000,
      description: "로컬 원두를 직접 볶아 만드는 카페. 진한 커피 향이 일품입니다.",
      image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
    },
    {
      id: "r-9",
      name: "해변가 파스타집",
      type: "식당",
      location: "강릉시 경포동",
      rating: 4.3,
      reviewCount: 223,
      price: 22000,
      description: "바다를 보며 즐기는 이탈리안 요리. 로맨틱한 분위기의 레스토랑입니다.",
      image: "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800",
    },
    {
      id: "r-10",
      name: "강릉 전통 찻집",
      type: "카페",
      location: "강릉시 중앙시장",
      rating: 4.6,
      reviewCount: 167,
      price: 12000,
      description: "전통 차와 한과를 즐길 수 있는 찻집. 힐링 타임에 좋습니다.",
      image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800",
    },
  ];

  useEffect(() => {
    // TODO: 백엔드 API에서 식당 데이터 가져오기
    // 현재는 강릉 지역만 임시 데이터 사용
    if (region.includes("강릉") || region === "강릉") {
      setRestaurants(gangneungRestaurants);
    } else {
      // 다른 지역은 빈 배열 또는 기본 데이터
      setRestaurants([]);
    }
    setLoading(false);
  }, [region]);

  const handleRestaurantToggle = (restaurantId, price) => {
    setSelectedRestaurants((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(restaurantId)) {
        newSet.delete(restaurantId);
        setTotalSelectedPrice((prevPrice) => prevPrice - price);
      } else {
        // 예산 체크
        const newTotal = totalSelectedPrice + price;
        if (newTotal > foodBudget) {
          alert(`예산을 초과합니다! (현재: ₩${newTotal.toLocaleString()}, 예산: ₩${foodBudget.toLocaleString()})`);
          return prev;
        }
        newSet.add(restaurantId);
        setTotalSelectedPrice(newTotal);
      }
      return newSet;
    });
  };

  const handleBack = () => navigate(-1);
  const formatCurrency = (amount) =>
    `₩${(Number(amount) || 0).toLocaleString()}`;

  if (loading) {
    return (
      <div className="restaurant-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>식당을 찾고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="restaurant-page">
      {/* Header */}
      <header className="restaurant-header">
        <button className="back-button" onClick={handleBack}>
          <IoArrowBackSharp size={22} />
        </button>
        <span className="page-title">🍽️ 식당 & 카페 추천</span>
      </header>

      {/* Budget Summary */}
      <div className="budget-summary">
        <div className="summary-card">
          <h3>예산 요약</h3>
          <div className="budget-details">
            <div className="budget-item">
              <span className="budget-label">선택한 숙소</span>
              <span className="budget-value">{hotelName || "미선택"}</span>
            </div>
            <div className="budget-item">
              <span className="budget-label">식비 예산</span>
              <span className="budget-value highlight">
                {formatCurrency(foodBudget)}
              </span>
            </div>
            <div className="budget-item">
              <span className="budget-label">선택한 금액</span>
              <span className={`budget-value ${totalSelectedPrice > foodBudget ? 'error' : ''}`}>
                {formatCurrency(totalSelectedPrice)}
              </span>
            </div>
            <div className="budget-item">
              <span className="budget-label">남은 예산</span>
              <span className={`budget-value ${foodBudget - totalSelectedPrice < 0 ? 'error' : 'highlight'}`}>
                {formatCurrency(foodBudget - totalSelectedPrice)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Restaurant List */}
      <main className="restaurant-content">
        {restaurants.length > 0 ? (
          <div className="restaurant-grid">
            {restaurants.map((restaurant) => {
              const isSelected = selectedRestaurants.has(restaurant.id);
              const canSelect = totalSelectedPrice + restaurant.price <= foodBudget || isSelected;
              
              return (
                <div 
                  key={restaurant.id} 
                  className={`restaurant-card ${isSelected ? 'selected' : ''} ${!canSelect ? 'disabled' : ''}`}
                >
                  <div className="restaurant-image-container">
                    <img
                      src={restaurant.image}
                      alt={restaurant.name}
                      className="restaurant-image"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800";
                      }}
                    />
                    <div className="restaurant-rating">
                      <IoStar className="star-icon" />
                      <span>{restaurant.rating}</span>
                    </div>
                    <div className="restaurant-type-badge">
                      {restaurant.type === "카페" ? (
                        <MdLocalCafe className="type-icon" />
                      ) : (
                        <MdRestaurant className="type-icon" />
                      )}
                      <span>{restaurant.type}</span>
                    </div>
                  </div>

                  <div className="restaurant-info">
                    <div className="restaurant-header">
                      <h3 className="restaurant-name">{restaurant.name}</h3>
                    </div>

                    <div className="restaurant-location">
                      <IoLocation className="location-icon" />
                      <span>{restaurant.location}</span>
                    </div>

                    <p className="restaurant-description">{restaurant.description}</p>

                    <div className="restaurant-meta">
                      <span className="review-count">리뷰 {restaurant.reviewCount}개</span>
                    </div>
                  </div>

                  <div className="restaurant-price-section">
                    <div className="price-info">
                      <span className="price-label">예상 비용</span>
                      <span className="price-value">
                        {formatCurrency(restaurant.price)}
                      </span>
                    </div>

                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleRestaurantToggle(restaurant.id, restaurant.price)}
                        disabled={!canSelect}
                      />
                      <span className="checkbox-label">
                        {isSelected ? "선택됨" : canSelect ? "선택하기" : "예산 초과"}
                      </span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-restaurants">
            <div className="no-restaurants-icon">🍽️</div>
            <h3>조건에 맞는 식당이 없습니다</h3>
            <p>다른 지역을 선택하거나 예산을 조정해보세요.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="restaurant-footer">
        <div className="footer-summary">
          <span>선택한 식당: {selectedRestaurants.size}개</span>
          <span className="footer-total">
            총 {formatCurrency(totalSelectedPrice)}
          </span>
        </div>
        <button 
          className="complete-button"
          onClick={() => {
            if (selectedRestaurants.size === 0) {
              alert("최소 1개 이상의 식당을 선택해주세요.");
              return;
            }
            
            // 선택된 식당 정보를 배열로 변환
            const selectedRestaurantData = Array.from(selectedRestaurants).map(id => {
              const restaurant = restaurants.find(r => r.id === id);
              return {
                id: restaurant.id,
                name: restaurant.name,
                price: restaurant.price
              };
            });
            
            // URL 파라미터에 선택된 식당 정보 저장 (기존 파라미터 유지)
            const queryParams = new URLSearchParams(location.search);
            // URLSearchParams.set()은 자동으로 인코딩하므로 JSON.stringify만 사용
            queryParams.set("selectedRestaurants", JSON.stringify(selectedRestaurantData));
            queryParams.set("restaurantTotalPrice", totalSelectedPrice.toString());
            
            navigate(`/tourist?${queryParams.toString()}`);
          }}
        >
          선택 완료
        </button>
      </footer>
    </div>
  );
};

export default RestaurantPage;


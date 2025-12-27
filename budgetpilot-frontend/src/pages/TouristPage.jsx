import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IoArrowBackSharp, IoStar, IoLocation } from "react-icons/io5";
import { MdCameraAlt } from "react-icons/md";
import "../TouristPage.css";

const BACKEND_URL =
  window.__BACKEND__ ||
  import.meta?.env?.VITE_BACKEND_URL ||
  "http://localhost:8000";

const TouristPage = () => {
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

  const selectedRestaurantsStr = searchParams.get("selectedRestaurants") || "[]";
  const selectedRestaurants = useMemo(() => {
    try {
      return JSON.parse(selectedRestaurantsStr);
    } catch (e) {
      return [];
    }
  }, [selectedRestaurantsStr]);

  const tourismBudget = breakdown?.관광 || budget?.관광 || 0;
  const [tourists, setTourists] = useState([]);
  const [selectedTourists, setSelectedTourists] = useState(new Set());
  const [totalSelectedPrice, setTotalSelectedPrice] = useState(0);
  const [loading, setLoading] = useState(true);

  // 강릉 지역 관광지 데이터 (임시)
  const gangneungTourists = [
    {
      id: "t-1",
      name: "경포해수욕장",
      location: "강릉시 경포동",
      rating: 4.6,
      reviewCount: 1234,
      price: 0,
      description: "동해안의 대표적인 해수욕장. 맑은 바다와 넓은 백사장이 아름다운 곳입니다.",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
    },
    {
      id: "t-2",
      name: "안목해변",
      location: "강릉시 창해로14번길",
      rating: 4.7,
      reviewCount: 987,
      price: 0,
      description: "커피거리와 함께 즐길 수 있는 해변. 일출 명소로도 유명합니다.",
      image: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800",
    },
    {
      id: "t-3",
      name: "오대산국립공원",
      location: "강릉시 옥계면",
      rating: 4.8,
      reviewCount: 1456,
      price: 3000,
      description: "아름다운 산과 계곡이 있는 국립공원. 등산과 자연 감상이 좋습니다.",
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    },
    {
      id: "t-4",
      name: "강릉 중앙시장",
      location: "강릉시 중앙시장",
      rating: 4.4,
      reviewCount: 567,
      price: 0,
      description: "강릉의 전통 시장. 다양한 먹거리와 특산품을 구경할 수 있습니다.",
      image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800",
    },
    {
      id: "t-5",
      name: "정동진 해안열차",
      location: "강릉시 강동면",
      rating: 4.5,
      reviewCount: 789,
      price: 12000,
      description: "바다를 따라 달리는 해안열차. 로맨틱한 기차 여행을 즐길 수 있습니다.",
      image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800",
    },
    {
      id: "t-6",
      name: "허균허난설생 기념관",
      location: "강릉시 옥계면",
      rating: 4.3,
      reviewCount: 234,
      price: 5000,
      description: "조선시대 문인 허균과 허난설생의 생애와 작품을 볼 수 있는 기념관입니다.",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    },
    {
      id: "t-7",
      name: "강릉 커피거리",
      location: "강릉시 창해로14번길",
      rating: 4.6,
      reviewCount: 1123,
      price: 0,
      description: "전국적으로 유명한 커피 거리. 다양한 카페와 감성적인 분위기를 즐길 수 있습니다.",
      image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
    },
    {
      id: "t-8",
      name: "주문진 수산시장",
      location: "강릉시 주문진읍",
      rating: 4.5,
      reviewCount: 456,
      price: 0,
      description: "신선한 해산물을 구매할 수 있는 수산시장. 회센터와 함께 즐기기 좋습니다.",
      image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800",
    },
    {
      id: "t-9",
      name: "정동진 레일바이크",
      location: "강릉시 강동면",
      rating: 4.4,
      reviewCount: 678,
      price: 15000,
      description: "바다를 보며 즐기는 레일바이크. 가족과 연인에게 인기 있는 체험입니다.",
      image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800",
    },
    {
      id: "t-10",
      name: "사천해변",
      location: "강릉시 사천면",
      rating: 4.5,
      reviewCount: 345,
      price: 0,
      description: "조용하고 아름다운 해변. 힐링과 휴식을 즐기기 좋은 곳입니다.",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
    },
    {
      id: "t-11",
      name: "강릉 대관령 양떼목장",
      location: "강릉시 성산면",
      rating: 4.7,
      reviewCount: 890,
      price: 8000,
      description: "넓은 초원과 양떼를 볼 수 있는 목장. 사진 찍기 좋은 명소입니다.",
      image: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800",
    },
    {
      id: "t-12",
      name: "하슬라아트월드",
      location: "강릉시 강동면",
      rating: 4.6,
      reviewCount: 567,
      price: 10000,
      description: "현대 미술 작품을 감상할 수 있는 아트 갤러리. 바다 전망이 아름답습니다.",
      image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800",
    },
  ];

  useEffect(() => {
    // TODO: 백엔드 API에서 관광지 데이터 가져오기
    // 현재는 강릉 지역만 임시 데이터 사용
    if (region.includes("강릉") || region === "강릉") {
      setTourists(gangneungTourists);
    } else {
      // 다른 지역은 빈 배열 또는 기본 데이터
      setTourists([]);
    }
    setLoading(false);
  }, [region]);

  const handleTouristToggle = (touristId, price) => {
    setSelectedTourists((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(touristId)) {
        newSet.delete(touristId);
        setTotalSelectedPrice((prevPrice) => prevPrice - price);
      } else {
        // 예산 체크
        const newTotal = totalSelectedPrice + price;
        if (newTotal > tourismBudget) {
          alert(`예산을 초과합니다! (현재: ₩${newTotal.toLocaleString()}, 예산: ₩${tourismBudget.toLocaleString()})`);
          return prev;
        }
        newSet.add(touristId);
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
      <div className="tourist-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>관광지를 찾고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tourist-page">
      {/* Header */}
      <header className="tourist-header">
        <button className="back-button" onClick={handleBack}>
          <IoArrowBackSharp size={22} />
        </button>
        <span className="page-title">📸 관광지 추천</span>
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
              <span className="budget-label">관광 예산</span>
              <span className="budget-value highlight">
                {formatCurrency(tourismBudget)}
              </span>
            </div>
            <div className="budget-item">
              <span className="budget-label">선택한 금액</span>
              <span className={`budget-value ${totalSelectedPrice > tourismBudget ? 'error' : ''}`}>
                {formatCurrency(totalSelectedPrice)}
              </span>
            </div>
            <div className="budget-item">
              <span className="budget-label">남은 예산</span>
              <span className={`budget-value ${tourismBudget - totalSelectedPrice < 0 ? 'error' : 'highlight'}`}>
                {formatCurrency(tourismBudget - totalSelectedPrice)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tourist List */}
      <main className="tourist-content">
        {tourists.length > 0 ? (
          <div className="tourist-grid">
            {tourists.map((tourist) => {
              const isSelected = selectedTourists.has(tourist.id);
              const canSelect = totalSelectedPrice + tourist.price <= tourismBudget || isSelected;
              
              return (
                <div 
                  key={tourist.id} 
                  className={`tourist-card ${isSelected ? 'selected' : ''} ${!canSelect ? 'disabled' : ''}`}
                >
                  <div className="tourist-image-container">
                    <img
                      src={tourist.image}
                      alt={tourist.name}
                      className="tourist-image"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800";
                      }}
                    />
                    <div className="tourist-rating">
                      <IoStar className="star-icon" />
                      <span>{tourist.rating}</span>
                    </div>
                    <div className="tourist-type-badge">
                      <MdCameraAlt className="type-icon" />
                      <span>관광지</span>
                    </div>
                  </div>

                  <div className="tourist-info">
                    <div className="tourist-header">
                      <h3 className="tourist-name">{tourist.name}</h3>
                    </div>

                    <div className="tourist-location">
                      <IoLocation className="location-icon" />
                      <span>{tourist.location}</span>
                    </div>

                    <p className="tourist-description">{tourist.description}</p>

                    <div className="tourist-meta">
                      <span className="review-count">리뷰 {tourist.reviewCount}개</span>
                    </div>
                  </div>

                  <div className="tourist-price-section">
                    <div className="price-info">
                      <span className="price-label">예상 비용</span>
                      <span className="price-value">
                        {tourist.price === 0 ? "무료" : formatCurrency(tourist.price)}
                      </span>
                    </div>

                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleTouristToggle(tourist.id, tourist.price)}
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
          <div className="no-tourists">
            <div className="no-tourists-icon">📸</div>
            <h3>조건에 맞는 관광지가 없습니다</h3>
            <p>다른 지역을 선택하거나 예산을 조정해보세요.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="tourist-footer">
        <div className="footer-summary">
          <span>선택한 관광지: {selectedTourists.size}개</span>
          <span className="footer-total">
            총 {formatCurrency(totalSelectedPrice)}
          </span>
        </div>
        <button 
          className="complete-button"
          onClick={() => {
            if (selectedTourists.size === 0) {
              alert("최소 1개 이상의 관광지를 선택해주세요.");
              return;
            }
            
            // 선택된 관광지 정보를 배열로 변환
            const selectedTouristData = Array.from(selectedTourists).map(id => {
              const tourist = tourists.find(t => t.id === id);
              return {
                id: tourist.id,
                name: tourist.name,
                price: tourist.price
              };
            });
            
            // URL 파라미터에 선택된 관광지 정보 저장 (기존 파라미터 유지)
            const queryParams = new URLSearchParams(location.search);
            // URLSearchParams.set()은 자동으로 인코딩하므로 JSON.stringify만 사용
            queryParams.set("selectedTourists", JSON.stringify(selectedTouristData));
            queryParams.set("touristTotalPrice", totalSelectedPrice.toString());
            
            // 최종 리포트 페이지로 이동
            navigate(`/report?${queryParams.toString()}`);
          }}
        >
          선택 완료
        </button>
      </footer>
    </div>
  );
};

export default TouristPage;


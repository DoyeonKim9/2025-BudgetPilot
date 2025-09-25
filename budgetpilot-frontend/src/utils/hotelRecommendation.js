// 호텔 추천 유틸리티 함수들
import accommodationsData from '../data/accommodations.json';

// 예산 범위에 맞는 호텔 필터링
export const filterHotelsByBudget = (hotels, budgetPerNight) => {
  return hotels.filter(hotel => hotel.price_per_night <= budgetPerNight);
};

// 숙박 기간에 따른 총 예산 계산
export const calculateTotalBudget = (budgetPerNight, nights) => {
  return budgetPerNight * nights;
};

// 예산 범위에 맞는 호텔 추천
export const recommendHotels = (budgetPerNight, nights, preferences = {}) => {
  const { location, type, minRating = 0 } = preferences;
  
  let filteredHotels = [...accommodationsData.accommodations];
  
  // 예산 필터링
  filteredHotels = filterHotelsByBudget(filteredHotels, budgetPerNight);
  
  // 지역 필터링 (선택사항)
  if (location) {
    filteredHotels = filteredHotels.filter(hotel => 
      hotel.location.includes(location)
    );
  }
  
  // 숙박 타입 필터링 (선택사항)
  if (type) {
    filteredHotels = filteredHotels.filter(hotel => 
      hotel.type === type
    );
  }
  
  // 최소 평점 필터링
  filteredHotels = filteredHotels.filter(hotel => 
    hotel.rating >= minRating
  );
  
  // 가격순으로 정렬 (낮은 가격부터)
  filteredHotels.sort((a, b) => a.price_per_night - b.price_per_night);
  
  // 총 예산 정보 추가
  return filteredHotels.map(hotel => ({
    ...hotel,
    total_price: hotel.price_per_night * nights,
    nights: nights
  }));
};

// 예산 대비 최적 호텔 추천
export const getOptimalRecommendations = (budgetPerNight, nights, preferences = {}) => {
  const recommendations = recommendHotels(budgetPerNight, nights, preferences);
  
  if (recommendations.length === 0) {
    return {
      message: "예산 범위에 맞는 숙소를 찾을 수 없습니다. 예산을 조정해보세요.",
      recommendations: []
    };
  }
  
  // 예산 효율성 점수 계산 (평점/가격 비율)
  const scoredRecommendations = recommendations.map(hotel => ({
    ...hotel,
    valueScore: hotel.rating / (hotel.price_per_night / 10000) // 가격을 만원 단위로 나누어 점수 계산
  }));
  
  // 가치 점수순으로 정렬
  scoredRecommendations.sort((a, b) => b.valueScore - a.valueScore);
  
  return {
    message: `${recommendations.length}개의 숙소를 찾았습니다!`,
    recommendations: scoredRecommendations.slice(0, 6), // 상위 6개만 반환
    totalBudget: budgetPerNight * nights
  };
};

// 예산 범위별 호텔 분류
export const categorizeByBudget = (budgetPerNight) => {
  if (budgetPerNight <= 50000) {
    return { category: 'budget', label: '저예산', color: 'green' };
  } else if (budgetPerNight <= 100000) {
    return { category: 'mid-range', label: '중간가격', color: 'blue' };
  } else if (budgetPerNight <= 200000) {
    return { category: 'premium', label: '고급', color: 'purple' };
  } else {
    return { category: 'luxury', label: '럭셔리', color: 'gold' };
  }
};

// 가격대별 추천 메시지 생성
export const generateRecommendationMessage = (budgetPerNight, nights, count) => {
  const category = categorizeByBudget(budgetPerNight);
  const totalBudget = budgetPerNight * nights;
  
  const messages = {
    budget: `💰 저예산 여행에 최적화된 ${count}개의 숙소를 찾았습니다!`,
    'mid-range': `🏨 적당한 가격대의 ${count}개 숙소를 추천합니다!`,
    premium: `⭐ 고급스러운 ${count}개의 숙소를 선별했습니다!`,
    luxury: `👑 프리미엄 ${count}개 숙소로 특별한 여행을 계획하세요!`
  };
  
  return {
    message: messages[category.category],
    totalBudget: `총 예산: ${totalBudget.toLocaleString()}원`,
    category: category
  };
};

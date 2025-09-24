// src/hook/useQueryNavigator.js

import { useNavigate, useLocation } from "react-router-dom";

export const useQueryNavigator = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const goTo = (path, newParams = {}) => {
    const currentParams = new URLSearchParams(location.search);

    // 기존 쿼리에서 null인 값 제거 후 새로운 값 덮어쓰기
    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        currentParams.set(key, value);
      }
    });

    // 중복 키 제거: region= / regionIds= 같은 거 둘 다 있으면 remove
    if (currentParams.has("region")) currentParams.delete("region");

    navigate(`${path}?${currentParams.toString()}`);
  };

  return { goTo };
};

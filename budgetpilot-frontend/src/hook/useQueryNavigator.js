import { useNavigate, useLocation } from "react-router-dom";

export const useQueryNavigator = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const goTo = (path, newParams = {}) => {
    const currentSearchParams = new URLSearchParams(location.search);

    Object.entries(newParams).forEach(([key, value]) => {
      currentSearchParams.set(key, value);
    });

    navigate(`${path}?${currentSearchParams.toString()}`);
  };

  return { goTo };
};

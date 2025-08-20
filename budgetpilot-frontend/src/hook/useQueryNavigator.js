import { useNavigate, useLocation } from "react-router-dom";

export const useQueryNavigator = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const goTo = (path, newParams = {}) => {
    const currentSearchParams = new URLSearchParams(location.search);
    for (const key in newParams) {
      currentSearchParams.set(key, newParams[key]);
    }
    navigate(`${path}?${currentSearchParams.toString()}`);
  };

  return { goTo };
};

import { useNavigate, useLocation } from "react-router-dom";
import { useQueryNavigator } from "../hook/useQueryNavigator";
import { useState } from "react";

const handleNextClick = (selectedDays) => {
  const searchParams = new URLSearchParams(location.search);
  searchParams.set("nDays", selectedDays);

  navigate(`/question/budget?${searchParams.toString()}`);
};

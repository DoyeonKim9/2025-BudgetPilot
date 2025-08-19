import { Link } from "react-router-dom";
import "../intro.css";

export default function Intro() {
  return (
    <div className="sky-background">
      {/* 구름 두 개 */}
      <img src="/cloud1.png" alt="left cloud" className="cloud-left" />
      <img src="/cloud2.png" alt="right cloud" className="cloud-right" />
      {/* 텍스트 박스 */}
      <div className="intro-wrapper">
        <h1 className="intro-title">
          ✈️ <span className="intro-highlight">BudgetPilot</span>에 오신 걸
          환영합니다!
        </h1>
        <p className="intro-desc">
          여행 예산을 기준으로 나만의 여행을 추천받아보세요.
        </p>
        <Link to="/question/region" className="intro-button">
          여행 시작하기
        </Link>
      </div>
    </div>
  );
}

import { useState } from "react";

export default function TravelInput() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [people, setPeople] = useState(1);
  const [region, setRegion] = useState("");
  const [budget, setBudget] = useState("");
  const [style, setStyle] = useState([]);

  const handlestyleToggle = (selected) => {
    setStyle((prev) =>
      prev.includes(selected)
        ? prev.filter((s) => s !== selected)
        : [...prev, selected]
    );
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">여행 정보를 입력해주세요</h2>

      <div>
        <label>출발일:</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      <div>
        <label>도착일:</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <div>
        <label>인원 수:</label>
        <input
          type="number"
          value={people}
          onChange={(e) => setPeople(e.target.value)}
        />
      </div>

      <div>
        <label>여행 지역:</label>
        <input
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        />
      </div>

      <div>
        <label>1인당 예산:</label>
        <input
          type="number"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
      </div>

      <div>
        <label>여행 스타일 선택:</label>
        <div className="flex gap-2">
          {["휴양", "쇼핑", "맛집", "걷기", "감성"].map((item) => (
            <button
              key={item}
              className={`px-2 py-1 rounded ${
                style.includes(item) ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
              onClick={() => handleStyleToggle(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

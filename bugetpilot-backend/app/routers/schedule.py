from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import sys
import os
from openai import OpenAI

# config.py는 루트 디렉토리에 있으므로 경로 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from config import get_settings

router = APIRouter(prefix="/schedule", tags=["schedule"])

S = get_settings()

class ScheduleRequest(BaseModel):
    region: str
    period: str
    nights: int
    who: Optional[str] = ""
    style: Optional[str] = ""
    hotelName: Optional[str] = ""
    selectedRestaurants: List[Dict[str, Any]] = []
    selectedTourists: List[Dict[str, Any]] = []
    budget: Dict[str, int] = {}
    totalAmount: Optional[int] = 0
    restaurantTotalPrice: Optional[int] = 0
    touristTotalPrice: Optional[int] = 0

@router.post("/generate")
async def generate_schedule(request: ScheduleRequest):
    """
    사용자가 선택한 정보를 바탕으로 LLM이 여행 일정을 생성합니다.
    """
    if not S.OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API 키가 설정되지 않았습니다."
        )
    
    try:
        client = OpenAI(api_key=S.OPENAI_API_KEY)
        
        # 선택한 식당과 관광지 정보를 문자열로 변환
        restaurant_list = "\n".join([
            f"- {r.get('name', '')} (예상 비용: ₩{r.get('price', 0):,})"
            for r in request.selectedRestaurants
        ]) if request.selectedRestaurants else "선택한 식당 없음"
        
        # 관광지 리스트 생성 (f-string 내부 백슬래시 문제 해결)
        tourist_items = []
        for t in request.selectedTourists:
            price = t.get('price', 0)
            if price == 0:
                price_str = "무료"
            else:
                price_str = f"₩{price:,}"
            tourist_items.append(f"- {t.get('name', '')} ({price_str})")
        tourist_list = "\n".join(tourist_items) if request.selectedTourists else "선택한 관광지 없음"
        
        # 스타일 파싱 (쉼표로 구분)
        style_list = request.style.split(",") if request.style else []
        style_text = ", ".join([s.strip() for s in style_list]) if style_list else "미지정"
        
        # 사용 예산 계산
        used_budget = (
            request.budget.get('숙소', 0) + 
            request.restaurantTotalPrice + 
            request.touristTotalPrice
        )
        
        # 예산 정보
        budget_text = f"""
- 총 예산: ₩{request.totalAmount:,}
- 숙소 예산: ₩{request.budget.get('숙소', 0):,}
- 식비 예산: ₩{request.budget.get('식비', 0):,} (사용: ₩{request.restaurantTotalPrice:,})
- 관광 예산: ₩{request.budget.get('관광', 0):,} (사용: ₩{request.touristTotalPrice:,})
- 기타 예산: ₩{request.budget.get('기타', 0):,}
- 사용 예산: ₩{used_budget:,}
"""
        
        # LLM 프롬프트 작성
        system_prompt = """당신은 전문 여행 계획가입니다. 사용자가 선택한 숙소, 식당, 관광지를 바탕으로 실용적이고 즐거운 여행 일정을 만들어주세요.

일정을 만들 때 다음 사항을 고려하세요:
1. 선택한 식당과 관광지를 최대한 활용하여 일정에 포함
2. 시간대를 고려한 현실적인 일정 (아침, 점심, 저녁, 야경 등)
3. 이동 거리와 시간을 고려한 효율적인 순서
4. 사용자의 여행 스타일과 동행자 정보를 반영
5. 예산 내에서 즐길 수 있는 활동 제안
6. 체크인은 보통 오후 3시, 체크아웃은 오전 11시를 고려

응답은 반드시 유효한 JSON 형식으로 제공하세요. JSON만 반환하고 다른 설명은 포함하지 마세요."""

        user_prompt = f"""다음 정보를 바탕으로 {request.period} 여행 일정을 만들어주세요.

**여행 정보:**
- 여행지: {request.region}
- 기간: {request.period} ({request.nights}박 {request.nights + 1}일)
- 동행: {request.who or "미지정"}
- 여행 스타일: {style_text}

**예산 정보:**
{budget_text}

**선택한 숙소:**
{request.hotelName or "미선택"}

**선택한 식당 (반드시 이 식당들을 일정에 포함시켜주세요):**
{restaurant_list}

**선택한 관광지 (반드시 이 관광지들을 일정에 포함시켜주세요):**
{tourist_list}

**중요 지침:**
1. {request.nights}박 {request.nights + 1}일 동안의 상세 일정을 만들어주세요.
2. 각 날짜는 "1일차", "2일차", "3일차" 형식으로 표시해주세요.
3. 선택한 모든 식당과 관광지를 일정에 포함시켜주세요. 빠짐없이 모두 배치해주세요.
4. 각 날짜별로 시간대별 활동을 구체적으로 제시해주세요 (예: 09:00, 12:00, 14:00, 18:00 등).
5. 체크인은 첫날 오후 3시, 체크아웃은 마지막날 오전 11시를 고려해주세요.
6. 아침, 점심, 저녁 식사 시간을 고려하여 식당을 배치해주세요.
7. 관광지는 식사 시간 사이에 배치해주세요.
8. 이동 시간과 거리를 고려한 현실적인 일정을 만들어주세요.
9. 각 활동의 description에는 구체적인 내용을 작성해주세요 (예: "선택한 안목해변 회센터에서 신선한 회와 해산물을 맛보며 점심 식사").
10. location에는 실제 장소 이름을 정확히 작성해주세요."""

        # JSON 형식 예시 문자열 생성
        json_example = f"""
반드시 다음 JSON 형식으로 응답하세요. usedBudget는 {used_budget}을 사용하고, date는 "1일차", "2일차", "3일차" 형식으로 작성해주세요:

{{
  "summary": {{
    "region": "{request.region}",
    "period": "{request.period}",
    "nights": {request.nights},
    "who": "{request.who or '미지정'}",
    "style": "{style_text}",
    "totalBudget": {request.totalAmount},
    "usedBudget": {used_budget}
  }},
  "days": [
    {{
      "day": 1,
      "date": "1일차",
      "activities": [
        {{
          "time": "09:00",
          "type": "hotel",
          "title": "숙소 체크인",
          "description": "{request.hotelName or '숙소'}에서 체크인하고 짐을 풀어요.",
          "location": "{request.hotelName or '숙소'}"
        }}
      ]
    }}
  ],
  "recommendations": [
    "{request.region}에서 {request.period} 동안 즐거운 여행 되세요!",
    "선택하신 숙소와 식당, 관광지를 중심으로 일정을 구성했습니다.",
    "날씨를 확인하고 편안한 복장으로 준비하세요."
  ]
}}

중요: 선택한 모든 식당과 관광지를 빠짐없이 일정에 포함시켜주세요. 각 날짜별로 적절히 분배해주세요.
"""
        
        # LLM 호출
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.7,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt + json_example}
            ],
            response_format={"type": "json_object"}
        )
        
        # 응답 파싱
        content = response.choices[0].message.content
        schedule_data = json.loads(content)
        
        return schedule_data
        
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"LLM 응답 파싱 실패: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"일정 생성 실패: {str(e)}"
        )


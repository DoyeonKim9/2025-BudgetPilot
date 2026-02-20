# -*- coding: utf-8 -*-
"""식품_일반음식점_여행지역만.csv를 지역별로 절반으로 줄이기"""
import pandas as pd
import random

INPUT_CSV = "식품_일반음식점_여행지역만.csv"
OUTPUT_CSV = "식품_일반음식점_여행지역만.csv"
CHUNK_SIZE = 50000

# 지역 키워드 매핑 (주소에서 추출)
REGION_KEYWORDS = {
    "강남구": "강남구",
    "마포구": "마포구",
    "성수동": "성수동",
    "성수 ": "성수 ",
    "종로구": "종로구",
    "가평": "가평",
    "인천": "인천",
    "수원": "수원",
    "대전": "대전",
    "천안": "천안",
    "단양": "단양",
    "춘천": "춘천",
    "속초": "속초",
    "강릉": "강릉",
    "전주": "전주",
    "여수": "여수",
    "목포": "목포",
    "광주": "광주",
    "부산": "부산",
    "대구": "대구",
    "경주": "경주",
    "통영": "통영",
    "제주": "제주",
    "울릉": "울릉",
}

def get_region(row):
    """행의 주소에서 지역 키워드 찾기"""
    addr1 = str(row.get("도로명주소", "") or "")
    addr2 = str(row.get("지번주소", "") or "")
    combined = (addr1 + " " + addr2).lower()
    for kw in REGION_KEYWORDS.values():
        if kw.lower() in combined:
            return kw
    return None

# 지역별 데이터 수집
region_data = {}
total_in = 0

print("CSV 읽는 중...")
for chunk in pd.read_csv(INPUT_CSV, encoding="utf-8", chunksize=CHUNK_SIZE, low_memory=False):
    total_in += len(chunk)
    for _, row in chunk.iterrows():
        region = get_region(row)
        if region:
            if region not in region_data:
                region_data[region] = []
            region_data[region].append(row.to_dict())
    if total_in % 100000 == 0:
        print(f"  읽음: {total_in:,}행")

print(f"\n총 {total_in:,}행 읽음")
print(f"지역별 데이터 수:")
for region, rows in sorted(region_data.items()):
    print(f"  {region}: {len(rows):,}개")

# 지역별로 절반만 샘플링
reduced_data = []
for region, rows in region_data.items():
    half = len(rows) // 2
    sampled = random.sample(rows, half) if half > 0 else []
    reduced_data.extend(sampled)
    print(f"{region}: {len(rows):,} -> {len(sampled):,}")

print(f"\n총 {len(reduced_data):,}행으로 축소 (원본: {total_in:,}행)")

# CSV로 저장
df_out = pd.DataFrame(reduced_data)
df_out.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
print(f"\n저장 완료: {OUTPUT_CSV}")

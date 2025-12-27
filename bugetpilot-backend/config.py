# app/core/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache
from dotenv import load_dotenv
import os

# 1) .env 먼저, 2) openai_api_key.env 있으면 추가로 로드
base_dir = os.path.dirname(__file__)
load_dotenv(dotenv_path=os.path.join(base_dir, ".env"))
load_dotenv(dotenv_path=os.path.join(base_dir, "openai_api_key.env"))

class Settings(BaseSettings):
    AMADEUS_API_KEY: str
    AMADEUS_API_SECRET: str
    AMADEUS_ENV: str = "sandbox"  # or "prod"
    OPENAI_API_KEY: str | None = None  # 선택(있으면 GPT 보조 정규화 사용)

    class Config:
        env_file = ".env"  # 기본값(이미 load_dotenv로 두 파일을 읽으니 여기 한 줄이면 충분)

@lru_cache
def get_settings():
    return Settings()

# app/services/amadeus.py
import requests
from typing import Dict, Any, Optional
from config import get_settings

S = get_settings()

def get_access_token() -> str:
    """Amadeus API 액세스 토큰 발급"""
    url = "https://test.api.amadeus.com/v1/security/oauth2/token" if S.AMADEUS_ENV == "sandbox" else "https://api.amadeus.com/v1/security/oauth2/token"
    
    data = {
        "grant_type": "client_credentials",
        "client_id": S.AMADEUS_API_KEY,
        "client_secret": S.AMADEUS_API_SECRET,
    }
    
    resp = requests.post(url, data=data)
    resp.raise_for_status()
    return resp.json()["access_token"]

def search_hotel_offers(
    token: str,
    latitude: float,
    longitude: float,
    radius: int = 10,
    radiusUnit: str = "KM",
    checkInDate: str = None,
    checkOutDate: str = None,
    adults: int = 2,
    currency: str = "KRW",
    includeClosed: str = "false",
    bestRateOnly: str = "false",
) -> Dict[str, Any]:
    """Amadeus Hotel Offers API 호출"""
    base_url = "https://test.api.amadeus.com" if S.AMADEUS_ENV == "sandbox" else "https://api.amadeus.com"
    url = f"{base_url}/v3/shopping/hotel-offers"
    
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "radius": radius,
        "radiusUnit": radiusUnit,
        "currency": currency,
        "adults": adults,
        "includeClosed": includeClosed,
        "bestRateOnly": bestRateOnly,
    }
    
    if checkInDate:
        params["checkInDate"] = checkInDate
    if checkOutDate:
        params["checkOutDate"] = checkOutDate
    
    headers = {"Authorization": f"Bearer {token}"}
    
    resp = requests.get(url, params=params, headers=headers)
    resp.raise_for_status()
    return resp.json()






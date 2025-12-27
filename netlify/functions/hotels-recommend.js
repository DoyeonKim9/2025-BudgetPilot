/**
 * Netlify Functions - 호텔 추천 API
 * 서버리스 함수로 Amadeus API를 통해 숙박 추천
 */
const https = require('https');

exports.handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    const queryParams = event.queryStringParameters || {};
    const rawUrl = queryParams.raw || '';
    
    // 백엔드 서버로 프록시 (로컬 개발용)
    // 프로덕션에서는 실제 백엔드 URL로 변경
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    const url = `${backendUrl}/hotels/recommend?raw=${encodeURIComponent(rawUrl)}&top_k=${queryParams.top_k || 12}`;

    // 백엔드로 요청 전달
    const response = await fetch(url);
    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};






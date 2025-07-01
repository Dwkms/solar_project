// src/services/api.ts - JWT 토큰 포함 수정 버전
import axios from 'axios';

// API 기본 설정
const API_BASE_URL = 'http://127.0.0.1:8000';

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - JWT 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    // JWT 토큰을 localStorage에서 가져와서 헤더에 추가
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 401 에러 시 토큰 갱신 처리
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 에러이고 재시도하지 않은 요청인 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // 리프레시 토큰으로 새 액세스 토큰 요청
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/accounts/token/refresh/`, {
            refresh: refreshToken
          });

          const newAccessToken = response.data.access;
          localStorage.setItem('access_token', newAccessToken);

          // 원래 요청에 새 토큰 적용하여 재시도
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // 리프레시 토큰도 만료된 경우 로그아웃 처리
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        // 로그인 페이지로 리다이렉트 (또는 이벤트 발생)
        window.location.href = '/';
      }
    }

    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// API 함수들
export const apiService = {
  // 서버 상태 확인
  healthCheck: async () => {
    try {
      const response = await api.get('/api/health/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 센서 데이터 최신 조회
  getLatestSensorData: async () => {
    try {
      const response = await api.get('/api/sensor-data/latest/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 대시보드 요약 정보
  getDashboardSummary: async () => {
    try {
      const response = await api.get('/api/dashboard/summary/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 디바이스 목록 조회
  getDevices: async () => {
    try {
      const response = await api.get('/api/devices/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 활성 알림 조회
  getActiveAlerts: async () => {
    try {
      const response = await api.get('/api/alerts/active/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 센서 데이터 통계 조회
  getSensorStatistics: async () => {
    try {
      const response = await api.get('/api/sensor-data/statistics/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 특정 기간 센서 데이터 조회
  getSensorDataByHours: async (hours: number, deviceId?: string) => {
    try {
      const params: any = { hours };
      if (deviceId) params.device_id = deviceId;
      
      const response = await api.get('/api/sensor-data/', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 로그인
  login: async (username: string, password: string) => {
    try {
      const response = await api.post('/accounts/token/', {
        username,
        password,
      });
      
      // 토큰을 localStorage에 저장
      if (response.data.access) {
        localStorage.setItem('access_token', response.data.access);
      }
      if (response.data.refresh) {
        localStorage.setItem('refresh_token', response.data.refresh);
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 로그아웃
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await api.post('/accounts/logout/', {
          refresh: refreshToken
        });
      }
    } catch (error) {
      console.error('로그아웃 에러:', error);
    } finally {
      // 로컬 토큰 삭제
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  },

  // 사용자 정보 조회
  getUserProfile: async () => {
    try {
      const response = await api.get('/accounts/profile/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default api;
// src/services/auth.ts - 응답 처리 수정
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

// 인증 관련 axios 인스턴스
const authApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 토큰 관리 함수들
export const tokenManager = {
  // 토큰 저장
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  },

  // 토큰 조회
  getAccessToken: () => localStorage.getItem('access_token'),
  getRefreshToken: () => localStorage.getItem('refresh_token'),

  // 토큰 삭제
  clearTokens: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  // 사용자 정보 저장/조회
  setUser: (user: any) => {
    localStorage.setItem('user', JSON.stringify(user));
  },
  
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // 로그인 상태 확인
  isLoggedIn: () => {
    return !!localStorage.getItem('access_token');
  }
};

// 인증 서비스
export const authService = {
  // 로그인 - JWT 토큰 발급 (수정됨)
  login: async (username: string, password: string) => {
    try {
      console.log('로그인 시도:', username); // 디버깅용
      
      // JWT 토큰 요청
      const response = await authApi.post('/auth/token/', {
        username,
        password,
      });
      
      console.log('로그인 응답:', response.data); // 디버깅용
      
      // Django JWT 응답 형식: { access: "...", refresh: "..." }
      const { access, refresh } = response.data;
      
      if (!access || !refresh) {
        throw new Error('토큰이 응답에 포함되지 않았습니다.');
      }
      
      // 토큰 저장
      tokenManager.setTokens(access, refresh);
      
      // 사용자 정보 생성 (JWT에서 user_id 추출하거나 기본값 사용)
      const user = {
        id: 3, // JWT 토큰에서 추출한 user_id
        username: username,
        email: 'kdc@naver.com' // DB에서 확인한 이메일
      };
      
      tokenManager.setUser(user);
      
      console.log('로그인 성공, 토큰 저장 완료'); // 디버깅용
      
      return {
        user: user,
        tokens: { access, refresh }
      };
      
    } catch (error: any) {
      console.error('로그인 에러:', error.response?.data || error.message);
      throw error;
    }
  },

  // 회원가입 (기존과 동일)
  register: async (username: string, email: string, password: string) => {
    try {
      console.log('회원가입 시도:', username, email); // 디버깅용
      
      const response = await authApi.post('/auth/register/', {
        username,
        email,
        password,
      });
      
      console.log('회원가입 응답:', response.data); // 디버깅용
      
      // 회원가입 시 자동 로그인
      if (response.data.tokens) {
        tokenManager.setTokens(response.data.tokens.access, response.data.tokens.refresh);
        tokenManager.setUser(response.data.user);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('회원가입 에러:', error.response?.data || error.message);
      throw error;
    }
  },

  // 로그아웃
  logout: async () => {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      
      if (refreshToken) {
        await authApi.post('/auth/logout/', {
          refresh_token: refreshToken,
        });
      }
    } catch (error) {
      console.error('로그아웃 API 오류:', error);
    } finally {
      // 로컬 토큰은 항상 삭제
      tokenManager.clearTokens();
    }
  },

  // 토큰 갱신
  refreshToken: async () => {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('Refresh token not found');
      }
      
      const response = await authApi.post('/auth/token/refresh/', {
        refresh: refreshToken,
      });
      
      const newAccessToken = response.data.access;
      tokenManager.setTokens(newAccessToken, refreshToken);
      
      return newAccessToken;
    } catch (error) {
      // 토큰 갱신 실패 시 로그아웃
      tokenManager.clearTokens();
      throw error;
    }
  },

  // 프로필 조회
  getProfile: async () => {
    try {
      const token = tokenManager.getAccessToken();
      const response = await authApi.get('/auth/profile/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      tokenManager.setUser(response.data.user);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// API 인터셉터 설정 (토큰 자동 추가)
authApi.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 (토큰 만료 시 자동 갱신)
authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await authService.refreshToken();
        const newToken = tokenManager.getAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return authApi(originalRequest);
      } catch (refreshError) {
        // 토큰 갱신 실패 시 로그인 페이지로 리다이렉트
        tokenManager.clearTokens();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default authApi;
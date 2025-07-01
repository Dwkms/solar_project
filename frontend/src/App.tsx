// src/App.tsx - 차트 크기 수정 및 상세보기 기능 추가
import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Box,
  AppBar,
  Toolbar,
  Alert,
  CircularProgress,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Switch,
  FormControlLabel,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Dashboard as DashboardIcon,
  Sensors as SensorsIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { apiService } from './services/api';
import { authService, tokenManager } from './services/auth';
import Login from './components/login';
import RealtimeChart from './components/RealtimeChart';
import './App.css';

// 타입 정의 (RealtimeChart와 호환)
interface SensorData {
  device_name?: string;
  temperature: number;
  humidity: number;
  air_quality: number;
  uv_index?: number;
  light_level?: number;
  timestamp: string;
}

interface ApiTestResult {
  status: 'loading' | 'success' | 'error';
  message: string;
  data?: any;
}

interface User {
  id: number;
  username: string;
  email: string;
}

function App() {
  // 상태 관리
  const [apiTestResult, setApiTestResult] = useState<ApiTestResult | null>(null);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [isRealtime, setIsRealtime] = useState(false);
  
  // 상세 보기 다이얼로그 상태
  const [detailDialog, setDetailDialog] = useState<{
    open: boolean;
    type: 'temperature' | 'humidity' | 'air_quality' | 'uv_index' | 'light_level' | null;
    title: string;
  }>({
    open: false,
    type: null,
    title: ''
  });
  
  // 인증 관련 상태
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  // 실시간 데이터 업데이트 인터벌
  const [updateInterval, setUpdateInterval] = useState<NodeJS.Timeout | null>(null);

  // 컴포넌트 마운트 시 로그인 상태 확인
  useEffect(() => {
    checkAuthStatus();
    checkConnection();
    
    // 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      if (updateInterval) clearInterval(updateInterval);
    };
  }, []);

  // 실시간 업데이트 관리
  useEffect(() => {
    if (isRealtime && isLoggedIn) {
      const interval = setInterval(() => {
        loadSensorData(false); // 자동 업데이트시 메시지 표시 안함
      }, 5000); // 5초마다 업데이트
      
      setUpdateInterval(interval);
      
      return () => clearInterval(interval);
    } else if (updateInterval) {
      clearInterval(updateInterval);
      setUpdateInterval(null);
    }
  }, [isRealtime, isLoggedIn]);

  const checkAuthStatus = () => {
    const loggedIn = tokenManager.isLoggedIn();
    const user = tokenManager.getUser();
    
    setIsLoggedIn(loggedIn);
    setCurrentUser(user);
  };

  const checkConnection = async () => {
    try {
      await apiService.healthCheck();
      setConnectionStatus('connected');
    } catch (error) {
      setConnectionStatus('disconnected');
    }
  };

  // 로그인 성공 핸들러
  const handleLoginSuccess = (user: User, tokens: any) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    setLoginDialogOpen(false);
    
    // 로그인 성공 메시지
    setApiTestResult({
      status: 'success',
      message: `✅ ${user.username}님, 환영합니다!`,
      data: user
    });
    
    // 로그인 후 자동으로 데이터 로드
    loadSensorData(true);
  };

  // 로그아웃 핸들러
  const handleLogout = async () => {
    try {
      await authService.logout();
      setCurrentUser(null);
      setIsLoggedIn(false);
      setUserMenuAnchor(null);
      setSensorData([]); // 데이터 초기화
      setIsRealtime(false); // 실시간 업데이트 중지
      
      setApiTestResult({
        status: 'success',
        message: '✅ 성공적으로 로그아웃되었습니다.',
      });
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  // 사용자 메뉴 핸들러
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleApiTest = async () => {
    setApiTestResult({ status: 'loading', message: '연결 테스트 중...' });
    
    try {
      const healthData = await apiService.healthCheck();
      
      setApiTestResult({
        status: 'success',
        message: '✅ Django API 연결 성공!',
        data: healthData
      });
      
      setConnectionStatus('connected');
    } catch (error: any) {
      setApiTestResult({
        status: 'error',
        message: `❌ 연결 실패: ${error.message || '서버에 연결할 수 없습니다'}`,
      });
      
      setConnectionStatus('disconnected');
    }
  };

  const handleWebSocketTest = () => {
    setApiTestResult({
      status: 'loading',
      message: '🔄 WebSocket 연결 기능은 다음 단계에서 구현예정입니다!'
    });
  };

  const loadSensorData = async (showMessage: boolean = true) => {
    if (!isLoggedIn) {
      if (showMessage) {
        setApiTestResult({
          status: 'error',
          message: '❌ 로그인이 필요합니다.',
        });
      }
      return;
    }

    try {
      const data = await apiService.getLatestSensorData();
      setSensorData(data);
      
      if (showMessage) {
        setApiTestResult({
          status: 'success',
          message: `✅ 최신 센서 데이터 ${data.length}개를 불러왔습니다!`,
          data: data
        });
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        if (showMessage) {
          setApiTestResult({
            status: 'error',
            message: '❌ 로그인이 필요합니다.',
          });
        }
      } else {
        if (showMessage) {
          setApiTestResult({
            status: 'error',
            message: `❌ 데이터 로드 실패: ${error.message}`,
          });
        }
      }
    }
  };

  // 실시간 업데이트 토글
  const handleRealtimeToggle = (enabled: boolean) => {
    setIsRealtime(enabled);
    if (enabled && sensorData.length === 0) {
      loadSensorData(true); // 실시간 시작 시 데이터 로드
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'success';
      case 'disconnected': return 'error';
      default: return 'warning';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '연결됨';
      case 'disconnected': return '연결 끊김';
      default: return '확인 중';
    }
  };

  // 최신 데이터 가져오기 (차트용)
  const getLatestValue = (type: 'temperature' | 'humidity' | 'air_quality' | 'uv_index' | 'light_level') => {
    if (sensorData.length === 0) return null;
    return sensorData[sensorData.length - 1][type];
  };

  // 상세 보기 핸들러
  const handleDetailView = (type: 'temperature' | 'humidity' | 'air_quality' | 'uv_index' | 'light_level') => {
    const titles = {
      temperature: '🌡️ 온도 상세 분석',
      humidity: '💧 습도 상세 분석', 
      air_quality: '🌬️ 공기질 상세 분석',
      uv_index: '☀️ 자외선 지수 상세 분석',
      light_level: '💡 조도 상세 분석'
    };
    
    setDetailDialog({
      open: true,
      type: type,
      title: titles[type]
    });
  };

  const handleDetailViewClose = () => {
    setDetailDialog({
      open: false,
      type: null,
      title: ''
    });
  };


  // 공기질 색상 결정 함수
  const getAirQualityColor = (value: number, type: 'PM10' | 'PM25') => {
    if (type === 'PM25') {
      // 초미세먼지 (PM2.5) 기준
      if (value <= 15) return '#4CAF50';      // 좋음 - 녹색
      if (value <= 35) return '#FFC107';      // 보통 - 노란색
      if (value <= 75) return '#FF9800';      // 나쁨 - 주황색
      return '#F44336';                       // 매우나쁨 - 빨간색
    } else {
      // 미세먼지 (PM10) 기준
      if (value <= 30) return '#4CAF50';      // 좋음 - 녹색
      if (value <= 80) return '#FFC107';      // 보통 - 노란색
      if (value <= 150) return '#FF9800';     // 나쁨 - 주황색
      return '#F44336';                       // 매우나쁨 - 빨간색
    }
  };

  // 공기질 상태 텍스트 결정 함수
  const getAirQualityStatus = (value: number, type: 'PM10' | 'PM25') => {
    if (type === 'PM25') {
      // 초미세먼지 (PM2.5) 기준
      if (value <= 15) return '좋음';
      if (value <= 35) return '보통';
      if (value <= 75) return '나쁨';
      return '매우나쁨';
    } else {
      // 미세먼지 (PM10) 기준
      if (value <= 30) return '좋음';
      if (value <= 80) return '보통';
      if (value <= 150) return '나쁨';
      return '매우나쁨';
    }
  };

  // 자외선 지수 색상 결정 함수
  const getUVIndexColor = (value: number) => {
    if (value <= 2) return '#4CAF50';      // 낮음 - 녹색
    if (value <= 5) return '#FFC107';      // 보통 - 노란색
    if (value <= 7) return '#FF9800';      // 높음 - 주황색
    if (value <= 10) return '#F44336';     // 매우높음 - 빨간색
    return '#9C27B0';                      // 위험 - 보라색
  };

  // 자외선 지수 상태 텍스트 결정 함수
  const getUVIndexStatus = (value: number) => {
    if (value <= 2) return '낮음';
    if (value <= 5) return '보통';
    if (value <= 7) return '높음';
    if (value <= 10) return '매우높음';
    return '위험';
  };

  // 조도 색상 결정 함수
  const getLightLevelColor = (value: number) => {
    if (value < 50) return '#424242';       // 어두움 - 회색
    if (value < 200) return '#795548';      // 실내조명 - 갈색
    if (value < 500) return '#FF9800';      // 밝은실내 - 주황색
    if (value < 1000) return '#FFC107';     // 흐린날 - 노란색
    return '#4CAF50';                       // 맑은날 - 녹색
  };

  // 조도 상태 텍스트 결정 함수
  const getLightLevelStatus = (value: number) => {
    if (value < 50) return '어두움';
    if (value < 200) return '실내조명';
    if (value < 500) return '밝은실내';
    if (value < 1000) return '흐린날';
    return '맑은날';
  };

  // 하루치 1시간 간격 데이터 생성 함수 (상세 차트용)
  const generateDetailChartData = (type: 'temperature' | 'humidity' | 'air_quality' | 'uv_index' | 'light_level') => {
    const data = [];
    const now = new Date();
    
    // 24시간 = 24개 데이터포인트 (1시간 간격)
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now);
      time.setHours(now.getHours() - i);
      
      const hour = time.getHours();
      const currentValue = sensorData.length > 0 ? getLatestValue(type) || 25 : 25;
      
      let value;
      
      switch (type) {
        case 'temperature':
          // 현재 온도를 기준으로 하루 패턴 생성
          const tempBase = currentValue;
          const tempVariation = 4 * Math.sin((hour - 6) * Math.PI / 12);
          value = tempBase + tempVariation + (Math.random() - 0.5) * 2;
          break;
          
        case 'humidity':
          // 현재 습도를 기준으로 하루 패턴 생성
          const humidityBase = currentValue;
          const humidityVariation = -10 * Math.sin((hour - 6) * Math.PI / 12);
          value = humidityBase + humidityVariation + (Math.random() - 0.5) * 8;
          value = Math.max(20, Math.min(90, value)); // 20-90% 범위
          break;
          
        case 'air_quality':
          // 현재 공기질을 기준으로 하루 패턴 생성
          let aqBase = currentValue;
          if (hour >= 7 && hour <= 9) aqBase = aqBase * 1.5; // 출근시간
          if (hour >= 18 && hour <= 20) aqBase = aqBase * 1.4; // 퇴근시간
          if (hour >= 23 || hour <= 5) aqBase = aqBase * 0.7; // 새벽시간
          value = aqBase + (Math.random() - 0.5) * 50;
          value = Math.max(50, Math.min(500, value)); // 50-500 범위
          break;
          
        case 'uv_index':
          // 자외선 지수: 낮에만 존재, 정오에 최고
          if (hour >= 6 && hour <= 18) {
            const uvBase = currentValue || 3;
            const peakHour = 12;
            const distanceFromPeak = Math.abs(hour - peakHour);
            const timeMultiplier = Math.max(0.1, 1 - (distanceFromPeak / 6));
            value = uvBase * timeMultiplier + (Math.random() - 0.5) * 1;
            value = Math.max(0, Math.min(11, value)); // 0-11 범위
          } else {
            value = 0; // 밤에는 0
          }
          break;
          
        case 'light_level':
          // 조도: 일출/일몰 패턴
          if (hour >= 6 && hour <= 18) {
            const lightBase = currentValue || 350;
            const peakHour = 12;
            const distanceFromPeak = Math.abs(hour - peakHour);
            const timeMultiplier = Math.max(0.2, 1 - (distanceFromPeak / 8));
            value = lightBase * timeMultiplier + (Math.random() - 0.5) * 100;
            value = Math.max(100, Math.min(2000, value)); // 100-2000 범위
          } else {
            value = Math.random() * 30; // 밤에는 낮은 조도
          }
          break;
          
        default:
          value = 25;
      }
      
      data.push({
        device_name: sensorData.length > 0 ? sensorData[0]?.device_name || 'Sensor' : 'Demo Sensor',
        temperature: type === 'temperature' ? value : 22 + Math.random() * 6,
        humidity: type === 'humidity' ? value : 55 + Math.random() * 15,
        air_quality: type === 'air_quality' ? value : 180 + Math.random() * 80,
        uv_index: type === 'uv_index' ? value : (hour >= 6 && hour <= 18 ? 3 + Math.random() * 3 : 0),
        light_level: type === 'light_level' ? value : (hour >= 6 && hour <= 18 ? 300 + Math.random() * 200 : Math.random() * 30),
        timestamp: time.toISOString()
      });
    }
    
    return data;
  };

  // 기존 임시 데이터 생성 함수 (비로그인 시 사용)
  const generateDailyTestData = (type: 'temperature' | 'humidity' | 'air_quality' | 'uv_index' | 'light_level') => {
    const data = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now);
      time.setHours(now.getHours() - i);
      
      let value;
      const hour = time.getHours();
      
      switch (type) {
        case 'temperature':
          const tempBase = 22;
          const tempVariation = 6 * Math.sin((hour - 6) * Math.PI / 12);
          value = tempBase + tempVariation + (Math.random() - 0.5) * 4;
          break;
          
        case 'humidity':
          const humidityBase = 60;
          const humidityVariation = -15 * Math.sin((hour - 6) * Math.PI / 12);
          value = humidityBase + humidityVariation + (Math.random() - 0.5) * 10;
          break;
          
        case 'air_quality':
          let aqBase = 150;
          if (hour >= 7 && hour <= 9) aqBase = 300;
          if (hour >= 18 && hour <= 20) aqBase = 280;
          if (hour >= 23 || hour <= 5) aqBase = 100;
          value = aqBase + (Math.random() - 0.5) * 100;
          break;
          
        case 'uv_index':
          // 자외선 지수: 낮에만 존재
          if (hour >= 6 && hour <= 18) {
            const peakHour = 12;
            const distanceFromPeak = Math.abs(hour - peakHour);
            const timeMultiplier = Math.max(0.1, 1 - (distanceFromPeak / 6));
            value = 5 * timeMultiplier + (Math.random() - 0.5) * 2;
            value = Math.max(0, Math.min(11, value));
          } else {
            value = 0;
          }
          break;
          
        case 'light_level':
          // 조도: 일출/일몰 패턴
          if (hour >= 6 && hour <= 18) {
            const peakHour = 12;
            const distanceFromPeak = Math.abs(hour - peakHour);
            const timeMultiplier = Math.max(0.2, 1 - (distanceFromPeak / 8));
            value = 800 * timeMultiplier + (Math.random() - 0.5) * 200;
            value = Math.max(100, Math.min(2000, value));
          } else {
            value = Math.random() * 30;
          }
          break;
          
        default:
          value = 25;
      }
      
      data.push({
        device_name: 'Demo Sensor',
        temperature: type === 'temperature' ? value : 22 + Math.random() * 8,
        humidity: type === 'humidity' ? value : 50 + Math.random() * 20,
        air_quality: type === 'air_quality' ? value : 150 + Math.random() * 100,
        uv_index: type === 'uv_index' ? value : (hour >= 6 && hour <= 18 ? 3 + Math.random() * 3 : 0),
        light_level: type === 'light_level' ? value : (hour >= 6 && hour <= 18 ? 400 + Math.random() * 300 : Math.random() * 30),
        timestamp: time.toISOString()
      });
    }
    
    return data;
  };

  return (
    <div className="App">
      {/* 상단 네비게이션 바 */}
      <AppBar position="static" sx={{ backgroundColor: '#2E7D32' }}>
        <Toolbar>
          <SensorsIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🌿 환경 모니터링 시스템
          </Typography>
          
          {/* 연결 상태 표시 */}
          <Chip 
            icon={connectionStatus === 'connected' ? <CheckCircleIcon /> : <ErrorIcon />}
            label={`백엔드: ${getConnectionStatusText()}`}
            color={getConnectionStatusColor()}
            variant="outlined"
            sx={{ color: 'white', borderColor: 'white', mr: 2 }}
          />

          {/* 실시간 업데이트 토글 */}
          {isLoggedIn && (
            <FormControlLabel
              control={
                <Switch
                  checked={isRealtime}
                  onChange={(e) => handleRealtimeToggle(e.target.checked)}
                  sx={{ color: 'white' }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                  <TrendingUpIcon sx={{ mr: 0.5, fontSize: 16 }} />
                  실시간
                </Box>
              }
              sx={{ mr: 2 }}
            />
          )}

          {/* 로그인/사용자 정보 */}
          {isLoggedIn && currentUser ? (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip
                avatar={<Avatar>{currentUser.username.charAt(0).toUpperCase()}</Avatar>}
                label={currentUser.username}
                onClick={handleUserMenuOpen}
                sx={{ color: 'white', borderColor: 'white' }}
                variant="outlined"
              />
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
              >
                <MenuItem disabled>
                  <Typography variant="body2" color="text.secondary">
                    {currentUser.email}
                  </Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon sx={{ mr: 1 }} />
                  로그아웃
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            <Button 
              color="inherit" 
              onClick={() => setLoginDialogOpen(true)}
              startIcon={<AccountCircleIcon />}
            >
              로그인
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* 메인 컨텐츠 */}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom align="center">
            실시간 환경 모니터링 대시보드
          </Typography>
          <Typography variant="h6" component="p" align="center" color="text.secondary">
            IoT 센서를 통한 온도, 습도, 공기질 실시간 모니터링
          </Typography>
        </Box>

        {/* 로그인 안내 메시지 */}
        {!isLoggedIn && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography>
              <strong>알림:</strong> 센서 데이터를 확인하려면 로그인이 필요합니다. 
              상단의 "로그인" 버튼을 클릭하세요.
            </Typography>
          </Alert>
        )}

        {/* API 테스트 결과 표시 */}
        {apiTestResult && (
          <Box sx={{ mb: 3 }}>
            <Alert 
              severity={apiTestResult.status === 'success' ? 'success' : apiTestResult.status === 'error' ? 'error' : 'info'}
              sx={{ mb: 2 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {apiTestResult.status === 'loading' && <CircularProgress size={20} />}
                <Typography>{apiTestResult.message}</Typography>
              </Box>
            </Alert>
          </Box>
        )}

        {/* 대시보드 카드들 - 차트 통합 (크기 수정) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 3, mb: 4 }}>
          
          {/* 실시간 데이터 카드 - 높이 증가 */}
          <Card sx={{ minHeight: 600 }}>
            <CardContent sx={{ height: '100%', p: 3, pb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  📊 실시간 데이터
                </Typography>
                <Button 
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={() => loadSensorData(true)}
                  disabled={!isLoggedIn}
                >
                  새로고침
                </Button>
              </Box>
              
              {/* 실시간 센서 데이터 테이블 */}
              {isLoggedIn && sensorData.length > 0 ? (
                <Box sx={{ width: '100%', mb: 3 }}>
                  {/* 최신 데이터 요약 */}
                  <Box sx={{ mb: 3, p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      📡 최신 측정값
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="body2" color="text.secondary">온도</Typography>
                        <Typography variant="h5" color="primary">
                          {getLatestValue('temperature')?.toFixed(1) || 'N/A'}°C
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="body2" color="text.secondary">습도</Typography>
                        <Typography variant="h5" color="info.main">
                          {getLatestValue('humidity')?.toFixed(1) || 'N/A'}%
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="body2" color="text.secondary">공기질</Typography>
                        <Typography variant="h5" color="warning.main">
                          {Math.round(getLatestValue('air_quality') || 0)}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="body2" color="text.secondary">자외선</Typography>
                        <Typography variant="h5" sx={{ color: '#FF9800' }}>
                          {getLatestValue('uv_index')?.toFixed(1) || 'N/A'}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="body2" color="text.secondary">조도</Typography>
                        <Typography variant="h5" sx={{ color: '#FFC107' }}>
                          {Math.round(getLatestValue('light_level') || 0)} lux
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* 최근 데이터 이력 테이블 */}
                  <Box sx={{ backgroundColor: 'white', borderRadius: 1, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                    <Typography variant="h6" sx={{ p: 2, backgroundColor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
                      📊 최근 측정 이력 (최신 5개)
                    </Typography>
                    <Box sx={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#fafafa' }}>
                            <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #e0e0e0' }}>
                              시간
                            </th>
                            <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #e0e0e0' }}>
                              온도 (°C)
                            </th>
                            <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #e0e0e0' }}>
                              습도 (%)
                            </th>
                            <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #e0e0e0' }}>
                              공기질
                            </th>
                            <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #e0e0e0' }}>
                              자외선
                            </th>
                            <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #e0e0e0' }}>
                              조도 (lux)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sensorData.slice(-5).reverse().map((data, index) => (
                            <tr key={index} style={{ borderBottom: index < 4 ? '1px solid #f0f0f0' : 'none' }}>
                              <td style={{ padding: '10px 8px', fontSize: '13px', color: '#666' }}>
                                {new Date(data.timestamp).toLocaleTimeString('ko-KR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '14px', fontWeight: '500', color: '#1976d2' }}>
                                {data.temperature.toFixed(1)}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '14px', fontWeight: '500', color: '#0288d1' }}>
                                {data.humidity.toFixed(1)}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '14px', fontWeight: '500', color: '#ed6c02' }}>
                                {Math.round(data.air_quality)}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '14px', fontWeight: '500', color: '#ff9800' }}>
                                {data.uv_index?.toFixed(1) || 'N/A'}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '14px', fontWeight: '500', color: '#ffc107' }}>
                                {Math.round(data.light_level || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ 
                  height: 300, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexDirection: 'column',
                  color: 'text.secondary',
                  mb: 3
                }}>
                  <DashboardIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                  <Typography>
                    {!isLoggedIn ? '로그인 후 이용가능' : '데이터를 불러오세요'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* 온도 모니터링 카드 */}
          <Card sx={{ minHeight: 320 }}>
            <CardContent sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  🌡️ 온도 모니터링
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small"
                  sx={{ borderColor: '#2E7D32', color: '#2E7D32' }}
                  disabled={!isLoggedIn}
                  onClick={() => handleDetailView('temperature')}
                >
                  상세 차트
                </Button>
              </Box>
              
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Typography variant="h2" color="primary" gutterBottom sx={{ fontWeight: 'bold' }}>
                  {getLatestValue('temperature')?.toFixed(1) || '25.5'}°C
                </Typography>
                
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  상태: 정상 범위
                </Typography>
                
                {sensorData.length > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    최근 업데이트: {new Date(sensorData[sensorData.length - 1]?.timestamp).toLocaleTimeString()}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* 습도 모니터링 카드 */}
          <Card sx={{ minHeight: 320 }}>
            <CardContent sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  💧 습도 모니터링
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small"
                  sx={{ borderColor: '#2E7D32', color: '#2E7D32' }}
                  disabled={!isLoggedIn}
                  onClick={() => handleDetailView('humidity')}
                >
                  상세 차트
                </Button>
              </Box>
              
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Typography variant="h2" color="info.main" gutterBottom sx={{ fontWeight: 'bold' }}>
                  {getLatestValue('humidity')?.toFixed(1) || '60'}%
                </Typography>
                
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  상태: 적정 수준
                </Typography>
                
                {sensorData.length > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    최근 업데이트: {new Date(sensorData[sensorData.length - 1]?.timestamp).toLocaleTimeString()}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* 미세먼지 모니터링 카드 */}
          <Card sx={{ minHeight: 380 }}>
            <CardContent sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  🌬️ 미세먼지 모니터링
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small"
                  sx={{ borderColor: '#2E7D32', color: '#2E7D32' }}
                  disabled={!isLoggedIn}
                  onClick={() => handleDetailView('air_quality')}
                >
                  상세 차트
                </Button>
              </Box>
              
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {/* PM10 미세먼지 */}
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    PM10 (미세먼지)
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: getAirQualityColor(getLatestValue('air_quality') || 50, 'PM10') }}>
                    {Math.round((getLatestValue('air_quality') || 50) * 0.7)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ㎍/㎥
                  </Typography>
                  <Box sx={{ 
                    mt: 1, 
                    px: 2, 
                    py: 0.5, 
                    borderRadius: 2, 
                    backgroundColor: getAirQualityColor(getLatestValue('air_quality') || 50, 'PM10'),
                    color: 'white',
                    display: 'inline-block'
                  }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {getAirQualityStatus(Math.round((getLatestValue('air_quality') || 50) * 0.7), 'PM10')}
                    </Typography>
                  </Box>
                </Box>

                {/* PM2.5 초미세먼지 */}
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    PM2.5 (초미세먼지)
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: getAirQualityColor(getLatestValue('air_quality') || 35, 'PM25') }}>
                    {Math.round((getLatestValue('air_quality') || 35) * 0.4)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ㎍/㎥
                  </Typography>
                  <Box sx={{ 
                    mt: 1, 
                    px: 2, 
                    py: 0.5, 
                    borderRadius: 2, 
                    backgroundColor: getAirQualityColor(getLatestValue('air_quality') || 35, 'PM25'),
                    color: 'white',
                    display: 'inline-block'
                  }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {getAirQualityStatus(Math.round((getLatestValue('air_quality') || 35) * 0.4), 'PM25')}
                    </Typography>
                  </Box>
                </Box>

                {sensorData.length > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2, mb: 3 }}>
                    최근 업데이트: {new Date(sensorData[sensorData.length - 1]?.timestamp).toLocaleTimeString()}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* 자외선 지수 모니터링 카드 */}
          <Card sx={{ minHeight: 320 }}>
            <CardContent sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  ☀️ 자외선 지수
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small"
                  sx={{ borderColor: '#FF9800', color: '#FF9800' }}
                  disabled={!isLoggedIn}
                  onClick={() => handleDetailView('uv_index')}
                >
                  상세 차트
                </Button>
              </Box>
              
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Typography variant="h2" sx={{ fontWeight: 'bold', color: getUVIndexColor(getLatestValue('uv_index') || 3) }} gutterBottom>
                  {(getLatestValue('uv_index') || 3).toFixed(1)}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  UV Index
                </Typography>
                
                <Box sx={{ 
                  px: 2, 
                  py: 0.5, 
                  borderRadius: 2, 
                  backgroundColor: getUVIndexColor(getLatestValue('uv_index') || 3),
                  color: 'white',
                  display: 'inline-block',
                  mb: 2
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {getUVIndexStatus(getLatestValue('uv_index') || 3)}
                  </Typography>
                </Box>
                
                {sensorData.length > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    최근 업데이트: {new Date(sensorData[sensorData.length - 1]?.timestamp).toLocaleTimeString()}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* 조도 모니터링 카드 */}
          <Card sx={{ minHeight: 320 }}>
            <CardContent sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  💡 조도 모니터링
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small"
                  sx={{ borderColor: '#FFC107', color: '#FFC107' }}
                  disabled={!isLoggedIn}
                  onClick={() => handleDetailView('light_level')}
                >
                  상세 차트
                </Button>
              </Box>
              
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Typography variant="h2" sx={{ fontWeight: 'bold', color: getLightLevelColor(getLatestValue('light_level') || 350) }} gutterBottom>
                  {Math.round(getLatestValue('light_level') || 350)}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  lux
                </Typography>
                
                <Box sx={{ 
                  px: 2, 
                  py: 0.5, 
                  borderRadius: 2, 
                  backgroundColor: getLightLevelColor(getLatestValue('light_level') || 350),
                  color: 'white',
                  display: 'inline-block',
                  mb: 2
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {getLightLevelStatus(getLatestValue('light_level') || 350)}
                  </Typography>
                </Box>
                
                {sensorData.length > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    최근 업데이트: {new Date(sensorData[sensorData.length - 1]?.timestamp).toLocaleTimeString()}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* 연결 테스트 섹션 */}
        <Card sx={{ backgroundColor: '#f5f5f5' }}>
          <CardContent>
            <Typography variant="h5" component="h2" gutterBottom>
              🔗 백엔드 연결 테스트
            </Typography>
            <Typography variant="body1" gutterBottom>
              Django API 서버와의 연결을 테스트해보세요.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                sx={{ mr: 2, backgroundColor: '#1976D2' }}
                onClick={handleApiTest}
                disabled={apiTestResult?.status === 'loading'}
              >
                {apiTestResult?.status === 'loading' ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                API 연결 테스트
              </Button>
              <Button 
                variant="contained" 
                sx={{ backgroundColor: '#FF9800' }}
                onClick={handleWebSocketTest}
              >
                WebSocket 테스트
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* 간단한 디버깅 정보 */}
        <Card sx={{ mt: 3, backgroundColor: '#f0f0f0' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🔧 시스템 정보
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2">연결 상태</Typography>
                <Typography color={connectionStatus === 'connected' ? 'success.main' : 'error.main'}>
                  {getConnectionStatusText()}
                </Typography>
              </Paper>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2">데이터 개수</Typography>
                <Typography variant="h6">{sensorData.length}개</Typography>
              </Paper>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2">실시간 업데이트</Typography>
                <Typography color={isRealtime ? 'success.main' : 'text.secondary'}>
                  {isRealtime ? '활성화' : '비활성화'}
                </Typography>
              </Paper>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2">JWT 토큰</Typography>
                <Typography color={localStorage.getItem('access_token') ? 'success.main' : 'error.main'}>
                  {localStorage.getItem('access_token') ? '있음' : '없음'}
                </Typography>
              </Paper>
            </Box>
          </CardContent>
        </Card>

        {/* 실시간 데이터 표시 */}
        {sensorData.length > 0 && (
          <Card sx={{ mt: 3, backgroundColor: '#e8f5e8' }}>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom>
                📡 최신 센서 데이터 ({sensorData.length}개)
              </Typography>
              <Box sx={{ display: 'grid', gap: 2 }}>
                {sensorData.slice(-3).map((data, index) => (
                  <Box key={index} sx={{ p: 2, backgroundColor: 'white', borderRadius: 1 }}>
                    <Typography variant="h6">{data.device_name || `센서 ${index + 1}`}</Typography>
                    <Typography>🌡️ 온도: {data.temperature}°C</Typography>
                    <Typography>💧 습도: {data.humidity}%</Typography>
                    <Typography>🌬️ 공기질: {data.air_quality}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      측정시간: {new Date(data.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}
      </Container>

              {/* 상세 보기 다이얼로그 */}
        <Dialog
          open={detailDialog.open}
          onClose={handleDetailViewClose}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: { height: '80vh' }
          }}
        >
          <DialogTitle>
            <Typography variant="h5">
              {detailDialog.title}
            </Typography>
          </DialogTitle>
          
          <DialogContent sx={{ height: '100%', p: 3, pb: 4 }}>
            {detailDialog.type ? (
              <Box sx={{ height: '100%' }}>
                {/* 데이터 설명 메시지 */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="info.main" sx={{ 
                    backgroundColor: 'info.light', 
                    p: 1, 
                    borderRadius: 1,
                    textAlign: 'center'
                  }}>
                    {sensorData.length > 0 
                      ? '📊 현재 센서 값을 기준으로 하루치 패턴을 표시합니다 (1시간 간격)'
                      : '⚠️ 실제 센서 데이터가 없어 하루치 임시 데이터를 표시합니다 (1시간 간격)'
                    }
                  </Typography>
                </Box>
                
                {/* 큰 상세 차트 */}
                <Box sx={{ height: '75%', width: '100%', mb: 4 }}>
                  <RealtimeChart
                    data={sensorData.length > 0 ? generateDetailChartData(detailDialog.type) : generateDailyTestData(detailDialog.type)}
                    isRealtime={false}
                    onRealtimeToggle={undefined}
                  />
                </Box>

                {/* 간단한 통계 정보 */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                  gap: 2,
                  mt: 2
                }}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2">차트 데이터</Typography>
                    <Typography variant="h6" color="primary">
                      24개 (1시간 간격)
                    </Typography>
                  </Paper>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2">현재값</Typography>
                    <Typography variant="h6" color="success.main">
                      {sensorData.length > 0 ? (
                        <>
                          {detailDialog.type === 'temperature' && `${getLatestValue('temperature')?.toFixed(1)}°C`}
                          {detailDialog.type === 'humidity' && `${getLatestValue('humidity')?.toFixed(1)}%`}
                          {detailDialog.type === 'air_quality' && `${getLatestValue('air_quality')}`}
                          {detailDialog.type === 'uv_index' && `${getLatestValue('uv_index')?.toFixed(1)}`}
                          {detailDialog.type === 'light_level' && `${Math.round(getLatestValue('light_level') || 0)} lux`}
                        </>
                      ) : (
                        <>
                          {detailDialog.type === 'temperature' && '24.5°C'}
                          {detailDialog.type === 'humidity' && '58.2%'}
                          {detailDialog.type === 'air_quality' && '165'}
                          {detailDialog.type === 'uv_index' && '3.2'}
                          {detailDialog.type === 'light_level' && '420 lux'}
                        </>
                      )}
                    </Typography>
                  </Paper>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2">데이터 타입</Typography>
                    <Typography variant="h6" color="text.secondary">
                      {sensorData.length > 0 ? '확장된 패턴' : '임시 데이터'}
                    </Typography>
                  </Paper>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2">최근 업데이트</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {sensorData.length > 0 ? 
                        new Date(sensorData[sensorData.length - 1]?.timestamp).toLocaleTimeString() :
                        new Date().toLocaleTimeString()
                      }
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            ) : (
              <Box sx={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexDirection: 'column'
              }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  표시할 데이터가 없습니다
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  센서 데이터를 먼저 로드해주세요.
                </Typography>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleDetailViewClose} size="large">
              닫기
            </Button>
            <Button 
              variant="contained" 
              onClick={() => loadSensorData(true)}
              disabled={!isLoggedIn}
              size="large"
            >
              데이터 새로고침
            </Button>
          </DialogActions>
        </Dialog>

        {/* 로그인 다이얼로그 */}
      <Login
        open={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}

export default App;
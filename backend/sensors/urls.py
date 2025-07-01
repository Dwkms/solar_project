# sensors/urls.py - 완전 재작성
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# DRF Router 설정
router = DefaultRouter()
router.register(r'devices', views.DeviceViewSet, basename='device')
router.register(r'sensor-data', views.SensorDataViewSet, basename='sensordata')
router.register(r'alerts', views.AlertViewSet, basename='alert')
router.register(r'settings', views.UserSettingsViewSet, basename='usersettings')

app_name = 'sensors'

urlpatterns = [
    # ========== 서버 상태 확인 (최우선) ==========
    path('api/health/', views.health_check, name='health-check'),
    
    # ========== DRF Router 기본 엔드포인트 ==========
    path('api/', include(router.urls)),
    
    # ========== Arduino/IoT 디바이스용 엔드포인트 ==========
    path('api/sensors/data/', views.receive_sensor_data, name='receive-sensor-data'),
    
    # ========== 웹 대시보드용 엔드포인트 ==========
    path('api/dashboard/summary/', views.dashboard_summary, name='dashboard-summary'),
    
    # ========== 개별 기능 엔드포인트 ==========
    # 최신 데이터 조회
    path('api/sensor-data/latest/', 
         views.SensorDataViewSet.as_view({'get': 'latest'}), 
         name='latest-sensor-data'),
    
    # 통계 데이터 조회
    path('api/sensor-data/statistics/', 
         views.SensorDataViewSet.as_view({'get': 'statistics'}), 
         name='sensor-statistics'),
    
    # 활성 알림만 조회
    path('api/alerts/active/', 
         views.AlertViewSet.as_view({'get': 'active'}), 
         name='active-alerts'),
    
    # 특정 알림 해결 처리
    path('api/alerts/<int:pk>/resolve/', 
         views.AlertViewSet.as_view({'patch': 'resolve'}), 
         name='resolve-alert'),
]
# sensors/views.py - 완전 재작성
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User
from django.db.models import Avg, Count, Max, Sum
from django.utils import timezone
from datetime import timedelta
import logging

from .models import Device, SensorData, Alert, UserSettings
from .serializers import (
    DeviceSerializer, SensorDataSerializer, SensorDataCreateSerializer,
    AlertSerializer, UserSettingsSerializer, DeviceStatsSerializer
)

logger = logging.getLogger('sensors')

# ========== 서버 상태 확인 (최우선) ==========
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """서버 상태 확인용 엔드포인트"""
    return Response({
        'status': 'healthy',
        'timestamp': timezone.now(),
        'message': 'Solar 환경 모니터링 서버가 정상 작동 중입니다.',
        'version': '1.0.0'
    })

# ========== ViewSet 클래스들 ==========
class DeviceViewSet(viewsets.ModelViewSet):
    """디바이스 관리 ViewSet"""
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """사용자 본인의 디바이스만 조회"""
        return Device.objects.filter(owner=self.request.user)
    
    def perform_create(self, serializer):
        """디바이스 생성 시 현재 사용자를 소유자로 설정"""
        import uuid
        api_key = str(uuid.uuid4())  # 고유한 API 키 생성
        serializer.save(owner=self.request.user, api_key=api_key)

class SensorDataViewSet(viewsets.ModelViewSet):
    """센서 데이터 관리 ViewSet"""
    serializer_class = SensorDataSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """사용자 소유 디바이스의 센서 데이터만 조회"""
        user_devices = Device.objects.filter(owner=self.request.user)
        queryset = SensorData.objects.filter(device__in=user_devices)
        
        # 필터링 옵션
        device_id = self.request.query_params.get('device_id', None)
        hours = self.request.query_params.get('hours', None)
        
        if device_id:
            queryset = queryset.filter(device_id=device_id)
        
        if hours:
            try:
                hours_ago = timezone.now() - timedelta(hours=int(hours))
                queryset = queryset.filter(timestamp__gte=hours_ago)
            except ValueError:
                pass  # 잘못된 hours 값 무시
        
        return queryset.order_by('-timestamp')
    
    @action(detail=False, methods=['get'])
    def latest(self, request):
        """최신 센서 데이터 조회"""
        user_devices = Device.objects.filter(owner=request.user)
        latest_data = []
        
        for device in user_devices:
            latest = SensorData.objects.filter(device=device).order_by('-timestamp').first()
            if latest:
                serializer = self.get_serializer(latest)
                latest_data.append(serializer.data)
        
        return Response(latest_data)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """디바이스별 통계 정보"""
        user_devices = Device.objects.filter(owner=request.user)
        stats = []
        
        for device in user_devices:
            data = SensorData.objects.filter(device=device)
            
            if data.exists():
                device_stats = data.aggregate(
                    total_records=Count('id'),
                    latest_timestamp=Max('timestamp'),
                    avg_temperature=Avg('temperature'),
                    avg_humidity=Avg('humidity'),
                    avg_air_quality=Avg('air_quality')
                )
                
                # 활성 알림 수
                active_alerts = Alert.objects.filter(
                    device=device, 
                    status='active'
                ).count()
                
                device_stats.update({
                    'device_id': device.id,
                    'device_name': device.name,
                    'active_alerts': active_alerts
                })
                
                stats.append(device_stats)
        
        serializer = DeviceStatsSerializer(stats, many=True)
        return Response(serializer.data)

class AlertViewSet(viewsets.ModelViewSet):
    """알림 관리 ViewSet"""
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """사용자 소유 디바이스의 알림만 조회"""
        user_devices = Device.objects.filter(owner=self.request.user)
        queryset = Alert.objects.filter(device__in=user_devices)
        
        # 상태별 필터링
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['patch'])
    def resolve(self, request, pk=None):
        """알림 해결 처리"""
        alert = self.get_object()
        alert.status = 'resolved'
        alert.resolved_at = timezone.now()
        alert.save()
        
        serializer = self.get_serializer(alert)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """활성 알림만 조회"""
        user_devices = Device.objects.filter(owner=request.user)
        active_alerts = Alert.objects.filter(
            device__in=user_devices,
            status='active'
        ).order_by('-created_at')
        
        serializer = self.get_serializer(active_alerts, many=True)
        return Response(serializer.data)

class UserSettingsViewSet(viewsets.ModelViewSet):
    """사용자 설정 관리 ViewSet"""
    serializer_class = UserSettingsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """현재 사용자의 설정만 조회"""
        return UserSettings.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """설정 생성 시 현재 사용자 설정"""
        serializer.save(user=self.request.user)

# ========== API 함수들 ==========
@api_view(['POST'])
@permission_classes([AllowAny])
def receive_sensor_data(request):
    """
    센서에서 데이터를 받는 엔드포인트
    
    POST /api/sensors/data/
    {
        "api_key": "device-api-key",
        "temperature": 25.5,
        "humidity": 60.0,
        "air_quality": 450,
        "uv_index": 5.2,
        "light_level": 800
    }
    """
    logger.info(f"센서 데이터 수신: {request.data}")
    
    serializer = SensorDataCreateSerializer(data=request.data)
    
    if serializer.is_valid():
        sensor_data = serializer.save()
        
        # 응답 데이터
        response_data = {
            'status': 'success',
            'message': '데이터가 성공적으로 저장되었습니다.',
            'data_id': sensor_data.id,
            'timestamp': sensor_data.timestamp,
            'device': sensor_data.device.name
        }
        
        logger.info(f"센서 데이터 저장 성공: {sensor_data.id}")
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    else:
        logger.warning(f"센서 데이터 검증 실패: {serializer.errors}")
        return Response({
            'status': 'error',
            'message': '데이터 검증에 실패했습니다.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """대시보드용 요약 정보"""
    user_devices = Device.objects.filter(owner=request.user)
    
    # 전체 통계
    total_devices = user_devices.count()
    active_devices = user_devices.filter(is_active=True).count()
    
    # 최근 24시간 데이터
    yesterday = timezone.now() - timedelta(hours=24)
    recent_data_count = SensorData.objects.filter(
        device__in=user_devices,
        timestamp__gte=yesterday
    ).count()
    
    # 활성 알림
    active_alerts_count = Alert.objects.filter(
        device__in=user_devices,
        status='active'
    ).count()
    
    # 최신 센서 데이터 (각 디바이스별 1개씩)
    latest_readings = []
    for device in user_devices.filter(is_active=True):
        latest = SensorData.objects.filter(device=device).order_by('-timestamp').first()
        if latest:
            latest_readings.append({
                'device_name': device.name,
                'device_location': device.location,
                'temperature': latest.temperature,
                'humidity': latest.humidity,
                'air_quality': latest.air_quality,
                'timestamp': latest.timestamp
            })
    
    return Response({
        'summary': {
            'total_devices': total_devices,
            'active_devices': active_devices,
            'recent_data_count': recent_data_count,
            'active_alerts_count': active_alerts_count
        },
        'latest_readings': latest_readings
    })
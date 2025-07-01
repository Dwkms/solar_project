# sensors/signals.py - 실시간 데이터 전송 신호 처리
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json

from .models import SensorData, Alert
from .serializers import SensorDataSerializer, AlertSerializer

# 채널 레이어 인스턴스
channel_layer = get_channel_layer()

@receiver(post_save, sender=SensorData)
def sensor_data_created(sender, instance, created, **kwargs):
    """
    센서 데이터가 생성될 때 실시간으로 WebSocket을 통해 전송
    """
    if created:  # 새로 생성된 경우만
        # 시리얼라이저로 데이터 변환
        serializer = SensorDataSerializer(instance)
        data = serializer.data
        
        # 해당 사용자의 WebSocket 그룹에 데이터 전송
        group_name = f'user_{instance.device.owner.id}_sensors'
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'sensor_data_update',
                'data': data
            }
        )
        
        # 로깅
        print(f"실시간 센서 데이터 전송: {instance.device.name} - {instance.timestamp}")

@receiver(post_save, sender=Alert)
def alert_created(sender, instance, created, **kwargs):
    """
    알림이 생성될 때 실시간으로 WebSocket을 통해 전송
    """
    if created:  # 새로 생성된 경우만
        # 시리얼라이저로 데이터 변환
        serializer = AlertSerializer(instance)
        alert_data = serializer.data
        
        # 해당 사용자의 WebSocket 그룹에 알림 전송
        group_name = f'user_{instance.device.owner.id}_alerts'
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'alert_notification',
                'alert': alert_data,
                'timestamp': instance.created_at.isoformat()
            }
        )
        
        # 센서 데이터 그룹에도 알림 전송 (통합 대시보드용)
        sensor_group_name = f'user_{instance.device.owner.id}_sensors'
        async_to_sync(channel_layer.group_send)(
            sensor_group_name,
            {
                'type': 'alert_notification',
                'alert': alert_data
            }
        )
        
        # 로깅
        print(f"실시간 알림 전송: {instance.device.name} - {instance.get_alert_type_display()}")

# 앱 초기화 시 신호 등록
# apps.py
from django.apps import AppConfig

class SensorsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'sensors'
    
    def ready(self):
        import sensors.signals  # 신호 등록
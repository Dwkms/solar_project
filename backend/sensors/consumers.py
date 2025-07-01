# sensors/consumers.py - WebSocket 실시간 통신
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Device, SensorData, Alert
from .serializers import SensorDataSerializer, AlertSerializer

class SensorDataConsumer(AsyncWebsocketConsumer):
    """센서 데이터 실시간 스트리밍"""
    
    async def connect(self):
        """WebSocket 연결 시"""
        self.user = self.scope["user"]
        
        if self.user.is_anonymous:
            await self.close()
            return
        
        # 사용자별 그룹 생성
        self.group_name = f'user_{self.user.id}_sensors'
        
        # 그룹에 채널 추가
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # 연결 성공 메시지
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': f'실시간 센서 데이터 연결됨 (사용자: {self.user.username})'
        }))
    
    async def disconnect(self, close_code):
        """WebSocket 연결 해제 시"""
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """클라이언트로부터 메시지 수신"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'subscribe_device':
                # 특정 디바이스 구독
                device_id = data.get('device_id')
                await self.subscribe_to_device(device_id)
            
            elif message_type == 'get_latest_data':
                # 최신 데이터 요청
                await self.send_latest_data()
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': '잘못된 JSON 형식입니다.'
            }))
    
    async def subscribe_to_device(self, device_id):
        """특정 디바이스 구독"""
        device = await self.get_user_device(device_id)
        if device:
            await self.send(text_data=json.dumps({
                'type': 'subscription_success',
                'device_id': str(device_id),
                'message': f'{device.name} 디바이스 구독 완료'
            }))
        else:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': '디바이스를 찾을 수 없거나 권한이 없습니다.'
            }))
    
    async def send_latest_data(self):
        """최신 센서 데이터 전송"""
        latest_data = await self.get_latest_sensor_data()
        await self.send(text_data=json.dumps({
            'type': 'latest_data',
            'data': latest_data
        }))
    
    # WebSocket 이벤트 핸들러들
    async def sensor_data_update(self, event):
        """새로운 센서 데이터 알림"""
        await self.send(text_data=json.dumps({
            'type': 'sensor_data',
            'data': event['data']
        }))
    
    async def alert_notification(self, event):
        """알림 발생 시 클라이언트에 전송"""
        await self.send(text_data=json.dumps({
            'type': 'alert',
            'alert': event['alert']
        }))
    
    # 데이터베이스 조회 함수들
    @database_sync_to_async
    def get_user_device(self, device_id):
        try:
            return Device.objects.get(id=device_id, owner=self.user)
        except Device.DoesNotExist:
            return None
    
    @database_sync_to_async
    def get_latest_sensor_data(self):
        user_devices = Device.objects.filter(owner=self.user)
        latest_data = []
        
        for device in user_devices:
            latest = SensorData.objects.filter(device=device).order_by('-timestamp').first()
            if latest:
                serializer = SensorDataSerializer(latest)
                latest_data.append(serializer.data)
        
        return latest_data

class AlertConsumer(AsyncWebsocketConsumer):
    """알림 실시간 스트리밍"""
    
    async def connect(self):
        self.user = self.scope["user"]
        
        if self.user.is_anonymous:
            await self.close()
            return
        
        self.group_name = f'user_{self.user.id}_alerts'
        
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
    
    async def alert_notification(self, event):
        """실시간 알림 전송"""
        await self.send(text_data=json.dumps({
            'type': 'new_alert',
            'alert': event['alert'],
            'timestamp': event['timestamp']
        }))

# WebSocket 라우팅
# routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/sensors/$', consumers.SensorDataConsumer.as_asgi()),
    re_path(r'ws/alerts/$', consumers.AlertConsumer.as_asgi()),
]
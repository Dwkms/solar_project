from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Device, SensorData, Alert, UserSettings
import uuid

class DeviceSerializer(serializers.ModelSerializer):
    """디바이스 시리얼라이저"""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    
    class Meta:
        model = Device
        fields = ['id', 'name', 'location', 'api_key', 'is_active', 
                 'created_at', 'updated_at', 'owner', 'owner_username']
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner_username']
        extra_kwargs = {
            'api_key': {'write_only': True}  # 보안상 읽기 시 숨김
        }

class SensorDataCreateSerializer(serializers.ModelSerializer):
    """센서 데이터 생성용 시리얼라이저 (Arduino에서 POST할 때 사용)"""
    api_key = serializers.CharField(write_only=True)
    
    class Meta:
        model = SensorData
        fields = ['temperature', 'humidity', 'air_quality', 
                 'uv_index', 'light_level', 'raw_data', 'api_key']
        
    def validate_api_key(self, value):
        """API 키 검증"""
        try:
            device = Device.objects.get(api_key=value, is_active=True)
            return value
        except Device.DoesNotExist:
            raise serializers.ValidationError("유효하지 않은 API 키입니다.")
    
    def create(self, validated_data):
        """센서 데이터 생성"""
        api_key = validated_data.pop('api_key')
        device = Device.objects.get(api_key=api_key, is_active=True)
        sensor_data = SensorData.objects.create(device=device, **validated_data)
        
        # 알림 체크 (임계값 초과 시 알림 생성)
        self._check_alerts(sensor_data)
        
        return sensor_data
    
    def _check_alerts(self, sensor_data):
        """알림 체크 및 생성"""
        device = sensor_data.device
        owner = device.owner
        
        try:
            settings = UserSettings.objects.get(user=owner)
        except UserSettings.DoesNotExist:
            # 기본 설정 생성
            settings = UserSettings.objects.create(user=owner)
        
        alerts_to_create = []
        
        # 온도 체크
        if sensor_data.temperature > settings.temp_high_threshold:
            alerts_to_create.append(Alert(
                device=device,
                alert_type='temperature_high',
                threshold_value=settings.temp_high_threshold,
                current_value=sensor_data.temperature,
                message=f"고온 경고: {sensor_data.temperature}°C (임계값: {settings.temp_high_threshold}°C)"
            ))
        elif sensor_data.temperature < settings.temp_low_threshold:
            alerts_to_create.append(Alert(
                device=device,
                alert_type='temperature_low',
                threshold_value=settings.temp_low_threshold,
                current_value=sensor_data.temperature,
                message=f"저온 경고: {sensor_data.temperature}°C (임계값: {settings.temp_low_threshold}°C)"
            ))
        
        # 습도 체크
        if sensor_data.humidity > settings.humidity_high_threshold:
            alerts_to_create.append(Alert(
                device=device,
                alert_type='humidity_high',
                threshold_value=settings.humidity_high_threshold,
                current_value=sensor_data.humidity,
                message=f"고습도 경고: {sensor_data.humidity}% (임계값: {settings.humidity_high_threshold}%)"
            ))
        elif sensor_data.humidity < settings.humidity_low_threshold:
            alerts_to_create.append(Alert(
                device=device,
                alert_type='humidity_low',
                threshold_value=settings.humidity_low_threshold,
                current_value=sensor_data.humidity,
                message=f"저습도 경고: {sensor_data.humidity}% (임계값: {settings.humidity_low_threshold}%)"
            ))
        
        # 공기질 체크
        if sensor_data.air_quality > settings.air_quality_threshold:
            alerts_to_create.append(Alert(
                device=device,
                alert_type='air_quality_bad',
                threshold_value=settings.air_quality_threshold,
                current_value=sensor_data.air_quality,
                message=f"공기질 나쁨: {sensor_data.air_quality} (임계값: {settings.air_quality_threshold})"
            ))
        
        # 알림 벌크 생성
        if alerts_to_create:
            Alert.objects.bulk_create(alerts_to_create)

class SensorDataSerializer(serializers.ModelSerializer):
    """센서 데이터 조회용 시리얼라이저"""
    device_name = serializers.CharField(source='device.name', read_only=True)
    device_location = serializers.CharField(source='device.location', read_only=True)
    
    class Meta:
        model = SensorData
        fields = ['id', 'device', 'device_name', 'device_location',
                 'temperature', 'humidity', 'air_quality', 'uv_index', 
                 'light_level', 'timestamp', 'raw_data']
        read_only_fields = ['id', 'timestamp', 'device_name', 'device_location']

class AlertSerializer(serializers.ModelSerializer):
    """알림 시리얼라이저"""
    device_name = serializers.CharField(source='device.name', read_only=True)
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Alert
        fields = ['id', 'device', 'device_name', 'alert_type', 'alert_type_display',
                 'threshold_value', 'current_value', 'status', 'status_display', 
                 'message', 'created_at', 'resolved_at']
        read_only_fields = ['id', 'created_at', 'device_name', 'alert_type_display', 'status_display']

class UserSettingsSerializer(serializers.ModelSerializer):
    """사용자 설정 시리얼라이저"""
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = UserSettings
        fields = ['id', 'user', 'username', 'temp_high_threshold', 'temp_low_threshold',
                 'humidity_high_threshold', 'humidity_low_threshold', 'air_quality_threshold',
                 'email_notifications', 'push_notifications', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'username', 'created_at', 'updated_at']

class DeviceStatsSerializer(serializers.Serializer):
    """디바이스 통계 시리얼라이저"""
    device_id = serializers.UUIDField()
    device_name = serializers.CharField()
    total_records = serializers.IntegerField()
    latest_timestamp = serializers.DateTimeField()
    avg_temperature = serializers.FloatField()
    avg_humidity = serializers.FloatField()
    avg_air_quality = serializers.FloatField()
    active_alerts = serializers.IntegerField()
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

class Device(models.Model):
    """IoT 디바이스 정보"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name="디바이스 이름")
    location = models.CharField(max_length=200, verbose_name="설치 위치")
    api_key = models.CharField(max_length=255, unique=True, verbose_name="API 키")
    is_active = models.BooleanField(default=True, verbose_name="활성 상태")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일시")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일시")
    owner = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="소유자")

    class Meta:
        verbose_name = "디바이스"
        verbose_name_plural = "디바이스들"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.location})"

class SensorData(models.Model):
    """센서에서 수집된 데이터"""
    device = models.ForeignKey(Device, on_delete=models.CASCADE, verbose_name="디바이스")
    
    # 온도/습도 데이터 (DHT22)
    temperature = models.FloatField(
        validators=[MinValueValidator(-50), MaxValueValidator(100)],
        help_text="온도 (섭씨)",
        verbose_name="온도"
    )
    humidity = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="습도 (%)",
        verbose_name="습도"
    )
    
    # 공기질 데이터 (MQ-135)
    air_quality = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(1000)],
        help_text="공기질 지수 (0-1000)",
        verbose_name="공기질"
    )
    
    # 자외선 데이터 (선택사항)
    uv_index = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(15)],
        help_text="자외선 지수 (0-15)",
        verbose_name="자외선 지수"
    )
    
    # 조도 데이터 (선택사항)
    light_level = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(0)],
        help_text="조도 (lux)",
        verbose_name="조도"
    )
    
    # 메타데이터
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="측정시각")
    raw_data = models.JSONField(default=dict, blank=True, verbose_name="원시 데이터")
    
    class Meta:
        verbose_name = "센서 데이터"
        verbose_name_plural = "센서 데이터들"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['device', '-timestamp']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        return f"{self.device.name} - {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"

    @property
    def is_air_quality_dangerous(self):
        """공기질이 위험한지 확인"""
        return self.air_quality > 500

    @property
    def is_temperature_extreme(self):
        """극한 온도인지 확인"""
        return self.temperature < 0 or self.temperature > 40

class Alert(models.Model):
    """알림 설정 및 기록"""
    ALERT_TYPES = [
        ('temperature_high', '고온 경고'),
        ('temperature_low', '저온 경고'),
        ('humidity_high', '고습도 경고'),
        ('humidity_low', '저습도 경고'),
        ('air_quality_bad', '공기질 나쁨'),
        ('uv_high', '자외선 강함'),
    ]
    
    ALERT_STATUS = [
        ('active', '활성'),
        ('resolved', '해결됨'),
        ('ignored', '무시됨'),
    ]

    device = models.ForeignKey(Device, on_delete=models.CASCADE, verbose_name="디바이스")
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES, verbose_name="알림 타입")
    threshold_value = models.FloatField(verbose_name="임계값")
    current_value = models.FloatField(verbose_name="현재값")
    status = models.CharField(max_length=10, choices=ALERT_STATUS, default='active', verbose_name="상태")
    message = models.TextField(verbose_name="알림 메시지")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="발생시각")
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name="해결시각")

    class Meta:
        verbose_name = "알림"
        verbose_name_plural = "알림들"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.device.name} - {self.get_alert_type_display()}"

class UserSettings(models.Model):
    """사용자별 알림 설정"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, verbose_name="사용자")
    
    # 온도 알림 설정
    temp_high_threshold = models.FloatField(default=35.0, verbose_name="고온 임계값")
    temp_low_threshold = models.FloatField(default=5.0, verbose_name="저온 임계값")
    
    # 습도 알림 설정
    humidity_high_threshold = models.FloatField(default=80.0, verbose_name="고습도 임계값")
    humidity_low_threshold = models.FloatField(default=20.0, verbose_name="저습도 임계값")
    
    # 공기질 알림 설정
    air_quality_threshold = models.FloatField(default=500.0, verbose_name="공기질 임계값")
    
    # 알림 활성화 설정
    email_notifications = models.BooleanField(default=True, verbose_name="이메일 알림")
    push_notifications = models.BooleanField(default=True, verbose_name="푸시 알림")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일시")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일시")

    class Meta:
        verbose_name = "사용자 설정"
        verbose_name_plural = "사용자 설정들"

    def __str__(self):
        return f"{self.user.username} 설정"
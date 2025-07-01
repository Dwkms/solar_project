from django.contrib import admin
from .models import Device, SensorData, Alert, UserSettings

@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ['name', 'location', 'is_active', 'owner', 'created_at']
    list_filter = ['is_active', 'created_at', 'owner']
    search_fields = ['name', 'location', 'api_key']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('name', 'location', 'owner')
        }),
        ('API 설정', {
            'fields': ('api_key', 'is_active')
        }),
        ('시스템 정보', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(SensorData)
class SensorDataAdmin(admin.ModelAdmin):
    list_display = ['device', 'temperature', 'humidity', 'air_quality', 'timestamp']
    list_filter = ['device', 'timestamp']
    search_fields = ['device__name', 'device__location']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('디바이스 정보', {
            'fields': ('device', 'timestamp')
        }),
        ('센서 데이터', {
            'fields': ('temperature', 'humidity', 'air_quality', 'uv_index', 'light_level')
        }),
        ('원시 데이터', {
            'fields': ('raw_data',),
            'classes': ('collapse',)
        }),
    )
    
    # 최근 데이터 먼저 표시
    ordering = ['-timestamp']
    
    # 페이지당 표시할 항목 수
    list_per_page = 50

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['device', 'alert_type', 'current_value', 'threshold_value', 'status', 'created_at']
    list_filter = ['alert_type', 'status', 'created_at', 'device']
    search_fields = ['device__name', 'message']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('알림 정보', {
            'fields': ('device', 'alert_type', 'status')
        }),
        ('수치 정보', {
            'fields': ('current_value', 'threshold_value')
        }),
        ('메시지', {
            'fields': ('message',)
        }),
        ('시간 정보', {
            'fields': ('created_at', 'resolved_at')
        }),
    )
    
    # 상태별 필터 추가
    actions = ['mark_as_resolved', 'mark_as_ignored']
    
    def mark_as_resolved(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(status='resolved', resolved_at=timezone.now())
        self.message_user(request, f'{updated}개의 알림이 해결됨으로 표시되었습니다.')
    mark_as_resolved.short_description = "선택된 알림을 해결됨으로 표시"
    
    def mark_as_ignored(self, request, queryset):
        updated = queryset.update(status='ignored')
        self.message_user(request, f'{updated}개의 알림이 무시됨으로 표시되었습니다.')
    mark_as_ignored.short_description = "선택된 알림을 무시됨으로 표시"

@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    list_display = ['user', 'email_notifications', 'push_notifications', 'updated_at']
    list_filter = ['email_notifications', 'push_notifications', 'updated_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('사용자', {
            'fields': ('user',)
        }),
        ('온도 설정', {
            'fields': ('temp_high_threshold', 'temp_low_threshold')
        }),
        ('습도 설정', {
            'fields': ('humidity_high_threshold', 'humidity_low_threshold')
        }),
        ('공기질 설정', {
            'fields': ('air_quality_threshold',)
        }),
        ('알림 설정', {
            'fields': ('email_notifications', 'push_notifications')
        }),
        ('시간 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

# 관리자 사이트 커스터마이징
admin.site.site_header = "Solar 환경 모니터링 관리자"
admin.site.site_title = "Solar 관리자"
admin.site.index_title = "환경 모니터링 시스템 관리"
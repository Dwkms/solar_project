# solar_db/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def home_view(request):
    """메인 페이지 - 기본 응답"""
    return JsonResponse({
        'message': 'Solar 환경 모니터링 API 서버',
        'version': '1.0.0',
        'available_endpoints': [
            '/admin/ - Django 관리자',
            '/api/health/ - 서버 상태 확인',
            '/api/ - API 엔드포인트',
            '/auth/ - 인증 관련 API'
        ]
    })

urlpatterns = [
    # 메인 페이지 (빈 경로)
    path('', home_view, name='home'),
    
    # Django Admin
    path('admin/', admin.site.urls),
    
    # Sensors 앱의 모든 URL 포함
    path('', include('sensors.urls')),
    
    # Accounts 앱 URL - 인증 관련
    path('auth/', include('accounts.urls')),
]

# 개발 환경에서 미디어 파일 서빙
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
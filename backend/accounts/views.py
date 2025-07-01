# accounts/views.py - 사용자 인증 관련 뷰
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.db import IntegrityError
import logging

logger = logging.getLogger('accounts')

class RegisterView(APIView):
    """사용자 회원가입"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            username = request.data.get('username')
            email = request.data.get('email')
            password = request.data.get('password')
            
            # 입력 검증
            if not username or not email or not password:
                return Response({
                    'error': '사용자명, 이메일, 비밀번호를 모두 입력해주세요.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 사용자 생성
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password
            )
            
            # JWT 토큰 생성
            refresh = RefreshToken.for_user(user)
            
            logger.info(f"새 사용자 등록: {username}")
            
            return Response({
                'message': '회원가입이 완료되었습니다.',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                },
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
            
        except IntegrityError:
            return Response({
                'error': '이미 존재하는 사용자명입니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"회원가입 오류: {str(e)}")
            return Response({
                'error': '회원가입 중 오류가 발생했습니다.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProfileView(APIView):
    """사용자 프로필 조회"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'date_joined': user.date_joined,
            }
        })
    
    def put(self, request):
        """프로필 업데이트"""
        user = request.user
        
        # 이메일 업데이트
        email = request.data.get('email')
        if email:
            user.email = email
            user.save()
        
        return Response({
            'message': '프로필이 업데이트되었습니다.',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            }
        })

class LogoutView(APIView):
    """로그아웃 (토큰 블랙리스트)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            return Response({
                'message': '성공적으로 로그아웃되었습니다.'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': '로그아웃 중 오류가 발생했습니다.'
            }, status=status.HTTP_400_BAD_REQUEST)

# 간단한 API 함수들
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """로그인 (토큰 발급과 동일하지만 추가 검증)"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({
            'error': '사용자명과 비밀번호를 입력해주세요.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(username=username, password=password)
    
    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            'message': '로그인 성공',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            },
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })
    else:
        return Response({
            'error': '잘못된 사용자명 또는 비밀번호입니다.'
        }, status=status.HTTP_401_UNAUTHORIZED)
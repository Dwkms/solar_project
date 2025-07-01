# sensors/management/commands/generate_test_data.py
import random
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from sensors.models import Device, SensorData

class Command(BaseCommand):
    help = '테스트용 센서 데이터를 생성합니다'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=24,
            help='생성할 데이터의 시간 범위 (기본: 24시간)'
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=60,
            help='데이터 생성 간격 (분 단위, 기본: 60분)'
        )
        parser.add_argument(
            '--username',
            type=str,
            default='newbe123',
            help='테스트 데이터를 생성할 사용자명 (기본: newbe123)'
        )

    def handle(self, *args, **options):
        hours = options['hours']
        interval = options['interval']
        username = options['username']
        
        self.stdout.write(
            self.style.SUCCESS(f'🌱 테스트 데이터 생성 시작...')
        )
        
        try:
            # 사용자 확인
            user = User.objects.get(username=username)
            self.stdout.write(f'✅ 사용자 확인: {user.username}')
            
            # 테스트 디바이스 생성 또는 가져오기
            device, created = Device.objects.get_or_create(
                name='테스트 센서 #1',
                owner=user,
                defaults={
                    'location': '서울시 강남구',
                    'is_active': True,
                    'api_key': 'test-sensor-001'
                }
            )
            
            if created:
                self.stdout.write(f'✅ 새 디바이스 생성: {device.name}')
            else:
                self.stdout.write(f'✅ 기존 디바이스 사용: {device.name}')
            
            # 기존 테스트 데이터 삭제 (선택사항)
            existing_count = SensorData.objects.filter(device=device).count()
            if existing_count > 0:
                SensorData.objects.filter(device=device).delete()
                self.stdout.write(f'🗑️ 기존 데이터 {existing_count}개 삭제')
            
            # 시간 범위 계산
            end_time = timezone.now()
            start_time = end_time - timedelta(hours=hours)
            
            # 데이터 생성
            data_points = []
            current_time = start_time
            
            # 베이스 값들 (자연스러운 변화를 위해)
            base_temp = 22.0
            base_humidity = 55.0
            base_air_quality = 200
            
            count = 0
            while current_time <= end_time:
                # 시간대별 자연스러운 변화 패턴
                hour = current_time.hour
                
                # 온도: 낮에 높고 밤에 낮음
                temp_variation = 5 * (1 + 0.3 * random.random()) * (
                    1 if 10 <= hour <= 16 else 0.7 if 6 <= hour <= 10 or 17 <= hour <= 20 else 0.4
                )
                temperature = base_temp + temp_variation + random.uniform(-2, 2)
                
                # 습도: 온도와 반비례 경향
                humidity_base = max(30, min(80, base_humidity + random.uniform(-10, 10)))
                humidity = humidity_base + (25 - temperature) * 0.5 + random.uniform(-5, 5)
                humidity = max(20, min(90, humidity))
                
                # 공기질: 출퇴근 시간에 나쁨
                if 7 <= hour <= 9 or 18 <= hour <= 20:
                    air_quality = base_air_quality + random.uniform(50, 150)
                elif 22 <= hour or hour <= 5:
                    air_quality = base_air_quality - random.uniform(20, 80)
                else:
                    air_quality = base_air_quality + random.uniform(-30, 50)
                
                air_quality = max(50, min(500, air_quality))
                
                # UV 지수: 낮에만 존재
                if 6 <= hour <= 18:
                    uv_index = max(0, min(11, 3 + (hour - 12) * -0.2 + random.uniform(-1, 3)))
                else:
                    uv_index = 0
                
                # 조도: 시간대별
                if 6 <= hour <= 18:
                    light_level = 200 + (12 - abs(hour - 12)) * 100 + random.uniform(-50, 100)
                else:
                    light_level = random.uniform(0, 50)
                
                light_level = max(0, light_level)
                
                # 데이터 포인트 생성
                data_point = SensorData(
                    device=device,
                    temperature=round(temperature, 1),
                    humidity=round(humidity, 1),
                    air_quality=int(air_quality),
                    uv_index=round(uv_index, 1),
                    light_level=int(light_level),
                    timestamp=current_time
                )
                
                data_points.append(data_point)
                count += 1
                
                # 다음 시간으로
                current_time += timedelta(minutes=interval)
            
            # 배치로 데이터 저장
            SensorData.objects.bulk_create(data_points, batch_size=100)
            
            self.stdout.write(
                self.style.SUCCESS(f'🎉 성공! {count}개의 테스트 데이터가 생성되었습니다.')
            )
            self.stdout.write(f'📅 기간: {start_time.strftime("%Y-%m-%d %H:%M")} ~ {end_time.strftime("%Y-%m-%d %H:%M")}')
            self.stdout.write(f'🏷️ 디바이스: {device.name} (ID: {device.id})')
            self.stdout.write(f'👤 소유자: {user.username}')
            
            # 최신 데이터 몇 개 샘플 출력
            latest_samples = SensorData.objects.filter(device=device).order_by('-timestamp')[:3]
            self.stdout.write('\n📊 생성된 최신 데이터 샘플:')
            for sample in latest_samples:
                self.stdout.write(
                    f'  🌡️ {sample.temperature}°C | 💧 {sample.humidity}% | '
                    f'🌬️ {sample.air_quality} | 🕐 {sample.timestamp.strftime("%m/%d %H:%M")}'
                )
                
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'❌ 사용자 "{username}"를 찾을 수 없습니다.')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ 오류 발생: {str(e)}')
            )
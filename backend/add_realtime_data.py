#!/usr/bin/env python
"""
실시간 테스트 데이터 추가 스크립트
매 1시간마다 새로운 센서 데이터를 추가합니다.
"""

import os
import sys
import django
import time
import random
from datetime import datetime, timedelta

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'solar_db.settings')
django.setup()

from django.utils import timezone
from django.contrib.auth.models import User
from sensors.models import Device, SensorData

def generate_realistic_data():
    """현실적인 센서 데이터를 생성합니다."""
    now = timezone.now()
    hour = now.hour
    
    # 베이스 값들
    base_temp = 24.0
    base_humidity = 55.0
    base_air_quality = 200
    
    # 시간대별 변화
    if 10 <= hour <= 16:  # 낮
        temp_variation = random.uniform(3, 7)
        air_variation = random.uniform(-20, 30)
    elif 6 <= hour <= 10 or 17 <= hour <= 20:  # 아침/저녁
        temp_variation = random.uniform(1, 4)
        air_variation = random.uniform(20, 80)
    else:  # 밤
        temp_variation = random.uniform(-2, 2)
        air_variation = random.uniform(-30, 10)
    
    # 데이터 생성
    temperature = base_temp + temp_variation + random.uniform(-1.5, 1.5)
    humidity = base_humidity + (25 - temperature) * 0.5 + random.uniform(-8, 8)
    humidity = max(20, min(90, humidity))
    air_quality = base_air_quality + air_variation + random.uniform(-15, 15)
    air_quality = max(50, min(500, air_quality))
    
    # UV 지수 (낮에만)
    if 6 <= hour <= 18:
        uv_index = max(0, min(11, 3 + (hour - 12) * -0.2 + random.uniform(-1, 2)))
    else:
        uv_index = 0
    
    # 조도
    if 6 <= hour <= 18:
        light_level = 200 + (12 - abs(hour - 12)) * 80 + random.uniform(-40, 80)
    else:
        light_level = random.uniform(0, 30)
    
    return {
        'temperature': round(temperature, 1),
        'humidity': round(humidity, 1),
        'air_quality': int(air_quality),
        'uv_index': round(uv_index, 1),
        'light_level': int(max(0, light_level))
    }

def main():
    try:
        # newbe123과 디바이스 확인
        user = User.objects.get(username='newbe123')
        device = Device.objects.filter(owner=user).first()
        
        if not device:
            print("❌ 테스트 디바이스를 찾을 수 없습니다.")
            return
        
        print(f"🌱 실시간 데이터 생성 시작...")
        print(f"📍 디바이스: {device.name}")
        print(f"👤 사용자: {user.username}")
        print("🔄 1시간마다 새 데이터를 추가합니다. Ctrl+C로 중지.")
        print("-" * 50)
        
        count = 0
        while True:
            # 새 데이터 생성
            data = generate_realistic_data()
            
            # 데이터베이스에 저장
            sensor_data = SensorData.objects.create(
                device=device,
                temperature=data['temperature'],
                humidity=data['humidity'],
                air_quality=data['air_quality'],
                uv_index=data['uv_index'],
                light_level=data['light_level'],
                timestamp=timezone.now()
            )
            
            count += 1
            current_time = sensor_data.timestamp.strftime("%H:%M:%S")
            
            print(f"✅ [{count:3d}] {current_time} | "
                  f"🌡️ {data['temperature']:4.1f}°C | "
                  f"💧 {data['humidity']:4.1f}% | "
                  f"🌬️ {data['air_quality']:3d} | "
                  f"☀️ {data['uv_index']:3.1f}")
            
            # 1시간(3600초) 대기
            time.sleep(3600)
            
    except User.DoesNotExist:
        print("❌ 사용자 'newbe123'을 찾을 수 없습니다.")
    except KeyboardInterrupt:
        print(f"\n🛑 중지됨. 총 {count}개의 데이터가 추가되었습니다.")
    except Exception as e:
        print(f"❌ 오류: {e}")

if __name__ == "__main__":
    main()
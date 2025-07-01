// src/components/RealtimeChart.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, Typography, Box, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel } from '@mui/material';
import { format } from 'date-fns';

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// 타입 정의
interface SensorDataPoint {
  timestamp: string;
  temperature: number;
  humidity: number;
  air_quality: number;
  uv_index?: number;
  light_level?: number;
  device_name?: string;
}

interface RealtimeChartProps {
  data: SensorDataPoint[];
  isRealtime?: boolean;
  onRealtimeToggle?: (enabled: boolean) => void;
}

const RealtimeChart: React.FC<RealtimeChartProps> = ({ 
  data, 
  isRealtime = false, 
  onRealtimeToggle 
}) => {
  const [chartType, setChartType] = useState<'temperature' | 'humidity' | 'air_quality' | 'uv_index' | 'light_level' | 'all'>('all');
  const [maxDataPoints, setMaxDataPoints] = useState(20);
  const chartRef = useRef<ChartJS<"line">>(null);

  // 데이터 처리 - 최신 N개만 유지
  const processedData = data.slice(-maxDataPoints);

  // 시간 라벨 생성
  const timeLabels = processedData.map(point => 
    format(new Date(point.timestamp), 'HH:mm:ss')
  );

  // 차트 색상 설정
  const colors = {
    temperature: {
      background: 'rgba(255, 107, 53, 0.1)',
      border: 'rgba(255, 107, 53, 1)',
    },
    humidity: {
      background: 'rgba(78, 205, 196, 0.1)',
      border: 'rgba(78, 205, 196, 1)',
    },
    air_quality: {
      background: 'rgba(69, 183, 209, 0.1)',
      border: 'rgba(69, 183, 209, 1)',
    },
    uv_index: {
      background: 'rgba(255, 152, 0, 0.1)',
      border: 'rgba(255, 152, 0, 1)',
    },
    light_level: {
      background: 'rgba(255, 193, 7, 0.1)',
      border: 'rgba(255, 193, 7, 1)',
    },
  };

  // 차트 데이터셋 생성
  const getDatasets = () => {
    const datasets = [];

    if (chartType === 'temperature' || chartType === 'all') {
      datasets.push({
        label: '온도 (°C)',
        data: processedData.map(point => point.temperature),
        backgroundColor: colors.temperature.background,
        borderColor: colors.temperature.border,
        borderWidth: 2,
        fill: chartType === 'temperature',
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      });
    }

    if (chartType === 'humidity' || chartType === 'all') {
      datasets.push({
        label: '습도 (%)',
        data: processedData.map(point => point.humidity),
        backgroundColor: colors.humidity.background,
        borderColor: colors.humidity.border,
        borderWidth: 2,
        fill: chartType === 'humidity',
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      });
    }

    if (chartType === 'air_quality' || chartType === 'all') {
      datasets.push({
        label: '공기질 (지수)',
        data: processedData.map(point => point.air_quality),
        backgroundColor: colors.air_quality.background,
        borderColor: colors.air_quality.border,
        borderWidth: 2,
        fill: chartType === 'air_quality',
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      });
    }

    if (chartType === 'uv_index' || chartType === 'all') {
      datasets.push({
        label: '자외선 지수',
        data: processedData.map(point => point.uv_index || 0),
        backgroundColor: colors.uv_index.background,
        borderColor: colors.uv_index.border,
        borderWidth: 2,
        fill: chartType === 'uv_index',
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      });
    }

    if (chartType === 'light_level' || chartType === 'all') {
      datasets.push({
        label: '조도 (lux)',
        data: processedData.map(point => point.light_level || 0),
        backgroundColor: colors.light_level.background,
        borderColor: colors.light_level.border,
        borderWidth: 2,
        fill: chartType === 'light_level',
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      });
    }

    return datasets;
  };

  const chartData = {
    labels: timeLabels,
    datasets: getDatasets(),
  };

  // 차트 옵션
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10,
      },
    },
    animation: {
      duration: isRealtime ? 750 : 1000,
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          boxHeight: 10,
          font: {
            size: 11,
          },
        },
      },
      title: {
        display: true,
        text: '실시간 센서 데이터',
        font: {
          size: 14,
          weight: 'bold',
        },
        padding: {
          top: 5,
          bottom: 10,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (context) => {
            const index = context[0].dataIndex;
            const timestamp = processedData[index]?.timestamp;
            return timestamp ? format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss') : '';
          },
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (label.includes('온도')) return `${label}: ${value.toFixed(1)}°C`;
            if (label.includes('습도')) return `${label}: ${value.toFixed(1)}%`;
            if (label.includes('공기질')) return `${label}: ${value.toFixed(0)}`;
            if (label.includes('자외선')) return `${label}: ${value.toFixed(1)}`;
            if (label.includes('조도')) return `${label}: ${value.toFixed(0)} lux`;
            return `${label}: ${value}`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: '시간',
          color: '#666',
          font: {
            size: 10,
            weight: 'bold',
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 9,
          },
          maxTicksLimit: 8,
        },
      },
      y: {
        title: {
          display: true,
          text: '값',
          color: '#666',
          font: {
            size: 10,
            weight: 'bold',
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 9,
          },
          maxTicksLimit: 6,
        },
        beginAtZero: false,
      },
    },
  };

  // 실시간 업데이트 시 차트 애니메이션
  useEffect(() => {
    if (isRealtime && chartRef.current) {
      chartRef.current.update('active');
    }
  }, [data, isRealtime]);

  return (
    <Card sx={{ height: '500px', mb: 3 }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* 차트 컨트롤 */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>차트 타입</InputLabel>
            <Select
              value={chartType}
              label="차트 타입"
              onChange={(e) => setChartType(e.target.value as any)}
            >
              <MenuItem value="all">전체</MenuItem>
              <MenuItem value="temperature">온도</MenuItem>
              <MenuItem value="humidity">습도</MenuItem>
              <MenuItem value="air_quality">공기질</MenuItem>
              <MenuItem value="uv_index">자외선 지수</MenuItem>
              <MenuItem value="light_level">조도</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>데이터 개수</InputLabel>
            <Select
              value={maxDataPoints}
              label="데이터 개수"
              onChange={(e) => setMaxDataPoints(Number(e.target.value))}
            >
              <MenuItem value={10}>최근 10개</MenuItem>
              <MenuItem value={20}>최근 20개</MenuItem>
              <MenuItem value={50}>최근 50개</MenuItem>
              <MenuItem value={100}>최근 100개</MenuItem>
            </Select>
          </FormControl>

          {onRealtimeToggle && (
            <FormControlLabel
              control={
                <Switch
                  checked={isRealtime}
                  onChange={(e) => onRealtimeToggle(e.target.checked)}
                  color="primary"
                />
              }
              label="실시간 업데이트"
            />
          )}

          {/* 현재 데이터 개수 표시 */}
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            총 {data.length}개 데이터 포인트
          </Typography>
        </Box>

        {/* 차트 영역 */}
        <Box sx={{ flex: 1, minHeight: 0 }}>
          {data.length > 0 ? (
            <Line ref={chartRef} data={chartData} options={options} />
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                color: 'text.secondary',
              }}
            >
              <Typography variant="h6" gutterBottom>
                📊 데이터가 없습니다
              </Typography>
              <Typography variant="body2">
                센서 데이터를 로드하거나 실시간 데이터를 기다리고 있습니다...
              </Typography>
            </Box>
          )}
        </Box>

        {/* 실시간 상태 표시 */}
        {isRealtime && (
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#4CAF50',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                  '100%': { opacity: 1 },
                },
              }}
            />
            <Typography variant="caption" color="success.main">
              실시간 업데이트 중...
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RealtimeChart;
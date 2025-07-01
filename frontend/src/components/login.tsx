// src/components/Login.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';
import { 
  Login as LoginIcon,
  PersonAdd as RegisterIcon 
} from '@mui/icons-material';
import { authService } from '../services/auth';

interface LoginProps {
  open: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any, tokens: any) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function Login({ open, onClose, onLoginSuccess }: LoginProps) {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 로그인 폼 상태
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });

  // 회원가입 폼 상태
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login(loginForm.username, loginForm.password);
      setSuccess('로그인 성공!');
      
      // 부모 컴포넌트에 로그인 성공 알림
      onLoginSuccess(response.user, response.tokens);
      
      // 폼 초기화
      setLoginForm({ username: '', password: '' });
      
      // 다이얼로그 닫기
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 1000);

    } catch (error: any) {
      setError(error.response?.data?.error || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 비밀번호 확인
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setLoading(false);
      return;
    }

    try {
      const response = await authService.register(
        registerForm.username,
        registerForm.email,
        registerForm.password
      );
      
      setSuccess('회원가입 성공! 자동으로 로그인됩니다.');
      
      // 자동 로그인
      onLoginSuccess(response.user, response.tokens);
      
      // 폼 초기화
      setRegisterForm({ username: '', email: '', password: '', confirmPassword: '' });
      
      // 다이얼로그 닫기
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 1500);

    } catch (error: any) {
      setError(error.response?.data?.error || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab icon={<LoginIcon />} label="로그인" />
            <Tab icon={<RegisterIcon />} label="회원가입" />
          </Tabs>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* 로그인 탭 */}
        <TabPanel value={tabValue} index={0}>
          <Box component="form" onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="사용자명"
              value={loginForm.username}
              onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              margin="normal"
              required
              disabled={loading}
            />
            <TextField
              fullWidth
              label="비밀번호"
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              margin="normal"
              required
              disabled={loading}
            />
          </Box>
        </TabPanel>

        {/* 회원가입 탭 */}
        <TabPanel value={tabValue} index={1}>
          <Box component="form" onSubmit={handleRegister}>
            <TextField
              fullWidth
              label="사용자명"
              value={registerForm.username}
              onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
              margin="normal"
              required
              disabled={loading}
            />
            <TextField
              fullWidth
              label="이메일"
              type="email"
              value={registerForm.email}
              onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
              margin="normal"
              required
              disabled={loading}
            />
            <TextField
              fullWidth
              label="비밀번호"
              type="password"
              value={registerForm.password}
              onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
              margin="normal"
              required
              disabled={loading}
            />
            <TextField
              fullWidth
              label="비밀번호 확인"
              type="password"
              value={registerForm.confirmPassword}
              onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
              margin="normal"
              required
              disabled={loading}
            />
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          취소
        </Button>
        <Button
          onClick={tabValue === 0 ? handleLogin : handleRegister}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? '처리중...' : (tabValue === 0 ? '로그인' : '회원가입')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
import React, { useEffect, useMemo, useState } from 'react';
import { View, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setToken } from './src/api';
import { AppContext, ThemeContext, UIHost, applyTheme, colors, toast } from './src/ui';
import LoginScreen from './src/screens/LoginScreen';
import UserListScreen from './src/screens/UserListScreen';
import UserFormScreen from './src/screens/UserFormScreen';
import UserDetailScreen from './src/screens/UserDetailScreen';
import DashboardScreen from './src/screens/DashboardScreen';

const THEME_KEY = 'theme'; // lưu trên máy (localStorage / AsyncStorage), không lưu vào DB

export default function App() {
  // Giao diện: theo hệ thống cho tới khi người dùng tự chọn sáng / tối
  const system = useColorScheme();
  const [themePref, setThemePref] = useState(null);
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((v) => (v === 'light' || v === 'dark') && setThemePref(v))
      .catch(() => {});
  }, []);
  const mode = themePref || (system === 'dark' ? 'dark' : 'light');
  applyTheme(mode); // đổi bảng màu trước khi các màn hình con render
  const theme = useMemo(
    () => ({
      mode,
      toggle: () => {
        const next = mode === 'dark' ? 'light' : 'dark';
        setThemePref(next);
        AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
      },
    }),
    [mode]
  );

  const [currentUser, setCurrentUser] = useState(null);
  // Màn hình: 'list' | 'form' | 'detail' | 'dashboard' (chỉ admin)  ·  'me' | 'meEdit' (mọi người dùng)
  const [screen, setScreen] = useState({ name: 'list' });

  const login = (user) => {
    setCurrentUser(user);
    setScreen({ name: user.isAdmin ? 'list' : 'me' });
  };

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    setScreen({ name: 'list' });
    toast.info('Đã đăng xuất');
  };

  // Giữ nguyên isAdmin khi cập nhật thông tin người đang đăng nhập
  const updateCurrent = (u) => setCurrentUser((cur) => ({ ...cur, ...u, isAdmin: u.isAdmin ?? cur.isAdmin }));

  const ctx = useMemo(() => ({ currentUser, screen, go: setScreen, logout }), [currentUser, screen]);

  // Người dùng thường chỉ được vào 'me' / 'meEdit'
  const name =
    currentUser && !currentUser.isAdmin && screen.name !== 'me' && screen.name !== 'meEdit' ? 'me' : screen.name;

  let content;
  if (!currentUser) {
    content = <LoginScreen onLogin={login} />;
  } else if (name === 'me') {
    content = (
      <UserDetailScreen
        key="me"
        self
        user={currentUser}
        onBack={currentUser.isAdmin ? () => setScreen({ name: 'list' }) : undefined}
        onEdit={() => setScreen({ name: 'meEdit' })}
      />
    );
  } else if (name === 'meEdit') {
    content = (
      <UserFormScreen
        key="meEdit"
        self
        user={currentUser}
        onCancel={() => setScreen({ name: 'me' })}
        onDone={(u) => {
          updateCurrent(u);
          setScreen({ name: 'me' });
        }}
      />
    );
  } else if (name === 'form') {
    content = (
      <UserFormScreen
        key={screen.user?._id || 'new'}
        user={screen.user}
        onCancel={() => setScreen(screen.user ? { name: 'detail', user: screen.user } : { name: 'list' })}
        onDone={(u) => {
          if (u._id === currentUser._id) updateCurrent(u);
          setScreen({ name: 'detail', user: u });
        }}
      />
    );
  } else if (name === 'detail') {
    content = (
      <UserDetailScreen
        key={screen.user._id}
        user={screen.user}
        onBack={() => setScreen({ name: 'list' })}
        onEdit={(u) => setScreen({ name: 'form', user: u })}
        onDeleted={() => setScreen({ name: 'list' })}
      />
    );
  } else if (name === 'dashboard') {
    content = (
      <DashboardScreen
        onBack={() => setScreen({ name: 'list' })}
        onView={(u) => setScreen({ name: 'detail', user: u })}
      />
    );
  } else {
    content = (
      <UserListScreen
        onAdd={() => setScreen({ name: 'form', user: null })}
        onEdit={(u) => setScreen({ name: 'form', user: u })}
        onView={(u) => setScreen({ name: 'detail', user: u })}
      />
    );
  }

  // key={mode}: đổi giao diện thì dựng lại cây màn hình để mọi style lấy màu mới
  return (
    <ThemeContext.Provider value={theme}>
      <AppContext.Provider value={ctx}>
        <View key={mode} style={{ flex: 1, backgroundColor: colors.bg }}>
          <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
          {content}
          <UIHost />
        </View>
      </AppContext.Provider>
    </ThemeContext.Provider>
  );
}

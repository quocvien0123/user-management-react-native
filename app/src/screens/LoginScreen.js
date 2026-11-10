import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { api, setToken, API_URL } from '../api';
import { Button, Field, Icon, IconButton, ThemeToggle, colors, gradient, shadow, themed, toast, useIsWide } from '../ui';

const FEATURES = [
  { icon: 'users', text: 'Quản lý danh sách người dùng tập trung' },
  { icon: 'image', text: 'Ảnh đại diện lưu trực tiếp trên MongoDB Atlas' },
  { icon: 'lock', text: 'Mật khẩu mã hóa bcrypt, đăng nhập bằng JWT' },
];

export default function LoginScreen({ onLogin }) {
  const wide = useIsWide();
  const [email, setEmail] = useState('');
  const [matkhau, setMatkhau] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!email.trim() || !matkhau) return setError('Vui lòng nhập email và mật khẩu');
    setLoading(true);
    try {
      const { token, user } = await api.login(email.trim(), matkhau);
      setToken(token);
      toast.success('Đăng nhập thành công', `Xin chào, ${user.hoten}`);
      onLogin(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const form = (
    <View style={[s.formCard, !wide && s.formCardM]}>
      {!wide ? (
        <View style={s.mBrand}>
          <View style={[s.logo, { marginRight: 0 }]}>
            <Icon name="shield" size={24} color="#fff" />
          </View>
          <Text style={s.mBrandName}>UserAdmin</Text>
        </View>
      ) : null}

      <Text style={s.title}>Đăng nhập</Text>
      <Text style={s.sub}>Chào mừng trở lại! Vui lòng đăng nhập tài khoản quản trị.</Text>

      {error ? (
        <View style={s.alert}>
          <Icon name="alert-triangle" size={16} color={colors.danger} />
          <Text style={s.alertText}>{error}</Text>
        </View>
      ) : null}

      <Field
        label="Email"
        icon="mail"
        placeholder="admin@gmail.com"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={submit}
      />
      <Field
        label="Mật khẩu"
        icon="lock"
        placeholder="Nhập mật khẩu"
        secureTextEntry={!show}
        value={matkhau}
        onChangeText={setMatkhau}
        onSubmitEditing={submit}
        right={<IconButton icon={show ? 'eye-off' : 'eye'} onPress={() => setShow(!show)} style={{ marginRight: 4 }} />}
      />

      <Button title="Đăng nhập" icon="log-in" onPress={submit} loading={loading} style={{ marginTop: 6 }} />

      <View style={s.demo}>
        <Icon name="info" size={14} color={colors.primary} />
        <Text style={s.demoText}>
          Tài khoản demo: <Text style={s.bold}>admin@gmail.com</Text> / <Text style={s.bold}>123456</Text>
        </Text>
      </View>
      <Text style={s.server}>API: {API_URL}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {wide ? (
        <View style={s.split}>
          <View style={s.hero}>
            <View style={s.heroBrand}>
              <View style={[s.logo, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Icon name="shield" size={22} color="#fff" />
              </View>
              <Text style={s.heroBrandName}>UserAdmin</Text>
            </View>
            <View>
              <Text style={s.heroTitle}>Hệ thống quản lý{'\n'}người dùng</Text>
              <Text style={s.heroSub}>Thêm, sửa, xóa và tra cứu tài khoản trên mọi nền tảng: Web, Android và iOS.</Text>
              {FEATURES.map((f) => (
                <View key={f.icon} style={s.feature}>
                  <View style={s.featureIcon}>
                    <Icon name={f.icon} size={16} color="#fff" />
                  </View>
                  <Text style={s.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>
            <Text style={s.heroFoot}>React Native · Node.js · MongoDB Atlas</Text>
          </View>
          <View style={s.formSide}>{form}</View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.mWrap} keyboardShouldPersistTaps="handled">
          {form}
        </ScrollView>
      )}
      <View style={s.themeBtn}>
        <ThemeToggle />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = themed(() => StyleSheet.create({
  split: { flex: 1, flexDirection: 'row' },
  hero: {
    flex: 1,
    backgroundColor: colors.primary,
    ...gradient,
    padding: 48,
    justifyContent: 'space-between',
  },
  heroBrand: { flexDirection: 'row', alignItems: 'center' },
  heroBrandName: { color: '#fff', fontSize: 20, fontWeight: '800' },
  heroTitle: { color: '#fff', fontSize: 40, fontWeight: '800', lineHeight: 48, letterSpacing: -0.5 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 14, marginBottom: 32, maxWidth: 440, lineHeight: 24 },
  feature: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureText: { color: '#fff', fontSize: 15 },
  heroFoot: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  formSide: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.card },

  formCard: { width: '100%', maxWidth: 400 },
  formCardM: { backgroundColor: colors.card, borderRadius: 18, padding: 24, borderWidth: 1, borderColor: colors.border, ...shadow.md },
  mWrap: { flexGrow: 1, justifyContent: 'center', padding: 20, alignItems: 'center' },
  mBrand: { alignItems: 'center', marginBottom: 24 },
  mBrandName: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 10 },
  logo: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },

  title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  sub: { fontSize: 14.5, color: colors.muted, marginTop: 6, marginBottom: 26, lineHeight: 21 },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
  },
  alertText: { color: colors.danger, marginLeft: 8, flex: 1, fontSize: 13.5 },
  demo: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 10, padding: 12, marginTop: 20 },
  demoText: { color: colors.textSoft, marginLeft: 8, fontSize: 13 },
  bold: { fontWeight: '700', color: colors.primary },
  server: { color: colors.faint, fontSize: 11.5, textAlign: 'center', marginTop: 14 },
  themeBtn: { position: 'absolute', top: Platform.OS === 'web' ? 16 : (Constants.statusBarHeight || 24) + 8, right: 16 },
}));

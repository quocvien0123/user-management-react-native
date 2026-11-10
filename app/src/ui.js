import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { imageUrl } from './api';

// Chiều cao thanh trạng thái thật của máy (tai thỏ, Dynamic Island, Android...)
const STATUS_H = Platform.OS === 'web' ? 0 : Constants.statusBarHeight || 24;

/* ============================== Design tokens ============================== */
// Hai bảng màu sáng / tối. Lựa chọn giao diện chỉ lưu trên máy người dùng (AsyncStorage), không lưu vào DB.
const LIGHT = {
  primary: '#4f46e5',
  primaryDark: '#4338ca',
  primarySoft: '#eef2ff',
  danger: '#e11d48',
  dangerHover: '#be123c',
  dangerSoft: '#fff1f2',
  dangerSoftHover: '#ffe4e6',
  dangerBorder: '#fecdd3',
  success: '#059669',
  successSoft: '#ecfdf5',
  warning: '#d97706',
  warningSoft: '#fffbeb',
  bg: '#f5f7fb',
  card: '#ffffff',
  subtle: '#f8fafc', // nền đầu bảng, chân bảng, nút phụ khi hover
  rowHover: '#fafbff',
  text: '#0f172a',
  textSoft: '#334155',
  muted: '#64748b',
  faint: '#94a3b8',
  border: '#e5e7eb',
  borderSoft: '#f1f5f9',
  sidebar: '#111827',
  sidebarSoft: '#1f2937',
};

const DARK = {
  primary: '#7c7ff5',
  primaryDark: '#6366f1',
  primarySoft: '#1f2150',
  danger: '#f43f5e',
  dangerHover: '#e11d48',
  dangerSoft: '#3a1621',
  dangerSoftHover: '#4a1b29',
  dangerBorder: '#5c2333',
  success: '#10b981',
  successSoft: '#0e2f26',
  warning: '#f59e0b',
  warningSoft: '#332409',
  bg: '#0b1120',
  card: '#151c2c',
  subtle: '#111827',
  rowHover: '#1a2235',
  text: '#e5e7eb',
  textSoft: '#cbd5e1',
  muted: '#94a3b8',
  faint: '#64748b',
  border: '#263043',
  borderSoft: '#1c2536',
  sidebar: '#070b14',
  sidebarSoft: '#151c2c',
};

// `colors` là object dùng chung toàn app; khi đổi giao diện chỉ thay giá trị bên trong
export const colors = { ...LIGHT };
let themeVersion = 0;
let appliedMode = 'light';

export function applyTheme(mode) {
  if (mode === appliedMode) return;
  appliedMode = mode;
  Object.assign(colors, mode === 'dark' ? DARK : LIGHT);
  themeVersion++;
}

// Bọc StyleSheet: style được tạo lại theo màu hiện tại mỗi khi đổi giao diện
export function themed(factory) {
  let cache = null;
  let ver = -1;
  return new Proxy(
    {},
    {
      get(_, key) {
        if (ver !== themeVersion) {
          cache = factory();
          ver = themeVersion;
        }
        return cache[key];
      },
    }
  );
}

// { mode: 'light' | 'dark', toggle() }
export const ThemeContext = createContext({ mode: 'light', toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

export function ThemeToggle({ color }) {
  const { mode, toggle } = useTheme();
  return <IconButton icon={mode === 'dark' ? 'sun' : 'moon'} onPress={toggle} color={color || colors.muted} />;
}

export const shadow = {
  sm: { boxShadow: '0px 1px 2px rgba(15, 23, 42, 0.06)' },
  md: { boxShadow: '0px 4px 16px rgba(15, 23, 42, 0.08)' },
  lg: { boxShadow: '0px 12px 40px rgba(15, 23, 42, 0.18)' },
};

export const Icon = Feather;
export const isWeb = Platform.OS === 'web';
export const useIsWide = () => useWindowDimensions().width >= 900;

/* ===================== Toast + Confirm (dùng chung toàn app) ===================== */
const host = { toast: null, confirm: null };

export const toast = {
  success: (title, message) => host.toast?.({ type: 'success', title, message }),
  error: (title, message) => host.toast?.({ type: 'error', title, message }),
  info: (title, message) => host.toast?.({ type: 'info', title, message }),
};

// confirmAsync({ title, message, confirmText }) -> Promise<boolean>
export const confirmAsync = (opts) =>
  host.confirm ? host.confirm(opts) : Promise.resolve(isWeb ? window.confirm(opts.message) : false);

const TOAST_STYLE = themed(() => ({
  success: { icon: 'check-circle', color: colors.success, bg: colors.successSoft },
  error: { icon: 'alert-circle', color: colors.danger, bg: colors.dangerSoft },
  info: { icon: 'info', color: colors.primary, bg: colors.primarySoft },
}));

function ToastItem({ item, onDone }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: !isWeb }).start();
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: !isWeb }).start(onDone);
    }, 2800);
    return () => clearTimeout(t);
  }, []);
  const st = TOAST_STYLE[item.type];
  return (
    <Animated.View
      style={[
        u.toast,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] },
      ]}
    >
      <View style={[u.toastIcon, { backgroundColor: st.bg }]}>
        <Icon name={st.icon} size={18} color={st.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={u.toastTitle}>{item.title}</Text>
        {item.message ? <Text style={u.toastMsg}>{item.message}</Text> : null}
      </View>
    </Animated.View>
  );
}

export function UIHost() {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    host.toast = (t) => setToasts((list) => [...list.slice(-2), { ...t, id: Date.now() + Math.random() }]);
    host.confirm = (opts) => new Promise((resolve) => setDialog({ ...opts, resolve }));
    return () => {
      host.toast = null;
      host.confirm = null;
    };
  }, []);

  const close = (val) => {
    dialog?.resolve(val);
    setDialog(null);
  };
  // confirmAsync({ ..., tone: 'primary', icon: 'upload' }) cho hộp thoại không phải xóa
  const primaryTone = dialog?.tone === 'primary';

  return (
    <>
      <View pointerEvents="box-none" style={u.toastWrap}>
        {toasts.map((t) => (
          <ToastItem key={t.id} item={t} onDone={() => setToasts((l) => l.filter((x) => x.id !== t.id))} />
        ))}
      </View>

      <Modal transparent visible={!!dialog} animationType="fade" onRequestClose={() => close(false)}>
        <Pressable style={u.overlay} onPress={() => close(false)}>
          <Pressable style={u.dialog} onPress={() => {}}>
            <View style={[u.dialogIcon, { backgroundColor: primaryTone ? colors.primarySoft : colors.dangerSoft }]}>
              <Icon name={dialog?.icon || 'trash-2'} size={22} color={primaryTone ? colors.primary : colors.danger} />
            </View>
            <Text style={u.dialogTitle}>{dialog?.title}</Text>
            <Text style={u.dialogMsg}>{dialog?.message}</Text>
            <View style={u.dialogBtns}>
              <Button title="Hủy" variant="secondary" onPress={() => close(false)} style={{ flex: 1 }} />
              <Button
                title={dialog?.confirmText || 'Xóa'}
                variant={primaryTone ? 'primary' : 'danger'}
                onPress={() => close(true)}
                style={{ flex: 1, marginLeft: 10 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/* ================================ Components ================================ */
const BTN = themed(() => ({
  primary: { bg: colors.primary, hover: colors.primaryDark, fg: '#fff', border: colors.primary },
  secondary: { bg: colors.card, hover: colors.subtle, fg: colors.textSoft, border: colors.border },
  danger: { bg: colors.danger, hover: colors.dangerHover, fg: '#fff', border: colors.danger },
  dangerSoft: { bg: colors.dangerSoft, hover: colors.dangerSoftHover, fg: colors.danger, border: colors.dangerBorder },
  ghost: { bg: 'transparent', hover: colors.borderSoft, fg: colors.textSoft, border: 'transparent' },
}));

export function Button({ title, icon, onPress, variant = 'primary', size = 'md', loading, disabled, style }) {
  const v = BTN[variant];
  const sm = size === 'sm';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed, hovered }) => [
        u.btn,
        sm && u.btnSm,
        {
          backgroundColor: hovered || pressed ? v.hover : v.bg,
          borderColor: v.border,
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        variant === 'primary' && !disabled && shadow.sm,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <>
          {icon ? <Icon name={icon} size={sm ? 15 : 17} color={v.fg} style={title ? { marginRight: 8 } : null} /> : null}
          {title ? <Text style={[u.btnText, sm && { fontSize: 13 }, { color: v.fg }]}>{title}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, color = colors.muted, hoverBg = colors.borderSoft, disabled, size = 18, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ hovered, pressed }) => [
        u.iconBtn,
        { backgroundColor: hovered || pressed ? hoverBg : 'transparent', opacity: disabled ? 0.35 : 1 },
        style,
      ]}
    >
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
}

export function Field({ label, icon, error, hint, right, style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      {label ? <Text style={u.label}>{label}</Text> : null}
      <View
        style={[
          u.inputWrap,
          focused && { borderColor: colors.primary, boxShadow: '0px 0px 0px 3px rgba(79, 70, 229, 0.15)' },
          error && { borderColor: colors.danger },
        ]}
      >
        {icon ? <Icon name={icon} size={17} color={focused ? colors.primary : colors.faint} style={{ marginLeft: 12 }} /> : null}
        <TextInput
          style={u.input}
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {right}
      </View>
      {error ? (
        <View style={u.errRow}>
          <Icon name="alert-circle" size={13} color={colors.danger} />
          <Text style={u.error}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={u.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const AVATAR_COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#db2777', '#7c3aed', '#2563eb', '#dc2626'];

export function Avatar({ hinhanh, uri, name = '', size = 44, ring }) {
  const [failed, setFailed] = useState(false);
  const src = uri || imageUrl(hinhanh);
  useEffect(() => setFailed(false), [src]);
  const initials = name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase();
  const bg = AVATAR_COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  const base = { width: size, height: size, borderRadius: size / 2 };
  const ringStyle = ring ? { borderWidth: Math.max(3, size / 30), borderColor: colors.card } : null;
  if (src && !failed)
    return <Image source={{ uri: src }} onError={() => setFailed(true)} style={[base, { backgroundColor: colors.border }, ringStyle]} />;
  return (
    <View style={[base, { backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, ringStyle]}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size / 2.7 }}>{initials || '?'}</Text>
    </View>
  );
}

export function Card({ children, style, padded = true }) {
  return <View style={[u.card, padded && { padding: 20 }, style]}>{children}</View>;
}

export function Badge({ text, tone = 'primary', icon }) {
  const t = {
    primary: [colors.primarySoft, colors.primary],
    success: [colors.successSoft, colors.success],
    danger: [colors.dangerSoft, colors.danger],
    neutral: [colors.borderSoft, colors.muted],
  }[tone];
  return (
    <View style={[u.badge, { backgroundColor: t[0] }]}>
      {icon ? <Icon name={icon} size={11} color={t[1]} style={{ marginRight: 4 }} /> : null}
      <Text style={[u.badgeText, { color: t[1] }]}>{text}</Text>
    </View>
  );
}

export function SectionTitle({ title, subtitle, right }) {
  return (
    <View style={u.sectionRow}>
      <View style={{ flex: 1 }}>
        <Text style={u.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={u.sectionSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/* ================================ App shell ================================ */
// Context chứa người dùng đang đăng nhập + điều hướng, để Sidebar dùng
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

function Sidebar() {
  const { currentUser, screen, go, logout } = useApp();
  const { mode, toggle } = useTheme();
  const admin = currentUser.isAdmin;
  const items = [
    ...(admin
      ? [
          { key: 'dashboard', icon: 'bar-chart-2', label: 'Tổng quan', onPress: () => go({ name: 'dashboard' }) },
          { key: 'list', icon: 'users', label: 'Người dùng', onPress: () => go({ name: 'list' }) },
          { key: 'form', icon: 'user-plus', label: 'Thêm người dùng', onPress: () => go({ name: 'form', user: null }) },
        ]
      : []),
    { key: 'me', icon: 'user', label: 'Hồ sơ của tôi', onPress: () => go({ name: 'me' }) },
  ];
  const active =
    screen.name === 'me' || screen.name === 'meEdit'
      ? 'me'
      : screen.name === 'dashboard'
      ? 'dashboard'
      : screen.name === 'form' && !screen.user
      ? 'form'
      : 'list';
  return (
    <View style={u.sidebar}>
      <View style={u.brand}>
        <View style={u.logo}>
          <Icon name="shield" size={18} color="#fff" />
        </View>
        <View>
          <Text style={u.brandName}>UserAdmin</Text>
          <Text style={u.brandSub}>{admin ? 'Bảng quản trị' : 'Tài khoản cá nhân'}</Text>
        </View>
      </View>

      <Text style={u.navGroup}>{admin ? 'QUẢN LÝ' : 'TÀI KHOẢN'}</Text>
      {items.map((it) => {
        const on = active === it.key;
        return (
          <Pressable
            key={it.key}
            onPress={it.onPress}
            style={({ hovered }) => [u.navItem, (on || hovered) && { backgroundColor: on ? colors.primary : colors.sidebarSoft }]}
          >
            <Icon name={it.icon} size={17} color={on ? '#fff' : '#9ca3af'} />
            <Text style={[u.navText, on && { color: '#fff' }]}>{it.label}</Text>
          </Pressable>
        );
      })}

      <View style={{ flex: 1 }} />
      <Pressable onPress={toggle} style={({ hovered }) => [u.navItem, hovered && { backgroundColor: colors.sidebarSoft }]}>
        <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={17} color="#9ca3af" />
        <Text style={u.navText}>{mode === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}</Text>
      </Pressable>
      <View style={[u.profile, { marginTop: 8 }]}>
        <Avatar hinhanh={currentUser.hinhanh} name={currentUser.hoten} size={38} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={u.profileName} numberOfLines={1}>{currentUser.hoten}</Text>
          <Text style={u.profileMail} numberOfLines={1}>{admin ? 'Quản trị viên' : 'Người dùng'} · {currentUser.email}</Text>
        </View>
        <IconButton icon="log-out" color="#9ca3af" hoverBg={colors.sidebarSoft} onPress={logout} />
      </View>
    </View>
  );
}

// Page: khung trang chung. Desktop = sidebar + nội dung; Mobile = thanh tiêu đề trên cùng
export function Page({ title, subtitle, onBack, actions, mobileActions, children, refreshControl }) {
  const wide = useIsWide();
  const { logout } = useApp();

  const header = wide ? (
    <View style={u.pageHead}>
      {onBack ? <IconButton icon="arrow-left" onPress={onBack} color={colors.textSoft} style={{ marginRight: 10 }} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={u.pageTitle}>{title}</Text>
        {subtitle ? <Text style={u.pageSub}>{subtitle}</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>{actions}</View>
    </View>
  ) : (
    <View style={u.mHead}>
      {onBack ? (
        <IconButton icon="chevron-left" size={24} onPress={onBack} color={colors.text} style={{ marginLeft: -8 }} />
      ) : (
        <View style={[u.logo, { width: 32, height: 32, marginRight: 10 }]}>
          <Icon name="shield" size={16} color="#fff" />
        </View>
      )}
      <Text style={u.mTitle} numberOfLines={1}>{title}</Text>
      {/* mobileActions = null (màn form/chi tiết): ẩn nút đổi giao diện để không mất dữ liệu đang nhập */}
      {mobileActions !== null ? <ThemeToggle /> : null}
      {mobileActions !== undefined ? mobileActions : <IconButton icon="log-out" onPress={logout} color={colors.muted} />}
    </View>
  );

  const content = (
    <ScrollView
      contentContainerStyle={[u.pageBody, !wide && u.pageBodyM]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      refreshControl={refreshControl}
    >
      {wide ? header : null}
      {children}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
      {wide ? <Sidebar /> : null}
      <View style={{ flex: 1 }}>
        {!wide ? header : null}
        {content}
      </View>
    </View>
  );
}

/* ================================== Styles ================================== */
const u = themed(() => StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
  },
  btnSm: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8 },
  btnText: { fontWeight: '600', fontSize: 14.5 },
  iconBtn: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  label: { fontSize: 13.5, fontWeight: '600', color: colors.textSoft, marginBottom: 7 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.card,
    minHeight: 46,
  },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: colors.text, outlineStyle: 'none' },
  errRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  error: { color: colors.danger, fontSize: 12.5, marginLeft: 5 },
  hint: { color: colors.faint, fontSize: 12.5, marginTop: 6 },

  card: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, ...shadow.sm },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11.5, fontWeight: '600' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  sectionSub: { fontSize: 13, color: colors.muted, marginTop: 2 },

  toastWrap: { position: 'absolute', top: isWeb ? 20 : STATUS_H + 64, right: isWeb ? 20 : 12, left: isWeb ? undefined : 12, zIndex: 1000, alignItems: isWeb ? 'flex-end' : 'stretch' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    paddingRight: 18,
    marginBottom: 10,
    minWidth: 280,
    maxWidth: 380,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.md,
  },
  toastIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  toastTitle: { fontWeight: '700', color: colors.text, fontSize: 14 },
  toastMsg: { color: colors.muted, fontSize: 13, marginTop: 2 },

  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { backgroundColor: colors.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, ...shadow.lg },
  dialogIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  dialogTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  dialogMsg: { fontSize: 14.5, color: colors.muted, marginTop: 6, lineHeight: 21 },
  dialogBtns: { flexDirection: 'row', marginTop: 22 },

  sidebar: { width: 250, backgroundColor: colors.sidebar, paddingVertical: 20, paddingHorizontal: 14 },
  brand: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginBottom: 28 },
  logo: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  brandName: { color: '#fff', fontSize: 17, fontWeight: '800' },
  brandSub: { color: '#9ca3af', fontSize: 12 },
  navGroup: { color: '#6b7280', fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 10, marginBottom: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 9, marginBottom: 4 },
  navText: { color: '#d1d5db', marginLeft: 12, fontSize: 14.5, fontWeight: '500' },
  profile: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: colors.sidebarSoft },
  profileName: { color: '#fff', fontWeight: '600', fontSize: 13.5 },
  profileMail: { color: '#9ca3af', fontSize: 12 },

  pageHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  pageSub: { fontSize: 14, color: colors.muted, marginTop: 3 },
  pageBody: { padding: 32, width: '100%', maxWidth: 1180, alignSelf: 'center' },
  pageBodyM: { padding: 16 },

  mHead: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingTop: isWeb ? 12 : STATUS_H + 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text },
}));

// Nền gradient chỉ áp dụng trên web; Android/iOS dùng màu nền đơn
export const gradient = isWeb ? { backgroundImage: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' } : {};

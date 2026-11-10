import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, imageUrl } from '../api';
import { Avatar, Badge, Button, Card, Icon, Page, SectionTitle, colors, confirmAsync, gradient, themed, toast, useApp, useIsWide } from '../ui';

function InfoRow({ icon, label, children, last }) {
  return (
    <View style={[s.row, last && { borderBottomWidth: 0 }]}>
      <View style={s.rowIcon}>
        <Icon name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.label}>{label}</Text>
        {children}
      </View>
    </View>
  );
}

// self = true: trang "Hồ sơ của tôi" (mọi người dùng), không có nút xóa, gọi API /api/auth/me
export default function UserDetailScreen({ user: initial, self, onBack, onEdit, onDeleted }) {
  const wide = useIsWide();
  const { currentUser } = useApp();
  const [user, setUser] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    (self ? api.getMe() : api.getUser(initial._id))
      .then(setUser)
      .catch((e) => toast.error('Không tải được dữ liệu', e.message))
      .finally(() => setLoading(false));
  }, [initial._id, self]);

  const remove = async () => {
    const ok = await confirmAsync({
      title: 'Xóa người dùng?',
      message: `Tài khoản "${user.hoten}" (${user.email}) sẽ bị xóa vĩnh viễn và không thể khôi phục.`,
    });
    if (!ok) return;
    try {
      await api.deleteUser(user._id);
      toast.success('Đã xóa người dùng', user.email);
      onDeleted();
    } catch (e) {
      toast.error('Không thể xóa', e.message);
    }
  };

  const isMe = user._id === currentUser._id;
  const img = user.hinhanh;
  const imgDesc = !img
    ? 'Chưa có ảnh đại diện'
    : img.startsWith('data:')
    ? `Ảnh base64 lưu trong MongoDB · ~${Math.round((img.length * 3) / 4 / 1024)} KB`
    : imageUrl(img);

  return (
    <Page
      title={self ? 'Hồ sơ của tôi' : 'Chi tiết người dùng'}
      subtitle={self ? 'Thông tin tài khoản của bạn' : 'Thông tin tài khoản được lưu trong cơ sở dữ liệu'}
      onBack={onBack}
      actions={
        <>
          {!self ? (
            <Button title="Xóa" icon="trash-2" variant="dangerSoft" onPress={remove} disabled={isMe} style={{ marginRight: 10 }} />
          ) : null}
          <Button title={self ? 'Chỉnh sửa hồ sơ' : 'Chỉnh sửa'} icon="edit-2" onPress={() => onEdit(user)} />
        </>
      }
      mobileActions={onBack ? null : undefined}
    >
      <View style={wide ? { flexDirection: 'row', alignItems: 'flex-start' } : null}>
        {/* Thẻ hồ sơ */}
        <Card padded={false} style={[{ overflow: 'hidden' }, wide ? { width: 320, marginRight: 20 } : { marginBottom: 16 }]}>
          <View style={s.cover} />
          <View style={s.profile}>
            <View style={{ marginTop: -60 }}>
              <Avatar hinhanh={user.hinhanh} name={user.hoten} size={116} ring />
            </View>
            <Text style={s.name}>{user.hoten}</Text>
            <Text style={s.email}>{user.email}</Text>
            <View style={{ flexDirection: 'row', marginTop: 12, gap: 6 }}>
              {isMe ? <Badge text="Đang đăng nhập" icon="user-check" /> : null}
              {self ? (
                <Badge text={currentUser.isAdmin ? 'Quản trị viên' : 'Người dùng'} tone="neutral" icon={currentUser.isAdmin ? 'shield' : 'user'} />
              ) : (
                <Badge text="Hoạt động" tone="success" icon="check" />
              )}
            </View>
          </View>
          {!wide ? (
            <View style={s.mActions}>
              <Button
                title={self ? 'Chỉnh sửa hồ sơ' : 'Chỉnh sửa'}
                icon="edit-2"
                onPress={() => onEdit(user)}
                style={{ flex: 1, marginRight: self ? 0 : 10 }}
              />
              {!self ? (
                <Button title="Xóa" icon="trash-2" variant="dangerSoft" onPress={remove} disabled={isMe} style={{ flex: 1 }} />
              ) : null}
            </View>
          ) : null}
        </Card>

        {/* Thông tin chi tiết */}
        <Card style={{ flex: wide ? 1 : undefined }}>
          <SectionTitle
            title="Thông tin tài khoản"
            subtitle="Dữ liệu trong collection users"
            right={loading ? <ActivityIndicator color={colors.primary} /> : null}
          />
          <InfoRow icon="user" label="HỌ TÊN (hoten)">
            <Text style={s.value}>{user.hoten}</Text>
          </InfoRow>
          <InfoRow icon="mail" label="EMAIL (email)">
            <Text style={s.value} selectable>{user.email}</Text>
          </InfoRow>
          <InfoRow icon="lock" label="MẬT KHẨU (matkhau)">
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <Text style={[s.value, showPass && s.mono]} selectable numberOfLines={showPass ? 3 : 1}>
                {showPass ? user.matkhau : '••••••••••'}
              </Text>
              {!showPass ? <View style={{ marginLeft: 8 }}><Badge text="Mã hóa bcrypt" tone="success" icon="shield" /></View> : null}
            </View>
            <Pressable onPress={() => setShowPass(!showPass)} style={s.link}>
              <Icon name={showPass ? 'eye-off' : 'eye'} size={13} color={colors.primary} />
              <Text style={s.linkText}>{showPass ? 'Ẩn chuỗi mã hóa' : 'Xem chuỗi đã mã hóa'}</Text>
            </Pressable>
          </InfoRow>
          <InfoRow icon="image" label="HÌNH ẢNH (hinhanh)">
            <Text style={[s.value, { fontSize: 14 }]} selectable numberOfLines={2}>{imgDesc}</Text>
          </InfoRow>
          <InfoRow icon="hash" label="MÃ ĐỊNH DANH (_id)" last>
            <Text style={[s.value, s.mono]} selectable>{user._id}</Text>
          </InfoRow>
        </Card>
      </View>
    </Page>
  );
}

const s = themed(() => StyleSheet.create({
  cover: { height: 96, backgroundColor: colors.primary, ...gradient },
  profile: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 24 },
  name: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 12, textAlign: 'center' },
  email: { fontSize: 14, color: colors.muted, marginTop: 3 },
  mActions: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  row: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  rowIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  label: { fontSize: 11.5, fontWeight: '700', color: colors.faint, letterSpacing: 0.5, marginBottom: 4 },
  value: { fontSize: 15, color: colors.text, fontWeight: '500' },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 13 },
  link: { flexDirection: 'row', alignItems: 'center', marginTop: 6, alignSelf: 'flex-start' },
  linkText: { color: colors.primary, fontSize: 13, marginLeft: 5, fontWeight: '500' },
}));

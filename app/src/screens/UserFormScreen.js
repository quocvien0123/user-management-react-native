import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { api } from '../api';
import { Avatar, Button, Card, Field, Icon, IconButton, Page, SectionTitle, colors, themed, toast, useIsWide } from '../ui';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function strength(p) {
  if (!p) return null;
  let score = 0;
  if (p.length >= 6) score++;
  if (p.length >= 10) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (p.length < 6) return { level: 1, label: 'Quá ngắn', color: colors.danger };
  if (score <= 2) return { level: 2, label: 'Yếu', color: colors.warning };
  if (score <= 3) return { level: 3, label: 'Trung bình', color: '#ca8a04' };
  return { level: 4, label: 'Mạnh', color: colors.success };
}

// self = true: người dùng tự sửa hồ sơ (không đổi email, đổi mật khẩu phải nhập mật khẩu hiện tại)
export default function UserFormScreen({ user, self, onDone, onCancel }) {
  const wide = useIsWide();
  const isEdit = !!user;
  const [email, setEmail] = useState(user?.email || '');
  const [hoten, setHoten] = useState(user?.hoten || '');
  const [matkhaucu, setMatkhaucu] = useState('');
  const [matkhau, setMatkhau] = useState('');
  const [nhaplai, setNhaplai] = useState(''); // chỉ để kiểm tra trên giao diện, không lưu DB
  const [show, setShow] = useState(false);
  const [image, setImage] = useState(null); // { uri, dataUri, kb }
  const [removeImage, setRemoveImage] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);

  const pickImage = async (fromCamera) => {
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return toast.error('Chưa cấp quyền', 'Vui lòng cho phép truy cập ảnh/camera.');

      const options = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 };
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets?.length) return;

      setPicking(true);
      // Thu nhỏ ảnh về 400px, nén JPEG rồi lấy base64 để lưu thẳng vào trường hinhanh trên MongoDB Atlas
      const small = await manipulateAsync(result.assets[0].uri, [{ resize: { width: 400 } }], {
        compress: 0.7,
        format: SaveFormat.JPEG,
        base64: true,
      });
      setImage({
        uri: small.uri,
        dataUri: `data:image/jpeg;base64,${small.base64}`,
        kb: Math.round((small.base64.length * 3) / 4 / 1024),
      });
      setRemoveImage(false);
    } catch (e) {
      toast.error('Lỗi chọn ảnh', e.message);
    } finally {
      setPicking(false);
    }
  };

  const validate = () => {
    const e = {};
    if (!EMAIL_RE.test(email.trim())) e.email = 'Email không hợp lệ';
    if (!hoten.trim()) e.hoten = 'Vui lòng nhập họ tên';
    if (self && matkhau && !matkhaucu) e.matkhaucu = 'Nhập mật khẩu hiện tại để đổi mật khẩu';
    if (!isEdit || matkhau) {
      if (matkhau.length < 6) e.matkhau = 'Mật khẩu tối thiểu 6 ký tự';
      else if (matkhau !== nhaplai) e.nhaplai = 'Mật khẩu nhập lại không khớp';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return toast.error('Vui lòng kiểm tra lại thông tin');
    setSaving(true);
    try {
      const fields = { email: email.trim(), hoten: hoten.trim(), matkhau };
      const hinhanh = image ? image.dataUri : removeImage ? '' : isEdit ? undefined : '';
      const saved = self
        ? await api.updateMe({ hoten: fields.hoten, hinhanh, ...(matkhau ? { matkhau, matkhaucu } : {}) })
        : isEdit
        ? await api.updateUser(user._id, fields, hinhanh)
        : await api.createUser(fields, hinhanh);
      toast.success(isEdit ? 'Đã lưu thay đổi' : 'Đã thêm người dùng', saved.email);
      onDone(saved);
    } catch (e) {
      toast.error(isEdit ? 'Cập nhật thất bại' : 'Thêm thất bại', e.message);
    } finally {
      setSaving(false);
    }
  };

  const pw = strength(matkhau);
  const hasImage = image || (!removeImage && user?.hinhanh);
  const eye = <IconButton icon={show ? 'eye-off' : 'eye'} onPress={() => setShow(!show)} style={{ marginRight: 4 }} />;

  const avatarCard = (
    <Card style={wide ? { width: 300, marginRight: 20 } : { marginBottom: 16 }}>
      <SectionTitle title="Ảnh đại diện" subtitle="Ảnh vuông, tự động thu nhỏ 400px" />
      <View style={{ alignItems: 'center' }}>
        <View>
          <Avatar uri={image?.uri} hinhanh={image || removeImage ? null : user?.hinhanh} name={hoten || 'Người dùng'} size={140} />
          {picking ? (
            <View style={s.picking}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Đang xử lý…</Text>
            </View>
          ) : null}
        </View>
        {image ? <Text style={s.imgInfo}>JPEG · ~{image.kb} KB · base64</Text> : null}

        <View style={{ width: '100%', marginTop: 18 }}>
          <Button title="Chọn ảnh từ thư viện" icon="image" variant="secondary" onPress={() => pickImage(false)} />
          {Platform.OS !== 'web' ? (
            <Button title="Chụp ảnh" icon="camera" variant="secondary" onPress={() => pickImage(true)} style={{ marginTop: 10 }} />
          ) : null}
          {hasImage ? (
            <Button
              title="Gỡ ảnh"
              icon="x"
              variant="ghost"
              onPress={() => {
                setImage(null);
                setRemoveImage(true);
              }}
              style={{ marginTop: 6 }}
            />
          ) : null}
        </View>
      </View>
    </Card>
  );

  return (
    <Page
      title={self ? 'Chỉnh sửa hồ sơ' : isEdit ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
      subtitle={self ? 'Cập nhật họ tên, ảnh đại diện và mật khẩu của bạn' : isEdit ? `Cập nhật thông tin cho ${user.email}` : 'Điền thông tin để tạo tài khoản mới'}
      onBack={onCancel}
      mobileActions={null}
    >
      <View style={wide ? { flexDirection: 'row', alignItems: 'flex-start' } : null}>
        {avatarCard}

        <Card style={{ flex: wide ? 1 : undefined }}>
          <SectionTitle title="Thông tin tài khoản" subtitle="Các trường có dấu * là bắt buộc" />
          <View style={wide ? { flexDirection: 'row', gap: 16 } : null}>
            <Field
              style={wide ? { flex: 1 } : null}
              label="Họ tên *"
              icon="user"
              placeholder="Nguyễn Văn A"
              autoCapitalize="words"
              value={hoten}
              onChangeText={setHoten}
              error={errors.hoten}
            />
            <Field
              style={wide ? { flex: 1 } : null}
              label="Email *"
              icon="mail"
              placeholder="nguyenvana@gmail.com"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              editable={!self}
              hint={self ? 'Chỉ quản trị viên mới đổi được email' : undefined}
            />
          </View>

          <View style={s.divider} />
          <SectionTitle
            title={isEdit ? 'Đổi mật khẩu' : 'Mật khẩu'}
            subtitle={isEdit ? 'Để trống nếu không muốn đổi mật khẩu' : 'Mật khẩu được mã hóa bcrypt trước khi lưu'}
          />
          {self ? (
            <Field
              label="Mật khẩu hiện tại"
              icon="key"
              placeholder="Bắt buộc nếu muốn đổi mật khẩu"
              secureTextEntry={!show}
              value={matkhaucu}
              onChangeText={setMatkhaucu}
              error={errors.matkhaucu}
              style={wide ? { maxWidth: '50%', paddingRight: 8 } : null}
            />
          ) : null}
          <View style={wide ? { flexDirection: 'row', gap: 16 } : null}>
            <View style={wide ? { flex: 1 } : null}>
              <Field
                label={isEdit ? 'Mật khẩu mới' : 'Mật khẩu *'}
                icon="lock"
                placeholder="Tối thiểu 6 ký tự"
                secureTextEntry={!show}
                value={matkhau}
                onChangeText={setMatkhau}
                error={errors.matkhau}
                right={eye}
                style={pw ? { marginBottom: 8 } : null}
              />
              {pw ? (
                <View style={s.meterRow}>
                  {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={[s.meterBar, { backgroundColor: i <= pw.level ? pw.color : colors.border }]} />
                  ))}
                  <Text style={[s.meterText, { color: pw.color }]}>{pw.label}</Text>
                </View>
              ) : null}
            </View>
            <Field
              style={wide ? { flex: 1 } : null}
              label={isEdit ? 'Nhập lại mật khẩu mới' : 'Nhập lại mật khẩu *'}
              icon="check-circle"
              placeholder="Nhập lại mật khẩu"
              secureTextEntry={!show}
              value={nhaplai}
              onChangeText={setNhaplai}
              error={errors.nhaplai}
              editable={!isEdit || !!matkhau}
            />
          </View>

          <View style={[s.footer, !wide && { flexDirection: 'column-reverse' }]}>
            <Button title="Hủy" variant="secondary" onPress={onCancel} style={wide ? { marginRight: 10 } : { marginTop: 10 }} />
            <Button title={isEdit ? 'Lưu thay đổi' : 'Tạo người dùng'} icon="check" onPress={save} loading={saving} disabled={picking} />
          </View>
        </Card>
      </View>

      <View style={s.note}>
        <Icon name="database" size={14} color={colors.muted} />
        <Text style={s.noteText}>Dữ liệu lưu vào MongoDB Atlas, collection users: email, matkhau, hoten, hinhanh</Text>
      </View>
    </Page>
  );
}

const s = themed(() => StyleSheet.create({
  picking: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 70, backgroundColor: 'rgba(15,23,42,0.5)', alignItems: 'center', justifyContent: 'center' },
  imgInfo: { marginTop: 10, fontSize: 12, color: colors.muted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8, marginBottom: 20 },
  meterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  meterBar: { flex: 1, height: 4, borderRadius: 2, marginRight: 4 },
  meterText: { fontSize: 12, fontWeight: '600', marginLeft: 6, width: 72 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 18, marginTop: 8 },
  note: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  noteText: { color: colors.muted, fontSize: 12.5, marginLeft: 6, textAlign: 'center' },
}));

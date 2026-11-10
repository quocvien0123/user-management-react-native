import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, Share, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { parseUsers, pickTextFile } from '../importFile';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Field,
  Icon,
  IconButton,
  Page,
  colors,
  confirmAsync,
  themed,
  toast,
  useApp,
  useIsWide,
} from '../ui';

const PAGE_SIZE = 8;
const SORTS = [
  { key: 'new', label: 'Mới nhất', sort: '', order: 'desc' },
  { key: 'az', label: 'Tên A → Z', sort: 'hoten', order: 'asc' },
  { key: 'za', label: 'Tên Z → A', sort: 'hoten', order: 'desc' },
];

function Stat({ icon, label, value, tint, bg, compact }) {
  return (
    <Card style={[s.stat, compact && { padding: 12 }]}>
      <View style={[s.statIcon, { backgroundColor: bg }, compact && s.statIconSm]}>
        <Icon name={icon} size={compact ? 17 : 20} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.statValue, compact && { fontSize: 19 }]}>{value}</Text>
        <Text style={s.statLabel} numberOfLines={1}>{label}</Text>
      </View>
    </Card>
  );
}

export default function UserListScreen({ onAdd, onEdit, onView }) {
  const wide = useIsWide();
  const { currentUser, logout, go } = useApp();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState(''); // giá trị đã debounce
  const [sortKey, setSortKey] = useState('new');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [totalAll, setTotalAll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null); // { file, created, failed, errors }

  // Debounce ô tìm kiếm 400ms
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    const st = SORTS.find((x) => x.key === sortKey);
    setError('');
    try {
      const res = await api.getUsers({ q: query, sort: st.sort, order: st.order, page, limit: PAGE_SIZE });
      setData(res);
      if (!query) setTotalAll(res.total);
    } catch (e) {
      setError(e.message);
      if (/đăng nhập/i.test(e.message)) logout();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query, sortKey, page]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const remove = async (u) => {
    const ok = await confirmAsync({
      title: 'Xóa người dùng?',
      message: `Tài khoản "${u.hoten}" (${u.email}) sẽ bị xóa vĩnh viễn và không thể khôi phục.`,
    });
    if (!ok) return;
    try {
      await api.deleteUser(u._id);
      toast.success('Đã xóa người dùng', u.email);
      if (data.items.length === 1 && page > 1) setPage(page - 1);
      else load();
    } catch (e) {
      toast.error('Không thể xóa', e.message);
    }
  };

  const exportJson = async () => {
    try {
      const users = await api.exportUsers();
      const text = JSON.stringify(users, null, 2);
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'users.json';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Đã xuất dữ liệu', `${users.length} người dùng → users.json`);
      } else {
        await Share.share({ message: text, title: 'users.json' });
      }
    } catch (e) {
      toast.error('Xuất dữ liệu thất bại', e.message);
    }
  };

  // Nhập hàng loạt từ file JSON (vd. users.json xuất từ app) hoặc CSV có tiêu đề email,matkhau,hoten,hinhanh
  const importFile = async () => {
    let picked;
    let users;
    try {
      picked = await pickTextFile();
      if (!picked) return;
      users = parseUsers(picked.name, picked.text);
    } catch (e) {
      return toast.error('Không đọc được file', e.message);
    }
    if (!users.length) return toast.error('File không có bản ghi nào', picked.name);

    const ok = await confirmAsync({
      title: 'Nhập người dùng?',
      message: `Tìm thấy ${users.length} bản ghi trong "${picked.name}". Bản ghi lỗi hoặc email đã tồn tại sẽ được bỏ qua.`,
      confirmText: 'Nhập',
      icon: 'upload',
      tone: 'primary',
    });
    if (!ok) return;

    setImporting(true);
    try {
      const res = await api.importUsers(users);
      setImportResult({ file: picked.name, ...res });
      if (res.created) toast.success(`Đã thêm ${res.created} người dùng`, res.failed ? `${res.failed} bản ghi bị bỏ qua` : picked.name);
      else toast.error('Không thêm được người dùng nào', `${res.failed} bản ghi lỗi`);
      if (page !== 1) setPage(1);
      else load();
    } catch (e) {
      toast.error('Nhập dữ liệu thất bại', e.message);
    } finally {
      setImporting(false);
    }
  };

  const from = data.total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, data.total);
  const isMe = (u) => u._id === currentUser._id;

  /* ---------- Hàng dạng bảng (desktop) ---------- */
  const TableRow = ({ u, last }) => (
    <Pressable onPress={() => onView(u)} style={({ hovered }) => [s.tr, last && { borderBottomWidth: 0 }, hovered && { backgroundColor: colors.rowHover }]}>
      <View style={[s.td, { flex: 2.4, flexDirection: 'row', alignItems: 'center' }]}>
        <Avatar hinhanh={u.hinhanh} name={u.hoten} size={40} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={s.name} numberOfLines={1}>{u.hoten}</Text>
            {isMe(u) ? <View style={{ marginLeft: 8 }}><Badge text="Bạn" /></View> : null}
          </View>
          <Text style={s.idText} numberOfLines={1}>ID: {u._id.slice(-8)}</Text>
        </View>
      </View>
      <View style={[s.td, { flex: 2.2 }]}>
        <Text style={s.cell} numberOfLines={1}>{u.email}</Text>
      </View>
      <View style={[s.td, { flex: 1.4, flexDirection: 'row', alignItems: 'center' }]}>
        <Text style={s.dots}>••••••••</Text>
        <Badge text="bcrypt" tone="success" icon="lock" />
      </View>
      <View style={[s.td, { width: 132, flexDirection: 'row', justifyContent: 'flex-end' }]}>
        <IconButton icon="eye" onPress={() => onView(u)} />
        <IconButton icon="edit-2" color={colors.primary} hoverBg={colors.primarySoft} onPress={() => onEdit(u)} />
        <IconButton icon="trash-2" color={colors.danger} hoverBg={colors.dangerSoft} disabled={isMe(u)} onPress={() => remove(u)} />
      </View>
    </Pressable>
  );

  /* ---------- Thẻ (mobile) ---------- */
  const MobileItem = ({ u }) => (
    <Pressable onPress={() => onView(u)} style={({ pressed }) => [s.mItem, pressed && { backgroundColor: colors.rowHover }]}>
      <Avatar hinhanh={u.hinhanh} name={u.hoten} size={50} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[s.name, { flexShrink: 1 }]} numberOfLines={1}>{u.hoten}</Text>
          {isMe(u) ? <View style={{ marginLeft: 6 }}><Badge text="Bạn" /></View> : null}
        </View>
        <Text style={s.mEmail} numberOfLines={1}>{u.email}</Text>
      </View>
      <IconButton icon="edit-2" color={colors.primary} onPress={() => onEdit(u)} />
      <IconButton icon="trash-2" color={colors.danger} disabled={isMe(u)} onPress={() => remove(u)} />
    </Pressable>
  );

  const empty = (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Icon name={query ? 'search' : 'users'} size={26} color={colors.primary} />
      </View>
      <Text style={s.emptyTitle}>{query ? 'Không tìm thấy kết quả' : 'Chưa có người dùng'}</Text>
      <Text style={s.emptySub}>
        {query ? `Không có người dùng nào khớp với "${query}".` : 'Bắt đầu bằng cách thêm người dùng đầu tiên.'}
      </Text>
      {!query ? <Button title="Thêm người dùng" icon="plus" onPress={onAdd} style={{ marginTop: 16 }} /> : null}
    </View>
  );

  return (
    <Page
      title="Người dùng"
      subtitle="Quản lý tất cả tài khoản trong hệ thống"
      actions={
        <>
          <Button title="Nhập file" icon="upload" variant="secondary" onPress={importFile} loading={importing} style={{ marginRight: 10 }} />
          <Button title="Xuất JSON" icon="download" variant="secondary" onPress={exportJson} style={{ marginRight: 10 }} />
          <Button title="Thêm người dùng" icon="plus" onPress={onAdd} />
        </>
      }
      mobileActions={
        <>
          <IconButton icon="bar-chart-2" onPress={() => go({ name: 'dashboard' })} />
          <IconButton icon="user" onPress={() => go({ name: 'me' })} />
          <IconButton icon="log-out" onPress={logout} />
        </>
      }
      refreshControl={
        !wide ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        ) : undefined
      }
    >
      {/* Thống kê */}
      <View style={[s.stats, !wide && { marginBottom: 12 }]}>
        <Stat compact={!wide} icon="users" label={wide ? "Tổng người dùng" : "Người dùng"} value={totalAll ?? '—'} tint={colors.primary} bg={colors.primarySoft} />
        <Stat compact={!wide} icon="filter" label={query ? 'Kết quả tìm kiếm' : 'Đang hiển thị'} value={query ? data.total : `${from}–${to}`} tint={colors.success} bg={colors.successSoft} />
        {wide ? <Stat icon="layers" label="Số trang" value={`${page}/${data.pages}`} tint={colors.warning} bg={colors.warningSoft} /> : null}
      </View>

      {!wide ? (
        <>
          <Button title="Thêm người dùng" icon="user-plus" onPress={onAdd} style={{ marginBottom: 10 }} />
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <Button title="Nhập file" icon="upload" variant="secondary" size="sm" onPress={importFile} loading={importing} style={{ flex: 1 }} />
            <Button title="Xuất JSON" icon="download" variant="secondary" size="sm" onPress={exportJson} style={{ flex: 1 }} />
          </View>
        </>
      ) : null}

      {/* Kết quả lần nhập file gần nhất */}
      {importResult ? (
        <Card style={s.importCard}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={[s.importIcon, { backgroundColor: importResult.created ? colors.successSoft : colors.dangerSoft }]}>
              <Icon name={importResult.created ? 'check-circle' : 'alert-circle'} size={18} color={importResult.created ? colors.success : colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.importTitle}>
                Nhập "{importResult.file}": thêm {importResult.created}, bỏ qua {importResult.failed}
              </Text>
              {importResult.errors.slice(0, 8).map((er) => (
                <Text key={er.row} style={s.importErr} numberOfLines={1}>
                  Bản ghi {er.row}{er.email ? ` (${er.email})` : ''}: {er.message}
                </Text>
              ))}
              {importResult.errors.length > 8 ? (
                <Text style={s.importErr}>… và {importResult.errors.length - 8} lỗi khác</Text>
              ) : null}
            </View>
            <IconButton icon="x" size={16} onPress={() => setImportResult(null)} />
          </View>
        </Card>
      ) : null}

      <Card padded={false} style={{ overflow: 'hidden' }}>
        {/* Thanh công cụ: tìm kiếm + sắp xếp */}
        <View style={[s.toolbar, !wide && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <Field
            icon="search"
            placeholder="Tìm theo họ tên hoặc email..."
            value={q}
            onChangeText={setQ}
            style={[{ marginBottom: 0 }, wide ? { flex: 1, maxWidth: 380 } : { marginBottom: 12 }]}
            right={q ? <IconButton icon="x" size={16} onPress={() => setQ('')} style={{ marginRight: 4 }} /> : null}
          />
          <View style={s.segment}>
            {SORTS.map((x) => {
              const on = sortKey === x.key;
              return (
                <Pressable
                  key={x.key}
                  onPress={() => {
                    setSortKey(x.key);
                    setPage(1);
                  }}
                  style={[s.segItem, on && s.segOn, !wide && { flex: 1 }]}
                >
                  <Text style={[s.segText, on && { color: colors.text, fontWeight: '600' }]}>{x.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error ? (
          <View style={s.errBox}>
            <Icon name="wifi-off" size={16} color={colors.danger} />
            <Text style={s.errText}>{error}</Text>
            <Button title="Thử lại" size="sm" variant="secondary" onPress={load} />
          </View>
        ) : null}

        {wide ? (
          <View style={s.thead}>
            <Text style={[s.th, { flex: 2.4 }]}>NGƯỜI DÙNG</Text>
            <Text style={[s.th, { flex: 2.2 }]}>EMAIL</Text>
            <Text style={[s.th, { flex: 1.4 }]}>MẬT KHẨU</Text>
            <Text style={[s.th, { width: 132, textAlign: 'right' }]}>THAO TÁC</Text>
          </View>
        ) : null}

        {loading && !refreshing ? (
          <View style={{ padding: 48 }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : data.items.length === 0 ? (
          empty
        ) : (
          data.items.map((u, i) =>
            wide ? <TableRow key={u._id} u={u} last={i === data.items.length - 1} /> : <MobileItem key={u._id} u={u} />
          )
        )}

        {/* Phân trang */}
        {data.total > 0 ? (
          <View style={s.pager}>
            <Text style={s.pagerText}>
              Hiển thị <Text style={s.bold}>{from}–{to}</Text> trên <Text style={s.bold}>{data.total}</Text>
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Button size="sm" variant="secondary" icon="chevron-left" title={wide ? 'Trước' : ''} disabled={page <= 1} onPress={() => setPage(page - 1)} />
              <Text style={s.pageNum}>{page} / {data.pages}</Text>
              <Button size="sm" variant="secondary" icon="chevron-right" title={wide ? 'Sau' : ''} disabled={page >= data.pages} onPress={() => setPage(page + 1)} />
            </View>
          </View>
        ) : null}
      </Card>
    </Page>
  );
}

const s = themed(() => StyleSheet.create({
  stats: { flexDirection: "row", gap: 12, marginBottom: 20 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16 },
  statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  statIconSm: { width: 36, height: 36, borderRadius: 10, marginRight: 10 },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12.5, color: colors.muted, marginTop: 1 },

  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  segment: { flexDirection: 'row', backgroundColor: colors.borderSoft, borderRadius: 10, padding: 4 },
  segItem: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 7, alignItems: 'center' },
  segOn: { backgroundColor: colors.card, boxShadow: '0px 1px 3px rgba(15, 23, 42, 0.12)' },
  segText: { fontSize: 13, color: colors.muted },

  thead: { flexDirection: 'row', backgroundColor: colors.subtle, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 20, paddingVertical: 11 },
  th: { fontSize: 11.5, fontWeight: '700', color: colors.muted, letterSpacing: 0.6 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  td: { paddingRight: 12 },
  name: { fontSize: 14.5, fontWeight: '600', color: colors.text },
  idText: { fontSize: 12, color: colors.faint, marginTop: 2 },
  cell: { fontSize: 14, color: colors.textSoft },
  dots: { color: colors.muted, marginRight: 8, letterSpacing: 1 },

  mItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  mEmail: { fontSize: 13, color: colors.muted, marginTop: 2 },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: 14, color: colors.muted, marginTop: 4, textAlign: 'center' },

  errBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.dangerSoft, padding: 12, margin: 16, marginBottom: 0, borderRadius: 10 },
  errText: { flex: 1, color: colors.danger, marginHorizontal: 8, fontSize: 13.5 },

  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.subtle },
  pagerText: { color: colors.muted, fontSize: 13 },
  bold: { fontWeight: '700', color: colors.text },
  pageNum: { marginHorizontal: 12, color: colors.textSoft, fontSize: 13, fontWeight: '600' },

  importCard: { padding: 14, marginBottom: 16 },
  importIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  importTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 6, marginBottom: 4 },
  importErr: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
}));

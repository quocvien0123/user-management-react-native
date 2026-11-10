import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { Avatar, Button, Card, Icon, Page, SectionTitle, colors, themed, toast, useApp, useIsWide } from '../ui';

// Trang Tổng quan (chỉ admin). Mọi số liệu tính lúc chạy từ 4 trường có sẵn, không lưu thêm gì vào DB.

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const WEEKDAYS_FULL = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

// "2026-11-10" -> { short: 'T3', full: 'Thứ Ba', dm: '10/11' }
function dayLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { short: WEEKDAYS[wd], full: WEEKDAYS_FULL[wd], dm: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}` };
}

function timeAgo(date) {
  const sec = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return 'vừa xong';
  if (sec < 3600) return `${Math.floor(sec / 60)} phút trước`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} giờ trước`;
  if (sec < 30 * 86400) return `${Math.floor(sec / 86400)} ngày trước`;
  return new Date(date).toLocaleDateString('vi-VN');
}

function Stat({ icon, label, value, note, tint, bg, compact }) {
  return (
    <Card style={[s.stat, compact && s.statCompact]}>
      <View style={[s.statIcon, { backgroundColor: bg }, compact && s.statIconSm]}>
        <Icon name={icon} size={compact ? 17 : 20} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.statValue, compact && { fontSize: 19 }]}>{value}</Text>
        <Text style={s.statLabel} numberOfLines={1}>{label}</Text>
        {note ? <Text style={s.statNote} numberOfLines={1}>{note}</Text> : null}
      </View>
    </Card>
  );
}

/* Biểu đồ thanh ngang: số người dùng theo tên miền email (một chuỗi số liệu -> một màu, không cần chú thích) */
function DomainBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <View>
      {data.map((d) => (
        <View key={d.domain} style={s.hRow}>
          <Text style={s.hLabel} numberOfLines={1}>{d.domain}</Text>
          <View style={s.hTrack}>
            <View style={[s.hBar, { width: `${(d.count / max) * 100}%` }]} />
          </View>
          <Text style={s.hValue}>{d.count}</Text>
        </View>
      ))}
    </View>
  );
}

/* Biểu đồ cột: số người đăng ký mỗi ngày trong 7 ngày gần nhất */
const CHART_H = 150;
function DailyColumns({ data }) {
  const [active, setActive] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const cur = active !== null ? data[active] : null;
  const curLabel = cur ? dayLabel(cur.date) : null;

  return (
    <View>
      {/* Dòng chú thích: hiện chi tiết cột đang rê chuột / chạm vào */}
      <View style={s.caption}>
        {cur ? (
          <Text style={s.captionText}>
            {curLabel.full}, {curLabel.dm}: <Text style={s.captionStrong}>{cur.count} người đăng ký</Text>
          </Text>
        ) : (
          <Text style={s.captionText}>
            Tổng 7 ngày: <Text style={s.captionStrong}>{total} người</Text>
          </Text>
        )}
      </View>

      <View style={s.plot}>
        {data.map((d, i) => {
          const h = d.count ? Math.max(4, (d.count / max) * (CHART_H - 22)) : 0;
          const on = active === i;
          const lb = dayLabel(d.date);
          return (
            <Pressable
              key={d.date}
              style={s.slot}
              onHoverIn={() => setActive(i)}
              onHoverOut={() => setActive(null)}
              onPressIn={() => setActive(i)}
              onPressOut={() => setActive(null)}
            >
              <View style={[s.slotBg, on && { backgroundColor: colors.borderSoft }]}>
                {d.count ? <Text style={s.colValue}>{d.count}</Text> : null}
                <View style={[s.col, { height: h, opacity: active === null || on ? 1 : 0.55 }]} />
              </View>
              <Text style={[s.colLabel, on && { color: colors.text }]}>{lb.short}</Text>
              <Text style={s.colSub}>{lb.dm}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function DashboardScreen({ onBack, onView }) {
  const wide = useIsWide();
  const { logout } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await api.getStats());
    } catch (e) {
      setError(e.message);
      if (/đăng nhập/i.test(e.message)) logout();
      else toast.error('Không tải được thống kê', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pct = (n) => (data?.total ? `${Math.round((n / data.total) * 100)}% tổng số` : '');

  let body;
  if (loading) {
    body = (
      <View style={{ padding: 60 }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  } else if (!data) {
    body = (
      <Card style={s.errBox}>
        <Icon name="wifi-off" size={18} color={colors.danger} />
        <Text style={s.errText}>{error || 'Không có dữ liệu'}</Text>
        <Button title="Thử lại" size="sm" variant="secondary" onPress={load} />
      </Card>
    );
  } else {
    body = (
      <>
        <View style={[s.stats, !wide && s.statsGrid]}>
          {[
            { icon: 'users', label: 'Tổng người dùng', value: data.total, tint: colors.primary, bg: colors.primarySoft },
            { icon: 'image', label: 'Có ảnh đại diện', value: data.withImage, note: pct(data.withImage), tint: colors.success, bg: colors.successSoft },
            { icon: 'user-x', label: 'Chưa có ảnh', value: data.withoutImage, note: pct(data.withoutImage), tint: colors.warning, bg: colors.warningSoft },
            { icon: 'trending-up', label: 'Mới trong 7 ngày', value: data.newLast7Days, tint: colors.primary, bg: colors.primarySoft },
          ].map((st) => (
            <View key={st.label} style={wide ? { flex: 1 } : s.gridCell}>
              <Stat {...st} compact={!wide} />
            </View>
          ))}
        </View>

        <View style={wide ? { flexDirection: 'row', gap: 20, alignItems: 'flex-start' } : null}>
          <Card style={[wide ? { flex: 1 } : { marginBottom: 16 }]}>
            <SectionTitle title="Người dùng theo tên miền email" subtitle="Tách từ trường email, tối đa 5 tên miền" />
            {data.domains.length ? <DomainBars data={data.domains} /> : <Text style={s.emptyText}>Chưa có dữ liệu</Text>}
          </Card>
          <Card style={[wide ? { flex: 1 } : { marginBottom: 16 }]}>
            <SectionTitle title="Đăng ký 7 ngày gần đây" subtitle="Ngày tạo lấy từ _id của MongoDB" />
            <DailyColumns data={data.daily} />
          </Card>
        </View>

        <Card padded={false} style={{ marginTop: wide ? 20 : 0, overflow: 'hidden' }}>
          <View style={{ padding: 20, paddingBottom: 4 }}>
            <SectionTitle title="Người dùng mới nhất" subtitle="5 tài khoản được tạo gần đây" />
          </View>
          {data.newest.map((u, i) => (
            <Pressable
              key={u._id}
              onPress={() => onView(u)}
              style={({ hovered, pressed }) => [
                s.newRow,
                i === data.newest.length - 1 && { borderBottomWidth: 0 },
                (hovered || pressed) && { backgroundColor: colors.rowHover },
              ]}
            >
              <Avatar hinhanh={u.hinhanh} name={u.hoten} size={40} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.newName} numberOfLines={1}>{u.hoten}</Text>
                <Text style={s.newEmail} numberOfLines={1}>{u.email}</Text>
              </View>
              <Text style={s.newTime}>{timeAgo(u.createdAt)}</Text>
              <Icon name="chevron-right" size={16} color={colors.faint} style={{ marginLeft: 8 }} />
            </Pressable>
          ))}
        </Card>
      </>
    );
  }

  return (
    <Page
      title="Tổng quan"
      subtitle="Thống kê nhanh từ collection users"
      onBack={wide ? undefined : onBack}
      actions={<Button title="Làm mới" icon="refresh-cw" variant="secondary" onPress={() => { setLoading(true); load(); }} />}
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
      {body}
    </Page>
  );
}

const s = themed(() => StyleSheet.create({
  stats: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statsGrid: { flexWrap: 'wrap', gap: 0, marginHorizontal: -6, marginBottom: 10 },
  gridCell: { width: '50%', paddingHorizontal: 6, marginBottom: 12 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16 }, // flex: 1 -> các thẻ cao bằng nhau
  statCompact: { padding: 12 },
  statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  statIconSm: { width: 36, height: 36, borderRadius: 10, marginRight: 10 },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12.5, color: colors.muted, marginTop: 1 },
  statNote: { fontSize: 11.5, color: colors.faint, marginTop: 1 },

  hRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  hLabel: { width: 110, fontSize: 13, color: colors.textSoft, marginRight: 10 },
  hTrack: { flex: 1, height: 12, justifyContent: 'center' },
  hBar: { height: 12, backgroundColor: colors.primary, borderTopRightRadius: 4, borderBottomRightRadius: 4, minWidth: 4 },
  hValue: { width: 36, textAlign: 'right', fontSize: 13, fontWeight: '700', color: colors.text },

  caption: { minHeight: 22, marginBottom: 8 },
  captionText: { fontSize: 13, color: colors.muted },
  captionStrong: { fontWeight: '700', color: colors.text },
  plot: { flexDirection: 'row', alignItems: 'flex-end' },
  slot: { flex: 1, alignItems: 'center' },
  slotBg: {
    width: '100%',
    height: CHART_H,
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  col: { width: '50%', maxWidth: 28, backgroundColor: colors.primary, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  colValue: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 4 },
  colLabel: { fontSize: 12, fontWeight: '600', color: colors.muted, marginTop: 8 },
  colSub: { fontSize: 10.5, color: colors.faint, marginTop: 1 },

  newRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  newName: { fontSize: 14.5, fontWeight: '600', color: colors.text },
  newEmail: { fontSize: 13, color: colors.muted, marginTop: 2 },
  newTime: { fontSize: 12.5, color: colors.faint },

  emptyText: { color: colors.muted, fontSize: 13.5 },
  errBox: { flexDirection: 'row', alignItems: 'center' },
  errText: { flex: 1, color: colors.danger, marginHorizontal: 10, fontSize: 13.5 },
}));

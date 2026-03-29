import React, { useMemo } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { getPostDisplayTime } from '../data/blogData';

const BASE_WIDTH = 375;

const getScale = (screenWidth, size) => {
  const ratio = screenWidth / BASE_WIDTH;
  const scaled = size * ratio;
  return Math.max(size * 0.85, Math.min(scaled, size * 1.25));
};

export default function ExploreScreen({
  currentUser,
  onOpenFeed = () => {},
  onOpenCreate = () => {},
  onOpenProfile = () => {},
}) {
  const { width } = useWindowDimensions();
  const postCount = currentUser?.posts?.length ?? 0;
  const latestPost = currentUser?.posts?.[0] ?? null;

  const s = useMemo(
    () => ({
      spacingXs: getScale(width, 8),
      spacingSm: getScale(width, 12),
      spacingMd: getScale(width, 16),
      spacingLg: getScale(width, 24),
      radiusLg: getScale(width, 20),
      titleSize: getScale(width, 28),
      bodySize: getScale(width, 15),
    }),
    [width]
  );

  const styles = useMemo(() => createStyles(s), [s]);

  const quickActions = [
    {
      key: 'feed',
      title: 'Bảng tin',
      description: 'Xem danh sách bài viết mới nhất.',
      onPress: onOpenFeed,
    },
    {
      key: 'create',
      title: 'Tạo bài viết',
      description: 'Mở biểu mẫu để đăng bài viết mới.',
      onPress: onOpenCreate,
    },
    {
      key: 'profile',
      title: 'Hồ sơ cá nhân',
      description: 'Xem thông tin tài khoản và nội dung đã đăng.',
      onPress: onOpenProfile,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F6" />

      <ScrollView
        bounces={false}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Bảng điều hướng</Text>
          <Text style={styles.heroTitle}>Quản lý blog cá nhân</Text>
          <Text style={styles.heroBody}>
            Trang này cung cấp các lối tắt để truy cập nhanh đến bảng tin, mục tạo bài viết và hồ sơ cá nhân.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{postCount}</Text>
            <Text style={styles.statLabel}>Bài viết đã lưu</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {currentUser?.role === 'admin' ? 'Quản trị' : 'Người dùng'}
            </Text>
            <Text style={styles.statLabel}>Loại tài khoản</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chức năng nhanh</Text>
          {quickActions.map((action) => (
            <Pressable key={action.key} style={styles.quickCard} onPress={action.onPress}>
              <Text style={styles.quickTitle}>{action.title}</Text>
              <Text style={styles.quickDescription}>{action.description}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bài viết gần nhất</Text>
          <View style={styles.latestCard}>
            {latestPost ? (
              <>
                <Text style={styles.latestTime}>{getPostDisplayTime(latestPost)}</Text>
                <Text style={styles.latestCaption}>{latestPost.caption}</Text>
              </>
            ) : (
              <Text style={styles.emptyText}>
                Hiện chưa có bài viết nào. Bạn có thể chuyển sang mục Tạo bài viết để thêm nội dung mới.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (s) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#F4F4F6',
    },
    scrollContainer: {
      padding: s.spacingMd,
      paddingBottom: s.spacingLg,
    },
    heroCard: {
      backgroundColor: '#111827',
      borderRadius: s.radiusLg,
      padding: s.spacingLg,
      marginBottom: s.spacingMd,
    },
    heroEyebrow: {
      fontSize: getScale(BASE_WIDTH, 13),
      color: '#C7D2FE',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    heroTitle: {
      marginTop: s.spacingSm,
      fontSize: s.titleSize,
      color: '#FFFFFF',
      fontWeight: '800',
    },
    heroBody: {
      marginTop: s.spacingSm,
      fontSize: s.bodySize,
      lineHeight: Math.round(s.bodySize * 1.45),
      color: '#E5E7EB',
      fontWeight: '500',
    },
    statsRow: {
      flexDirection: 'row',
      gap: s.spacingMd,
      marginBottom: s.spacingMd,
    },
    statCard: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: s.radiusLg,
      padding: s.spacingLg,
    },
    statValue: {
      fontSize: getScale(BASE_WIDTH, 24),
      color: '#111827',
      fontWeight: '800',
    },
    statLabel: {
      marginTop: s.spacingXs,
      fontSize: s.bodySize,
      color: '#4B5563',
      fontWeight: '600',
    },
    section: {
      marginBottom: s.spacingMd,
    },
    sectionTitle: {
      marginBottom: s.spacingSm,
      fontSize: getScale(BASE_WIDTH, 18),
      color: '#111827',
      fontWeight: '800',
    },
    quickCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: s.radiusLg,
      padding: s.spacingMd,
      marginBottom: s.spacingSm,
    },
    quickTitle: {
      fontSize: getScale(BASE_WIDTH, 17),
      color: '#111827',
      fontWeight: '800',
    },
    quickDescription: {
      marginTop: 4,
      fontSize: s.bodySize,
      lineHeight: Math.round(s.bodySize * 1.4),
      color: '#4B5563',
      fontWeight: '500',
    },
    latestCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: s.radiusLg,
      padding: s.spacingLg,
    },
    latestTime: {
      fontSize: getScale(BASE_WIDTH, 13),
      color: '#6B7280',
      fontWeight: '700',
      marginBottom: s.spacingXs,
    },
    latestCaption: {
      fontSize: s.bodySize,
      lineHeight: Math.round(s.bodySize * 1.45),
      color: '#111827',
      fontWeight: '600',
    },
    emptyText: {
      fontSize: s.bodySize,
      lineHeight: Math.round(s.bodySize * 1.45),
      color: '#4B5563',
      fontWeight: '500',
    },
  });

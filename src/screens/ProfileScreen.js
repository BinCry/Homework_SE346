import React, { useMemo } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { ADMIN_ACCOUNT } from '../data/blogData';

const BASE_WIDTH = 375;

const getScale = (screenWidth, size) => {
  const ratio = screenWidth / BASE_WIDTH;
  const scaled = size * ratio;
  return Math.max(size * 0.85, Math.min(scaled, size * 1.25));
};

export default function ProfileScreen({
  currentUser = ADMIN_ACCOUNT,
  onLogout = () => {},
  onBack = () => {},
}) {
  const { width } = useWindowDimensions();

  const profile = currentUser ?? ADMIN_ACCOUNT;

  const infoFields = useMemo(
    () => [
      { label: 'Email', value: profile.email || 'Chưa cập nhật' },
      { label: 'Số điện thoại', value: profile.phone || 'Chưa cập nhật' },
      { label: 'Ngày sinh', value: profile.birthday || 'Chưa cập nhật' },
      { label: 'Địa chỉ', value: profile.address || 'Chưa cập nhật' },
    ],
    [profile]
  );

  const s = useMemo(
    () => ({
      spacingSm: getScale(width, 12),
      spacingMd: getScale(width, 16),
      spacingLg: getScale(width, 24),
      radiusLg: getScale(width, 20),
      avatarSize: getScale(width, 104),
      titleSize: getScale(width, 28),
      bodySize: getScale(width, 15),
      buttonHeight: getScale(width, 48),
    }),
    [width]
  );

  const styles = useMemo(() => createStyles(s), [s]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F6" />

      <ScrollView
        bounces={false}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.topActions}>
            <Pressable style={styles.ghostButton} onPress={onBack}>
              <Text style={styles.ghostButtonText}>Quay lại</Text>
            </Pressable>

            <Pressable style={[styles.ghostButton, styles.logoutGhost]} onPress={onLogout}>
              <Text style={[styles.ghostButtonText, styles.logoutText]}>Đăng xuất</Text>
            </Pressable>
          </View>

          <Image source={{ uri: profile.avatar }} style={styles.avatar} />

          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.username}>{profile.username}</Text>
          <Text style={styles.bio}>{profile.bio}</Text>

          <View style={styles.infoList}>
            {infoFields.map((field) => (
              <View key={field.label} style={styles.infoItem}>
                <Text style={styles.infoLabel}>{field.label}</Text>
                <Text style={styles.infoValue}>{field.value}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.primaryButton} onPress={onBack}>
            <Text style={styles.primaryButtonText}>Quay lại blog</Text>
          </Pressable>
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
      flexGrow: 1,
      justifyContent: 'center',
      padding: s.spacingMd,
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: s.radiusLg,
      padding: s.spacingLg,
      shadowColor: '#111827',
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    topActions: {
      marginBottom: s.spacingMd,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    ghostButton: {
      minWidth: getScale(BASE_WIDTH, 82),
      height: getScale(BASE_WIDTH, 36),
      borderWidth: 1,
      borderColor: '#D1D5DB',
      borderRadius: getScale(BASE_WIDTH, 10),
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F9FAFB',
    },
    logoutGhost: {
      borderColor: '#FCA5A5',
      backgroundColor: '#FEF2F2',
    },
    ghostButtonText: {
      fontSize: getScale(BASE_WIDTH, 13),
      color: '#111827',
      fontWeight: '700',
    },
    logoutText: {
      color: '#B91C1C',
    },
    avatar: {
      width: s.avatarSize,
      height: s.avatarSize,
      borderRadius: s.avatarSize / 2,
      alignSelf: 'center',
      borderWidth: 3,
      borderColor: '#E5E7EB',
    },
    name: {
      marginTop: s.spacingMd,
      textAlign: 'center',
      fontSize: s.titleSize,
      fontWeight: '800',
      color: '#111827',
    },
    username: {
      marginTop: 2,
      textAlign: 'center',
      fontSize: getScale(BASE_WIDTH, 15),
      color: '#4B5563',
      fontWeight: '600',
    },
    bio: {
      marginTop: s.spacingSm,
      textAlign: 'center',
      fontSize: s.bodySize,
      lineHeight: Math.round(s.bodySize * 1.45),
      color: '#1F2937',
      fontWeight: '500',
    },
    infoList: {
      marginTop: s.spacingLg,
      gap: s.spacingSm,
    },
    infoItem: {
      backgroundColor: '#F3F4F6',
      borderRadius: getScale(BASE_WIDTH, 12),
      paddingVertical: s.spacingSm,
      paddingHorizontal: s.spacingMd,
    },
    infoLabel: {
      fontSize: getScale(BASE_WIDTH, 13),
      color: '#6B7280',
      fontWeight: '600',
    },
    infoValue: {
      marginTop: 3,
      fontSize: s.bodySize,
      color: '#111827',
      fontWeight: '700',
    },
    primaryButton: {
      marginTop: s.spacingLg,
      height: s.buttonHeight,
      borderRadius: getScale(BASE_WIDTH, 14),
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#111827',
    },
    primaryButtonText: {
      fontSize: getScale(BASE_WIDTH, 15),
      color: '#FFFFFF',
      fontWeight: '800',
    },
  });

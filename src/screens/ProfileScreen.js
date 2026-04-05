import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

const BASE_WIDTH = 375;

const getScale = (screenWidth, size) => {
  const ratio = screenWidth / BASE_WIDTH;
  const scaled = size * ratio;
  return Math.max(size * 0.85, Math.min(scaled, size * 1.25));
};

const cardShadowStyle =
  Platform.OS === 'web'
    ? {
        boxShadow: '0px 8px 16px rgba(17, 24, 39, 0.08)',
      }
    : {
        shadowColor: '#111827',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
      };

const createInitialForm = (profile) => ({
  name: profile?.name || '',
  bio: profile?.bio || '',
  phone: profile?.phone || '',
  birthday: profile?.birthday || '',
  address: profile?.address || '',
  avatar: profile?.avatar || '',
});

export default function ProfileScreen({
  currentUser,
  onLogout = () => {},
  onOpenFeed = () => {},
  onOpenCreate = () => {},
  onUpdateProfile = async () => {},
}) {
  const { width } = useWindowDimensions();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(() => createInitialForm(currentUser));

  const profile = currentUser;
  const postCount = profile?.posts?.length ?? 0;

  const infoFields = useMemo(
    () => [
      { label: 'Email', value: profile?.email || 'Chưa cập nhật' },
      { label: 'Số điện thoại', value: profile?.phone || 'Chưa cập nhật' },
      { label: 'Ngày sinh', value: profile?.birthday || 'Chưa cập nhật' },
      { label: 'Địa chỉ', value: profile?.address || 'Chưa cập nhật' },
      { label: 'Số bài viết', value: `${postCount} bài` },
    ],
    [postCount, profile]
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
      buttonHeight: getScale(width, 44),
    }),
    [width]
  );

  const styles = useMemo(() => createStyles(s), [s]);

  const handleStartEdit = () => {
    setForm(createInitialForm(profile));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setForm(createInitialForm(profile));
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!form.name.trim()) {
      Alert.alert('Thông báo', 'Tên hiển thị không được để trống.');
      return;
    }

    setIsSaving(true);

    try {
      await onUpdateProfile({
        name: form.name,
        bio: form.bio,
        phone: form.phone,
        birthday: form.birthday,
        address: form.address,
        avatar: form.avatar,
      });
      setIsEditing(false);
      Alert.alert('Thành công', 'Đã cập nhật thông tin cá nhân.');
    } catch (error) {
      Alert.alert('Có lỗi', 'Không thể cập nhật thông tin lúc này.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderReadMode = () => (
    <>
      <Text style={styles.name}>{profile?.name}</Text>
      <Text style={styles.username}>{profile?.username}</Text>
      <Text style={styles.bio}>{profile?.bio}</Text>

      <View style={styles.infoList}>
        {infoFields.map((field) => (
          <View key={field.label} style={styles.infoItem}>
            <Text style={styles.infoLabel}>{field.label}</Text>
            <Text style={styles.infoValue}>{field.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.rowActions}>
        <Pressable style={styles.primaryButton} onPress={onOpenFeed}>
          <Text style={styles.primaryButtonText}>Quay lại trang chủ</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={handleStartEdit}>
          <Text style={styles.secondaryButtonText}>Chỉnh sửa hồ sơ</Text>
        </Pressable>
      </View>
    </>
  );

  const renderEditMode = () => (
    <>
      <Text style={styles.editTitle}>Chỉnh sửa thông tin cá nhân</Text>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Tên hiển thị</Text>
        <TextInput
          value={form.name}
          onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
          style={styles.formInput}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Avatar URL</Text>
        <TextInput
          value={form.avatar}
          onChangeText={(value) => setForm((prev) => ({ ...prev, avatar: value }))}
          style={styles.formInput}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Bio</Text>
        <TextInput
          value={form.bio}
          onChangeText={(value) => setForm((prev) => ({ ...prev, bio: value }))}
          style={[styles.formInput, styles.textArea]}
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Số điện thoại</Text>
        <TextInput
          value={form.phone}
          onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
          style={styles.formInput}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Ngày sinh</Text>
        <TextInput
          value={form.birthday}
          onChangeText={(value) => setForm((prev) => ({ ...prev, birthday: value }))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94A3B8"
          style={styles.formInput}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Địa chỉ</Text>
        <TextInput
          value={form.address}
          onChangeText={(value) => setForm((prev) => ({ ...prev, address: value }))}
          style={styles.formInput}
        />
      </View>

      <View style={styles.rowActions}>
        <Pressable
          style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
          onPress={handleSaveProfile}
          disabled={isSaving}
        >
          <Text style={styles.primaryButtonText}>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={handleCancelEdit}
          disabled={isSaving}
        >
          <Text style={styles.secondaryButtonText}>Hủy</Text>
        </Pressable>
      </View>
    </>
  );

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
            <Pressable style={styles.ghostButton} onPress={onOpenFeed}>
              <Text style={styles.ghostButtonText}>Về feed</Text>
            </Pressable>

            <Pressable style={[styles.ghostButton, styles.secondaryGhost]} onPress={onOpenCreate}>
              <Text style={styles.ghostButtonText}>Tạo bài</Text>
            </Pressable>

            <Pressable style={[styles.ghostButton, styles.logoutGhost]} onPress={onLogout}>
              <Text style={[styles.ghostButtonText, styles.logoutText]}>Đăng xuất</Text>
            </Pressable>
          </View>

          <Image source={{ uri: form.avatar || profile?.avatar }} style={styles.avatar} />

          {isEditing ? renderEditMode() : renderReadMode()}
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
      ...cardShadowStyle,
    },
    topActions: {
      marginBottom: s.spacingMd,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: s.spacingSm,
    },
    ghostButton: {
      flex: 1,
      minWidth: getScale(BASE_WIDTH, 82),
      height: getScale(BASE_WIDTH, 36),
      borderWidth: 1,
      borderColor: '#D1D5DB',
      borderRadius: getScale(BASE_WIDTH, 10),
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F9FAFB',
    },
    secondaryGhost: {
      borderColor: '#BFDBFE',
      backgroundColor: '#EFF6FF',
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
      marginBottom: s.spacingMd,
    },
    name: {
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
    rowActions: {
      marginTop: s.spacingLg,
      gap: s.spacingSm,
    },
    primaryButton: {
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
    secondaryButton: {
      height: s.buttonHeight,
      borderRadius: getScale(BASE_WIDTH, 14),
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#CBD5E1',
      backgroundColor: '#F8FAFC',
    },
    secondaryButtonText: {
      fontSize: getScale(BASE_WIDTH, 15),
      color: '#0F172A',
      fontWeight: '700',
    },
    buttonDisabled: {
      opacity: 0.75,
    },
    editTitle: {
      fontSize: getScale(BASE_WIDTH, 20),
      fontWeight: '800',
      color: '#111827',
      marginBottom: s.spacingMd,
      textAlign: 'center',
    },
    formGroup: {
      marginBottom: s.spacingSm,
    },
    formLabel: {
      fontSize: getScale(BASE_WIDTH, 13),
      color: '#334155',
      fontWeight: '700',
      marginBottom: 6,
    },
    formInput: {
      minHeight: getScale(BASE_WIDTH, 42),
      borderWidth: 1,
      borderColor: '#CBD5E1',
      borderRadius: getScale(BASE_WIDTH, 12),
      backgroundColor: '#F8FAFC',
      paddingHorizontal: s.spacingSm,
      color: '#111827',
      fontSize: getScale(BASE_WIDTH, 14),
      paddingVertical: Platform.select({ ios: 10, android: 7, default: 10 }),
    },
    textArea: {
      minHeight: getScale(BASE_WIDTH, 90),
    },
  });

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
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
import { BLOG_IMAGES, getFallbackBlogImage } from '../data/blogData';

const BASE_WIDTH = 375;

const getScale = (screenWidth, size) => {
  const ratio = screenWidth / BASE_WIDTH;
  const scaled = size * ratio;
  return Math.max(size * 0.85, Math.min(scaled, size * 1.25));
};

const cardShadowStyle =
  Platform.OS === 'web'
    ? {
        boxShadow: '0px 8px 18px rgba(17, 24, 39, 0.08)',
      }
    : {
        shadowColor: '#111827',
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
      };

export default function CreatePostScreen({
  currentUser,
  onCreatePost = async () => {},
  onOpenFeed = () => {},
}) {
  const { width } = useWindowDimensions();
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const s = useMemo(
    () => ({
      spacingXs: getScale(width, 8),
      spacingSm: getScale(width, 12),
      spacingMd: getScale(width, 16),
      spacingLg: getScale(width, 24),
      spacingXl: getScale(width, 32),
      radiusMd: getScale(width, 14),
      radiusLg: getScale(width, 20),
      titleSize: getScale(width, 28),
      bodySize: getScale(width, 15),
      avatarSize: getScale(width, 56),
      inputHeight: getScale(width, 54),
      previewHeight: getScale(width, 210),
    }),
    [width]
  );

  const styles = useMemo(() => createStyles(s), [s]);

  const previewImage =
    imageUrl.trim() || getFallbackBlogImage(currentUser?.email || currentUser?.id || 'preview');

  const handleSubmit = async () => {
    const cleanCaption = caption.trim();
    const cleanImage = imageUrl.trim();

    if (!cleanCaption) {
      Alert.alert('Thiếu nội dung', 'Bạn hãy nhập nội dung bài viết trước khi đăng.');
      return;
    }

    setIsSubmitting(true);

    try {
      await onCreatePost({
        caption: cleanCaption,
        image: cleanImage,
      });

      setCaption('');
      setImageUrl('');
      onOpenFeed();
    } catch (error) {
      Alert.alert('Không thể đăng bài', 'Có lỗi khi lưu bài viết local. Bạn thử lại giúp mình nhé.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F6" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Image source={{ uri: currentUser?.avatar }} style={styles.avatar} />
              <View style={styles.headerCopy}>
                <Text style={styles.title}>Tạo bài viết mới</Text>
                <Text style={styles.subtitle}>
                  Đăng nhanh một cập nhật để feed của bạn sinh động hơn.
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Nội dung bài viết</Text>
              <TextInput
                value={caption}
                onChangeText={setCaption}
                multiline
                textAlignVertical="top"
                placeholder="Bạn đang nghĩ gì hôm nay?"
                placeholderTextColor="#7B8494"
                style={[styles.input, styles.textArea]}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Ảnh minh họa (tùy chọn)</Text>
              <TextInput
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://example.com/anh-cua-ban.jpg"
                placeholderTextColor="#7B8494"
                autoCapitalize="none"
                style={styles.input}
              />
            </View>

            <View style={styles.suggestionWrap}>
              <Text style={styles.suggestionTitle}>Chọn nhanh ảnh mẫu</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {BLOG_IMAGES.map((image, index) => (
                  <Pressable
                    key={image}
                    style={styles.suggestionItem}
                    onPress={() => setImageUrl(image)}
                  >
                    <Image source={{ uri: image }} style={styles.suggestionImage} />
                    <Text style={styles.suggestionText}>Mẫu {index + 1}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Xem trước</Text>

              <View style={styles.previewHeader}>
                <Image source={{ uri: currentUser?.avatar }} style={styles.previewAvatar} />
                <View>
                  <Text style={styles.previewName}>{currentUser?.name}</Text>
                  <Text style={styles.previewTime}>Vừa xong</Text>
                </View>
              </View>

              <Text style={styles.previewCaption}>
                {caption.trim() || 'Nội dung xem trước sẽ hiện ở đây sau khi bạn nhập.'}
              </Text>

              <Image source={{ uri: previewImage }} style={styles.previewImage} />
            </View>

            <Pressable
              style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
              disabled={isSubmitting}
              onPress={handleSubmit}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting ? 'Đang lưu...' : 'Đăng bài'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (s) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#F4F4F6',
    },
    flex: {
      flex: 1,
    },
    scrollContainer: {
      padding: s.spacingMd,
      paddingBottom: s.spacingXl,
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: s.radiusLg,
      padding: s.spacingLg,
      ...cardShadowStyle,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: s.spacingLg,
    },
    avatar: {
      width: s.avatarSize,
      height: s.avatarSize,
      borderRadius: s.avatarSize / 2,
      marginRight: s.spacingMd,
      borderWidth: 2,
      borderColor: '#E5E7EB',
    },
    headerCopy: {
      flex: 1,
    },
    title: {
      fontSize: s.titleSize,
      fontWeight: '800',
      color: '#111827',
    },
    subtitle: {
      marginTop: s.spacingXs,
      fontSize: s.bodySize,
      color: '#4B5563',
      lineHeight: Math.round(s.bodySize * 1.45),
      fontWeight: '500',
    },
    section: {
      marginBottom: s.spacingMd,
    },
    label: {
      marginBottom: s.spacingSm,
      fontSize: s.bodySize,
      color: '#111827',
      fontWeight: '700',
    },
    input: {
      minHeight: s.inputHeight,
      borderWidth: 1.5,
      borderColor: '#D1D5DB',
      borderRadius: s.radiusMd,
      backgroundColor: '#F9FAFB',
      paddingHorizontal: s.spacingMd,
      paddingVertical: s.spacingSm,
      fontSize: s.bodySize,
      color: '#111827',
    },
    textArea: {
      minHeight: getScale(BASE_WIDTH, 132),
    },
    suggestionWrap: {
      marginBottom: s.spacingLg,
    },
    suggestionTitle: {
      marginBottom: s.spacingSm,
      fontSize: s.bodySize,
      color: '#111827',
      fontWeight: '700',
    },
    suggestionItem: {
      width: getScale(BASE_WIDTH, 116),
      marginRight: s.spacingSm,
    },
    suggestionImage: {
      width: '100%',
      height: getScale(BASE_WIDTH, 84),
      borderRadius: s.radiusMd,
      marginBottom: s.spacingXs,
    },
    suggestionText: {
      fontSize: getScale(BASE_WIDTH, 13),
      color: '#4B5563',
      fontWeight: '600',
      textAlign: 'center',
    },
    previewCard: {
      backgroundColor: '#EEF2F7',
      borderRadius: s.radiusLg,
      padding: s.spacingMd,
      marginBottom: s.spacingLg,
    },
    previewTitle: {
      marginBottom: s.spacingSm,
      fontSize: s.bodySize,
      color: '#111827',
      fontWeight: '800',
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: s.spacingSm,
    },
    previewAvatar: {
      width: getScale(BASE_WIDTH, 42),
      height: getScale(BASE_WIDTH, 42),
      borderRadius: getScale(BASE_WIDTH, 21),
      marginRight: s.spacingSm,
    },
    previewName: {
      fontSize: getScale(BASE_WIDTH, 17),
      color: '#0F172A',
      fontWeight: '800',
    },
    previewTime: {
      marginTop: 2,
      fontSize: getScale(BASE_WIDTH, 13),
      color: '#64748B',
      fontWeight: '600',
    },
    previewCaption: {
      marginBottom: s.spacingSm,
      fontSize: s.bodySize,
      lineHeight: Math.round(s.bodySize * 1.45),
      color: '#111827',
      fontWeight: '500',
    },
    previewImage: {
      width: '100%',
      height: s.previewHeight,
      borderRadius: s.radiusLg,
      backgroundColor: '#D1D5DB',
    },
    primaryButton: {
      height: getScale(BASE_WIDTH, 52),
      borderRadius: s.radiusMd,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#111827',
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    primaryButtonText: {
      fontSize: getScale(BASE_WIDTH, 16),
      color: '#FFFFFF',
      fontWeight: '800',
    },
  });

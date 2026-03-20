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
import { ADMIN_ACCOUNT, getBlogDataForUser } from '../data/blogData';

const BASE_WIDTH = 375;

const getScale = (screenWidth, size) => {
  const ratio = screenWidth / BASE_WIDTH;
  const scaled = size * ratio;
  return Math.max(size * 0.85, Math.min(scaled, size * 1.25));
};

export default function FeedScreen({
  currentUser = ADMIN_ACCOUNT,
  onOpenProfile = () => {},
}) {
  const { width } = useWindowDimensions();

  const { profile, featuredPost, posts } = useMemo(
    () => getBlogDataForUser(currentUser),
    [currentUser]
  );

  const s = useMemo(
    () => ({
      spacingXs: getScale(width, 8),
      spacingSm: getScale(width, 12),
      spacingMd: getScale(width, 16),
      spacingLg: getScale(width, 20),
      radiusLg: getScale(width, 18),
      nameSize: getScale(width, 22),
      bodySize: getScale(width, 15),
      postImageHeight: getScale(width, 210),
      avatarHeader: getScale(width, 56),
      avatarPost: getScale(width, 46),
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
        <View style={styles.headerRow}>
          <Pressable onPress={onOpenProfile} hitSlop={10}>
            <Image source={{ uri: profile.avatar }} style={styles.headerAvatar} />
          </Pressable>

          <Pressable style={styles.headerNameWrap} onPress={onOpenProfile}>
            <Text style={styles.headerName}>{profile.name}</Text>
            <Text style={styles.headerSub}>
              {profile.role === 'admin'
                ? 'Đang xem blog riêng của admin'
                : 'Đang xem blog của chính bạn'}
            </Text>
          </Pressable>
        </View>

        {featuredPost ? (
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <Pressable onPress={onOpenProfile} hitSlop={10}>
                <Image source={{ uri: profile.avatar }} style={styles.postAvatar} />
              </Pressable>

              <View>
                <Text style={styles.postName}>{profile.name}</Text>
                <Text style={styles.postTime}>{featuredPost.time}</Text>
              </View>
            </View>

            <Text style={styles.postCaption}>{featuredPost.caption}</Text>

            <Image source={{ uri: featuredPost.image }} style={styles.postImage} />
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Chưa có bài viết</Text>
            <Text style={styles.emptyText}>
              Đăng ký thành công rồi, giờ bạn có thể bổ sung bài viết mới cho blog của mình.
            </Text>
          </View>
        )}

        {posts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <Pressable onPress={onOpenProfile} hitSlop={10}>
                <Image source={{ uri: profile.avatar }} style={styles.postAvatar} />
              </Pressable>

              <View>
                <Text style={styles.postName}>{profile.name}</Text>
                <Text style={styles.postTime}>{post.time}</Text>
              </View>
            </View>

            <Text style={styles.postCaption}>{post.caption}</Text>

            <Image source={{ uri: post.image }} style={styles.postImage} />
          </View>
        ))}
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
      paddingHorizontal: s.spacingMd,
      paddingBottom: s.spacingLg,
    },
    headerRow: {
      marginTop: s.spacingSm,
      marginBottom: s.spacingMd,
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerAvatar: {
      width: s.avatarHeader,
      height: s.avatarHeader,
      borderRadius: s.avatarHeader / 2,
      borderWidth: 2,
      borderColor: '#E5E7EB',
    },
    headerNameWrap: {
      marginLeft: s.spacingSm,
      flex: 1,
    },
    headerName: {
      fontSize: s.nameSize,
      fontWeight: '800',
      color: '#111827',
    },
    headerSub: {
      marginTop: 2,
      fontSize: getScale(BASE_WIDTH, 13),
      color: '#6B7280',
      fontWeight: '500',
    },
    postCard: {
      backgroundColor: '#ECECEE',
      borderRadius: s.radiusLg,
      padding: s.spacingMd,
      marginBottom: s.spacingMd,
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: s.spacingSm,
    },
    postAvatar: {
      width: s.avatarPost,
      height: s.avatarPost,
      borderRadius: s.avatarPost / 2,
      borderWidth: 2,
      borderColor: '#E5E7EB',
      marginRight: s.spacingSm,
    },
    postName: {
      fontSize: getScale(BASE_WIDTH, 19),
      fontWeight: '800',
      color: '#0F172A',
    },
    postTime: {
      marginTop: 1,
      fontSize: getScale(BASE_WIDTH, 14),
      color: '#4B5563',
      fontWeight: '500',
    },
    postCaption: {
      fontSize: s.bodySize,
      color: '#111827',
      lineHeight: Math.round(s.bodySize * 1.4),
      marginBottom: s.spacingSm,
      fontWeight: '500',
    },
    postImage: {
      width: '100%',
      height: s.postImageHeight,
      borderRadius: s.radiusLg,
    },
    emptyCard: {
      backgroundColor: '#ECECEE',
      borderRadius: s.radiusLg,
      padding: s.spacingLg,
      marginBottom: s.spacingMd,
    },
    emptyTitle: {
      fontSize: getScale(BASE_WIDTH, 20),
      fontWeight: '800',
      color: '#111827',
      marginBottom: s.spacingXs,
    },
    emptyText: {
      fontSize: s.bodySize,
      lineHeight: Math.round(s.bodySize * 1.45),
      color: '#4B5563',
      fontWeight: '500',
    },
  });

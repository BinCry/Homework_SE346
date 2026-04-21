import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { getPostDisplayTime } from '../data/blogData';

const BASE_WIDTH = 375;

const getScale = (screenWidth, size) => {
  const ratio = screenWidth / BASE_WIDTH;
  const scaled = size * ratio;
  return Math.max(size * 0.85, Math.min(scaled, size * 1.25));
};

const FALLBACK_AVATAR = 'https://i.pravatar.cc/300?u=unknown';
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80';

export default function FeedScreen({
  currentUser,
  feedItems = [],
  onCreateComment = async () => {},
  onDeletePost = async () => {},
  onOpenProfile = () => {},
  onOpenCreate = () => {},
}) {
  const { width } = useWindowDimensions();
  const [commentDrafts, setCommentDrafts] = useState({});
  const [submittingPostId, setSubmittingPostId] = useState(null);
  const [deletingPostId, setDeletingPostId] = useState(null);

  const profile = currentUser;

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
      avatarComment: getScale(width, 30),
    }),
    [width]
  );

  const styles = useMemo(() => createStyles(s), [s]);

  const handleCommentChange = (postId, value) => {
    setCommentDrafts((prev) => ({
      ...prev,
      [postId]: value,
    }));
  };

  const handleSubmitComment = async (postId) => {
    const commentText = (commentDrafts[postId] || '').trim();

    if (!commentText) {
      Alert.alert('Thông báo', 'Nội dung comment không được để trống.');
      return;
    }

    setSubmittingPostId(postId);

    try {
      await onCreateComment({ postId, content: commentText });
      setCommentDrafts((prev) => ({
        ...prev,
        [postId]: '',
      }));
    } catch (error) {
      Alert.alert('Có lỗi', 'Không thể gửi comment lúc này.');
    } finally {
      setSubmittingPostId(null);
    }
  };

  const isOwnPost = (post) => {
    const currentEmail = (currentUser?.email || '').trim().toLowerCase();
    const authorEmail = (post?.author?.id || post?.authorId || '').trim().toLowerCase();
    return Boolean(currentEmail && authorEmail && currentEmail === authorEmail);
  };

  const handleDeletePost = (post) => {
    const postId = post?.id;

    if (!postId) {
      return;
    }

    Alert.alert('Xóa bài viết', 'Bạn có chắc chắn muốn xóa bài viết này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          (async () => {
            setDeletingPostId(postId);

            try {
              await onDeletePost(postId);
            } catch (error) {
              Alert.alert('Có lỗi', 'Không thể xóa bài viết lúc này.');
            } finally {
              setDeletingPostId(null);
            }
          })();
        },
      },
    ]);
  };

  const renderCommentItem = (comment) => (
    <View key={comment.id} style={styles.commentItem}>
      <Image source={{ uri: comment.author?.avatar || FALLBACK_AVATAR }} style={styles.commentAvatar} />
      <View style={styles.commentBodyWrap}>
        <View style={styles.commentMetaRow}>
          <Text style={styles.commentAuthor}>{comment.author?.name || 'Người dùng'}</Text>
          <Text style={styles.commentTime}>{getPostDisplayTime({ createdAt: comment.createdAt })}</Text>
        </View>
        <Text style={styles.commentContent}>{comment.content}</Text>
      </View>
    </View>
  );

  const renderPostCard = (post) => {
    const isCommentSubmitting = submittingPostId === post.id;
    const isDeleting = deletingPostId === post.id;
    const canDelete = isOwnPost(post);

    return (
      <View key={post.id} style={styles.postCard}>
        <View style={styles.postHeader}>
          <Pressable onPress={onOpenProfile} hitSlop={10}>
            <Image source={{ uri: post.author?.avatar || FALLBACK_AVATAR }} style={styles.postAvatar} />
          </Pressable>

          <View style={styles.postMeta}>
            <Text style={styles.postName}>{post.author?.name || 'Người dùng'}</Text>
            <Text style={styles.postTime}>{getPostDisplayTime(post)}</Text>
          </View>

          {canDelete ? (
            <Pressable
              style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
              onPress={() => handleDeletePost(post)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.deleteButtonText}>Xóa</Text>
              )}
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.postCaption}>{post.caption}</Text>

        <Image source={{ uri: post.image || FALLBACK_IMAGE }} style={styles.postImage} />

        <View style={styles.commentSection}>
          <Text style={styles.commentTitle}>Bình luận ({post.comments?.length ?? 0})</Text>

          {post.comments?.length ? (
            post.comments.map((comment) => renderCommentItem(comment))
          ) : (
            <Text style={styles.commentEmpty}>Chưa có bình luận nào cho bài viết này.</Text>
          )}

          <View style={styles.commentInputRow}>
            <Image source={{ uri: currentUser?.avatar || FALLBACK_AVATAR }} style={styles.commentInputAvatar} />
            <TextInput
              value={commentDrafts[post.id] || ''}
              onChangeText={(value) => handleCommentChange(post.id, value)}
              placeholder="Nhập bình luận..."
              placeholderTextColor="#6B7280"
              style={styles.commentInput}
              editable={!isCommentSubmitting}
            />
            <Pressable
              style={[styles.commentSendButton, isCommentSubmitting && styles.commentSendButtonDisabled]}
              onPress={() => handleSubmitComment(post.id)}
              disabled={isCommentSubmitting}
            >
              {isCommentSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.commentSendText}>Gửi</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

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
            <Image source={{ uri: profile?.avatar || FALLBACK_AVATAR }} style={styles.headerAvatar} />
          </Pressable>

          <Pressable style={styles.headerNameWrap} onPress={onOpenProfile}>
            <Text style={styles.headerName}>{profile?.name || 'Người dùng'}</Text>
            <Text style={styles.headerSub}>Feed chung từ social API</Text>
          </Pressable>

          <Pressable style={styles.createButton} onPress={onOpenCreate}>
            <Text style={styles.createButtonText}>Tạo bài</Text>
          </Pressable>
        </View>

        {feedItems.length ? (
          feedItems.map((post) => renderPostCard(post))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Chưa có bài viết</Text>
            <Text style={styles.emptyText}>Feed đang trống. Bạn có thể tạo bài viết mới để bắt đầu.</Text>
            <Pressable style={styles.emptyButton} onPress={onOpenCreate}>
              <Text style={styles.emptyButtonText}>Tạo bài viết ngay</Text>
            </Pressable>
          </View>
        )}
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
    createButton: {
      minWidth: getScale(BASE_WIDTH, 88),
      height: getScale(BASE_WIDTH, 38),
      borderRadius: getScale(BASE_WIDTH, 12),
      backgroundColor: '#111827',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: s.spacingSm,
    },
    createButtonText: {
      color: '#FFFFFF',
      fontSize: getScale(BASE_WIDTH, 13),
      fontWeight: '800',
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
    postMeta: {
      flex: 1,
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
    deleteButton: {
      minWidth: getScale(BASE_WIDTH, 54),
      height: getScale(BASE_WIDTH, 34),
      borderRadius: getScale(BASE_WIDTH, 10),
      backgroundColor: '#991B1B',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: s.spacingXs,
    },
    deleteButtonDisabled: {
      opacity: 0.75,
    },
    deleteButtonText: {
      color: '#FFFFFF',
      fontSize: getScale(BASE_WIDTH, 12),
      fontWeight: '700',
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
      backgroundColor: '#D1D5DB',
    },
    commentSection: {
      marginTop: s.spacingMd,
      backgroundColor: '#F7F8FA',
      borderRadius: s.radiusLg,
      padding: s.spacingSm,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    commentTitle: {
      fontSize: getScale(BASE_WIDTH, 14),
      color: '#111827',
      fontWeight: '800',
      marginBottom: s.spacingSm,
    },
    commentEmpty: {
      fontSize: getScale(BASE_WIDTH, 13),
      color: '#6B7280',
      fontWeight: '500',
      marginBottom: s.spacingSm,
    },
    commentItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: s.spacingSm,
    },
    commentAvatar: {
      width: s.avatarComment,
      height: s.avatarComment,
      borderRadius: s.avatarComment / 2,
      marginRight: s.spacingXs,
      backgroundColor: '#D1D5DB',
    },
    commentBodyWrap: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: getScale(BASE_WIDTH, 12),
      paddingHorizontal: s.spacingSm,
      paddingVertical: s.spacingXs,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    commentMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
      gap: s.spacingXs,
    },
    commentAuthor: {
      fontSize: getScale(BASE_WIDTH, 13),
      fontWeight: '700',
      color: '#111827',
      flexShrink: 1,
    },
    commentTime: {
      fontSize: getScale(BASE_WIDTH, 11),
      color: '#6B7280',
      fontWeight: '600',
    },
    commentContent: {
      fontSize: getScale(BASE_WIDTH, 13),
      color: '#1F2937',
      lineHeight: Math.round(getScale(BASE_WIDTH, 13) * 1.35),
      fontWeight: '500',
    },
    commentInputRow: {
      marginTop: s.spacingXs,
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.spacingXs,
    },
    commentInputAvatar: {
      width: s.avatarComment,
      height: s.avatarComment,
      borderRadius: s.avatarComment / 2,
      backgroundColor: '#D1D5DB',
    },
    commentInput: {
      flex: 1,
      minHeight: getScale(BASE_WIDTH, 36),
      borderWidth: 1,
      borderColor: '#CBD5E1',
      borderRadius: getScale(BASE_WIDTH, 12),
      backgroundColor: '#FFFFFF',
      paddingHorizontal: s.spacingSm,
      color: '#111827',
      fontSize: getScale(BASE_WIDTH, 13),
      paddingVertical: Platform.select({ ios: 8, android: 6, default: 8 }),
    },
    commentSendButton: {
      minWidth: getScale(BASE_WIDTH, 52),
      height: getScale(BASE_WIDTH, 36),
      borderRadius: getScale(BASE_WIDTH, 10),
      backgroundColor: '#111827',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: s.spacingSm,
    },
    commentSendButtonDisabled: {
      opacity: 0.75,
    },
    commentSendText: {
      color: '#FFFFFF',
      fontSize: getScale(BASE_WIDTH, 13),
      fontWeight: '700',
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
    emptyButton: {
      marginTop: s.spacingMd,
      alignSelf: 'flex-start',
      paddingHorizontal: s.spacingMd,
      height: getScale(BASE_WIDTH, 42),
      borderRadius: getScale(BASE_WIDTH, 12),
      justifyContent: 'center',
      backgroundColor: '#111827',
    },
    emptyButtonText: {
      color: '#FFFFFF',
      fontSize: getScale(BASE_WIDTH, 14),
      fontWeight: '700',
    },
  });

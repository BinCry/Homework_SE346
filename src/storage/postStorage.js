import AsyncStorage from '@react-native-async-storage/async-storage';

const POSTS_STORAGE_KEY = '@se346/posts';

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const getStoredPostBuckets = async () => {
  try {
    const rawValue = await AsyncStorage.getItem(POSTS_STORAGE_KEY);

    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue);
    return isPlainObject(parsedValue) ? parsedValue : {};
  } catch (error) {
    return {};
  }
};

export const saveStoredPostBuckets = async (postBuckets) => {
  await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(postBuckets));
};

export const getStoredPostsForUser = async (userId) => {
  if (!userId) {
    return null;
  }

  const postBuckets = await getStoredPostBuckets();
  const posts = postBuckets[userId];

  return Array.isArray(posts) ? posts : null;
};

export const savePostsForUser = async (userId, posts) => {
  if (!userId) {
    return;
  }

  const postBuckets = await getStoredPostBuckets();
  postBuckets[userId] = Array.isArray(posts) ? posts : [];

  await saveStoredPostBuckets(postBuckets);
};

export const hydrateUserWithStoredPosts = async (user) => {
  if (!user) {
    return user;
  }

  const storedPosts = await getStoredPostsForUser(user.id);

  if (!storedPosts) {
    return {
      ...user,
      posts: Array.isArray(user.posts) ? user.posts : [],
    };
  }

  return {
    ...user,
    posts: storedPosts,
  };
};

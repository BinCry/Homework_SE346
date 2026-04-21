import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFallbackBlogImage } from '../data/blogData';

const API_BASE_URL = 'http://blackntt.net:4321';

const USER_CACHE_KEY = '@se346/social/user-cache';
const PROFILE_PATCH_KEY = '@se346/social/profile-patch';
const COMMENT_BUCKET_KEY = '@se346/social/comment-buckets';
const POST_IMAGE_BUCKET_KEY = '@se346/social/post-image-buckets';

const DEFAULT_BIO = 'Social app user';
const DEFAULT_PLACEHOLDER = 'Not set';

let initializationPromise = null;
let profileEndpointMode = 'unknown';

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cleanText = (value = '') => String(value ?? '').trim();

export const normalizeCredential = (value = '') =>
  String(value ?? '').trim().toLowerCase();

const createStorageError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const safeParseJson = (rawValue, fallbackValue) => {
  try {
    const parsedValue = JSON.parse(rawValue);
    return parsedValue ?? fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
};

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const buildAvatar = (email = '') =>
  `https://i.pravatar.cc/300?u=${encodeURIComponent(email || 'unknown')}`;

const buildUsernameFromEmail = (email = '') => {
  const localPart = cleanText(email).split('@')[0] || 'user';
  const usernameSeed = localPart.replace(/[^a-zA-Z0-9._-]/g, '');
  return `@${usernameSeed || 'user'}`;
};

const prettifyNameFromEmail = (email = '') => {
  const localPart = cleanText(email).split('@')[0];
  const normalized = localPart.replace(/[._-]+/g, ' ').trim();

  if (!normalized) {
    return 'User';
  }

  return normalized
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
};

const parseServerDate = (rawValue) => {
  const value = cleanText(rawValue);

  if (!value) {
    return new Date().toISOString();
  }

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const localTimestamp = Date.parse(normalized);

  if (!Number.isNaN(localTimestamp)) {
    return new Date(localTimestamp).toISOString();
  }

  const utcTimestamp = Date.parse(`${normalized}Z`);

  if (!Number.isNaN(utcTimestamp)) {
    return new Date(utcTimestamp).toISOString();
  }

  return new Date().toISOString();
};

const derivePostTitle = (caption = '') => {
  const lines = cleanText(caption)
    .split(/\r?\n/)
    .map((line) => cleanText(line))
    .filter(Boolean);

  const primaryLine = lines[0] || cleanText(caption);

  if (primaryLine.length <= 48) {
    return primaryLine;
  }

  return `${primaryLine.slice(0, 45)}...`;
};

const buildUrl = (path, query) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const queryEntries = Object.entries(query || {}).filter(
    ([, value]) => value !== undefined && value !== null
  );

  if (!queryEntries.length) {
    return `${API_BASE_URL}${cleanPath}`;
  }

  const queryString = queryEntries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return `${API_BASE_URL}${cleanPath}?${queryString}`;
};

const mapApiErrorCode = (status, detailMessage = '') => {
  const detail = cleanText(detailMessage).toLowerCase();

  if (status === 401) {
    return 'INVALID_CREDENTIALS';
  }

  if (status === 403) {
    return 'FORBIDDEN';
  }

  if (status === 404 && detail.includes('creator not found')) {
    return 'USER_NOT_FOUND';
  }

  if (status === 404 && detail.includes('post not found')) {
    return 'POST_NOT_FOUND';
  }

  if (status === 400 && detail.includes('already exists')) {
    return 'DUPLICATE_EMAIL';
  }

  if (status === 422) {
    return 'INVALID_INPUT';
  }

  return 'API_ERROR';
};

const requestApiJson = async ({ path, method = 'GET', query, body }) => {
  let response = null;

  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    throw createStorageError('NETWORK_ERROR', 'Cannot connect to API server.');
  }

  const rawResponse = await response.text();
  const payload = rawResponse ? safeParseJson(rawResponse, rawResponse) : null;

  if (!response.ok) {
    const detailMessage = isPlainObject(payload) ? cleanText(payload.detail) : '';
    const message = detailMessage || cleanText(response.statusText) || 'API request failed.';
    const errorCode = mapApiErrorCode(response.status, detailMessage);
    const error = createStorageError(errorCode, message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

const readObjectStore = async (key) => {
  const rawValue = await AsyncStorage.getItem(key);

  if (!rawValue) {
    return {};
  }

  const parsedValue = safeParseJson(rawValue, {});
  return isPlainObject(parsedValue) ? parsedValue : {};
};

const writeObjectStore = async (key, value) => {
  await AsyncStorage.setItem(key, JSON.stringify(isPlainObject(value) ? value : {}));
};

const ensureObjectStore = async (key) => {
  const value = await readObjectStore(key);
  await writeObjectStore(key, value);
  return value;
};

const normalizeEmailKey = (email) => normalizeCredential(email);

const toCommentArray = (commentBucket, postId) => {
  const postComments = commentBucket?.[postId];
  return Array.isArray(postComments) ? postComments : [];
};

const resolveLocalUserProfile = (email, userCache, profilePatch, fallbackName = '') => {
  const cacheEntry = isPlainObject(userCache?.[email]) ? userCache[email] : {};
  const patchEntry = isPlainObject(profilePatch?.[email]) ? profilePatch[email] : {};

  const name =
    cleanText(patchEntry.name) ||
    cleanText(cacheEntry.name) ||
    cleanText(fallbackName) ||
    prettifyNameFromEmail(email);
  const bio =
    cleanText(patchEntry.bio) ||
    cleanText(patchEntry.description) ||
    cleanText(cacheEntry.bio) ||
    cleanText(cacheEntry.description) ||
    DEFAULT_BIO;
  const avatar =
    cleanText(patchEntry.avatar) || cleanText(cacheEntry.avatar) || buildAvatar(email);
  const phone = cleanText(patchEntry.phone) || cleanText(cacheEntry.phone) || DEFAULT_PLACEHOLDER;
  const birthday =
    cleanText(patchEntry.birthday) || cleanText(cacheEntry.birthday) || DEFAULT_PLACEHOLDER;
  const address =
    cleanText(patchEntry.address) || cleanText(cacheEntry.address) || DEFAULT_PLACEHOLDER;

  return {
    email,
    name,
    bio,
    avatar,
    phone,
    birthday,
    address,
  };
};

const mapApiPostToFeedItem = ({
  apiPost,
  userCache,
  profilePatch,
  commentBucket,
  postImageBucket,
}) => {
  const postId = cleanText(apiPost?.id);
  const creatorEmail = normalizeCredential(apiPost?.creator_email);
  const creatorName = cleanText(apiPost?.creator_name);
  const profile = resolveLocalUserProfile(creatorEmail, userCache, profilePatch, creatorName);
  const createdAt = parseServerDate(apiPost?.created_at);
  const comments = toCommentArray(commentBucket, postId)
    .slice()
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  const image = cleanText(postImageBucket?.[postId]) || getFallbackBlogImage(postId || creatorEmail);

  return {
    id: postId,
    caption: cleanText(apiPost?.description) || cleanText(apiPost?.title),
    image,
    createdAt,
    authorId: creatorEmail,
    author: {
      id: creatorEmail,
      name: profile.name,
      username: buildUsernameFromEmail(creatorEmail),
      avatar: profile.avatar,
    },
    comments,
  };
};

const mapApiPostToUserPost = ({ apiPost, postImageBucket }) => {
  const postId = cleanText(apiPost?.id);

  return {
    id: postId,
    caption: cleanText(apiPost?.description) || cleanText(apiPost?.title),
    image: cleanText(postImageBucket?.[postId]) || getFallbackBlogImage(postId),
    createdAt: parseServerDate(apiPost?.created_at),
    time: 'Just now',
  };
};

const upsertUserCache = async (email, fields) => {
  const key = normalizeEmailKey(email);

  if (!key) {
    return;
  }

  const userCache = await readObjectStore(USER_CACHE_KEY);
  const currentValue = isPlainObject(userCache[key]) ? userCache[key] : {};

  userCache[key] = {
    ...currentValue,
    email: key,
    ...fields,
  };

  await writeObjectStore(USER_CACHE_KEY, userCache);
};

const fetchProfileByEmailIfAvailable = async (email) => {
  if (profileEndpointMode === 'unavailable') {
    return null;
  }

  try {
    const payload = await requestApiJson({
      path: `/profile/${encodeURIComponent(email)}`,
      method: 'GET',
    });
    profileEndpointMode = 'available';

    if (isPlainObject(payload)) {
      return payload;
    }

    return null;
  } catch (error) {
    const detailMessage = cleanText(error?.payload?.detail || error?.message);

    if (error?.status === 404 && detailMessage.toLowerCase() === 'not found') {
      profileEndpointMode = 'unavailable';
      return null;
    }

    if (error?.status === 404) {
      return null;
    }

    throw error;
  }
};

export const initializeLocalDatabase = async () => {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await Promise.all([
        ensureObjectStore(USER_CACHE_KEY),
        ensureObjectStore(PROFILE_PATCH_KEY),
        ensureObjectStore(COMMENT_BUCKET_KEY),
        ensureObjectStore(POST_IMAGE_BUCKET_KEY),
      ]);
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  await initializationPromise;
};

export const getPostById = async (postId) => {
  const cleanPostId = cleanText(postId);

  if (!cleanPostId) {
    return null;
  }

  await initializeLocalDatabase();

  const [apiPost, userCache, profilePatch, commentBucket, postImageBucket] = await Promise.all([
    requestApiJson({ path: `/posts/${encodeURIComponent(cleanPostId)}`, method: 'GET' }),
    readObjectStore(USER_CACHE_KEY),
    readObjectStore(PROFILE_PATCH_KEY),
    readObjectStore(COMMENT_BUCKET_KEY),
    readObjectStore(POST_IMAGE_BUCKET_KEY),
  ]);

  return mapApiPostToFeedItem({
    apiPost,
    userCache,
    profilePatch,
    commentBucket,
    postImageBucket,
  });
};

export const getUserProfileById = async (userId) => {
  const email = normalizeEmailKey(userId);

  if (!email) {
    return null;
  }

  await initializeLocalDatabase();

  const [posts, userCache, profilePatch, postImageBucket, remoteProfile] = await Promise.all([
    requestApiJson({ path: '/posts', method: 'GET' }),
    readObjectStore(USER_CACHE_KEY),
    readObjectStore(PROFILE_PATCH_KEY),
    readObjectStore(POST_IMAGE_BUCKET_KEY),
    fetchProfileByEmailIfAvailable(email),
  ]);

  const remoteName = cleanText(remoteProfile?.name);
  const remoteDescription =
    cleanText(remoteProfile?.description) || cleanText(remoteProfile?.bio);

  if (remoteName || remoteDescription) {
    await upsertUserCache(email, {
      name: remoteName,
      description: remoteDescription,
    });
  }

  const mergedProfile = resolveLocalUserProfile(email, userCache, profilePatch, remoteName);
  const mappedPosts = (Array.isArray(posts) ? posts : [])
    .filter((post) => normalizeCredential(post?.creator_email) === email)
    .sort(
      (left, right) =>
        Date.parse(parseServerDate(right?.created_at)) -
        Date.parse(parseServerDate(left?.created_at))
    )
    .map((apiPost) => mapApiPostToUserPost({ apiPost, postImageBucket }));

  return {
    id: email,
    role: email === 'admin' ? 'admin' : 'user',
    name: mergedProfile.name,
    username: buildUsernameFromEmail(email),
    email,
    avatar: mergedProfile.avatar,
    bio: cleanText(mergedProfile.bio) || remoteDescription || DEFAULT_BIO,
    phone: mergedProfile.phone,
    birthday: mergedProfile.birthday,
    address: mergedProfile.address,
    posts: mappedPosts,
  };
};

export const loginWithIdentifier = async (identifier, password) => {
  const cleanIdentifier = normalizeEmailKey(identifier);
  const cleanPassword = cleanText(password);

  if (!cleanIdentifier || !cleanPassword) {
    throw createStorageError('INVALID_INPUT', 'Email and password are required.');
  }

  const payload = await requestApiJson({
    path: '/login',
    method: 'POST',
    query: {
      email: cleanIdentifier,
      password: cleanPassword,
    },
  });

  await upsertUserCache(cleanIdentifier, {
    name: cleanText(payload?.name) || prettifyNameFromEmail(cleanIdentifier),
  });

  return getUserProfileById(cleanIdentifier);
};

export const registerLocalAccount = async ({ name, email, password }) => {
  const cleanName = cleanText(name);
  const cleanEmail = normalizeEmailKey(email);
  const cleanPassword = cleanText(password);

  if (!cleanName || !cleanEmail || !cleanPassword) {
    throw createStorageError('INVALID_INPUT', 'Name, email and password are required.');
  }

  if (cleanPassword.length < 4) {
    throw createStorageError('WEAK_PASSWORD', 'Password must be at least 4 characters.');
  }

  await requestApiJson({
    path: '/register',
    method: 'POST',
    body: {
      email: cleanEmail,
      password: cleanPassword,
      name: cleanName,
      description: `${cleanName} joined the app.`,
    },
  });

  await upsertUserCache(cleanEmail, {
    name: cleanName,
    description: `${cleanName} joined the app.`,
  });

  return getUserProfileById(cleanEmail);
};

export const createPostForUser = async (userId, { caption, image }) => {
  const creatorEmail = normalizeEmailKey(userId);
  const cleanCaption = cleanText(caption);
  const cleanImage = cleanText(image);

  if (!creatorEmail) {
    throw createStorageError('INVALID_USER', 'User is required to create a post.');
  }

  if (!cleanCaption) {
    throw createStorageError('EMPTY_POST', 'Post content cannot be empty.');
  }

  const payload = await requestApiJson({
    path: '/posts',
    method: 'POST',
    body: {
      title: derivePostTitle(cleanCaption),
      description: cleanCaption,
      creator_email: creatorEmail,
    },
  });

  const postId = cleanText(payload?.id);

  if (postId && cleanImage) {
    const postImageBucket = await readObjectStore(POST_IMAGE_BUCKET_KEY);
    postImageBucket[postId] = cleanImage;
    await writeObjectStore(POST_IMAGE_BUCKET_KEY, postImageBucket);
  }

  if (cleanText(payload?.creator_name)) {
    await upsertUserCache(creatorEmail, {
      name: cleanText(payload.creator_name),
    });
  }

  return payload;
};

export const getCommentsByPost = async (postId) => {
  const cleanPostId = cleanText(postId);

  if (!cleanPostId) {
    return [];
  }

  await initializeLocalDatabase();
  const commentBucket = await readObjectStore(COMMENT_BUCKET_KEY);

  return toCommentArray(commentBucket, cleanPostId)
    .slice()
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
};

export const createCommentForPost = async (postId, userId, content) => {
  const cleanPostId = cleanText(postId);
  const cleanUserId = normalizeEmailKey(userId);
  const cleanContent = cleanText(content);

  if (!cleanPostId || !cleanUserId) {
    throw createStorageError('INVALID_INPUT', 'Post and user are required.');
  }

  if (!cleanContent) {
    throw createStorageError('EMPTY_COMMENT', 'Comment content cannot be empty.');
  }

  await initializeLocalDatabase();

  const [commentBucket, profile] = await Promise.all([
    readObjectStore(COMMENT_BUCKET_KEY),
    getUserProfileById(cleanUserId),
  ]);

  const nextComment = {
    id: createId('comment'),
    postId: cleanPostId,
    authorId: cleanUserId,
    content: cleanContent,
    createdAt: new Date().toISOString(),
    author: {
      id: cleanUserId,
      name: cleanText(profile?.name) || prettifyNameFromEmail(cleanUserId),
      username: cleanText(profile?.username) || buildUsernameFromEmail(cleanUserId),
      avatar: cleanText(profile?.avatar) || buildAvatar(cleanUserId),
    },
  };

  const nextPostComments = [...toCommentArray(commentBucket, cleanPostId), nextComment];
  commentBucket[cleanPostId] = nextPostComments;
  await writeObjectStore(COMMENT_BUCKET_KEY, commentBucket);

  return nextComment;
};

export const getGlobalFeedWithComments = async () => {
  await initializeLocalDatabase();

  const [apiPosts, userCache, profilePatch, commentBucket, postImageBucket] = await Promise.all([
    requestApiJson({ path: '/posts', method: 'GET' }),
    readObjectStore(USER_CACHE_KEY),
    readObjectStore(PROFILE_PATCH_KEY),
    readObjectStore(COMMENT_BUCKET_KEY),
    readObjectStore(POST_IMAGE_BUCKET_KEY),
  ]);

  const postList = Array.isArray(apiPosts) ? apiPosts : [];

  return postList
    .slice()
    .sort(
      (left, right) =>
        Date.parse(parseServerDate(right?.created_at)) -
        Date.parse(parseServerDate(left?.created_at))
    )
    .map((apiPost) =>
      mapApiPostToFeedItem({
        apiPost,
        userCache,
        profilePatch,
        commentBucket,
        postImageBucket,
      })
    );
};

export const updateUserProfile = async (userId, profilePatch) => {
  const email = normalizeEmailKey(userId);

  if (!email) {
    throw createStorageError('INVALID_USER', 'User is required.');
  }

  await initializeLocalDatabase();

  const patchStore = await readObjectStore(PROFILE_PATCH_KEY);
  const currentPatch = isPlainObject(patchStore[email]) ? patchStore[email] : {};
  const nextPatch = { ...currentPatch };

  if (profilePatch?.name !== undefined) {
    const nextName = cleanText(profilePatch.name);

    if (!nextName) {
      throw createStorageError('INVALID_NAME', 'Name is required.');
    }

    nextPatch.name = nextName;
  }

  if (profilePatch?.bio !== undefined) {
    nextPatch.bio = cleanText(profilePatch.bio) || DEFAULT_BIO;
  }

  if (profilePatch?.phone !== undefined) {
    nextPatch.phone = cleanText(profilePatch.phone) || DEFAULT_PLACEHOLDER;
  }

  if (profilePatch?.birthday !== undefined) {
    nextPatch.birthday = cleanText(profilePatch.birthday) || DEFAULT_PLACEHOLDER;
  }

  if (profilePatch?.address !== undefined) {
    nextPatch.address = cleanText(profilePatch.address) || DEFAULT_PLACEHOLDER;
  }

  if (profilePatch?.avatar !== undefined) {
    nextPatch.avatar = cleanText(profilePatch.avatar) || buildAvatar(email);
  }

  patchStore[email] = nextPatch;
  await writeObjectStore(PROFILE_PATCH_KEY, patchStore);

  const userCache = await readObjectStore(USER_CACHE_KEY);
  const currentCache = isPlainObject(userCache[email]) ? userCache[email] : { email };
  userCache[email] = {
    ...currentCache,
    name: cleanText(nextPatch.name) || cleanText(currentCache.name),
    description: cleanText(nextPatch.bio) || cleanText(currentCache.description),
    avatar: cleanText(nextPatch.avatar) || cleanText(currentCache.avatar),
    phone: cleanText(nextPatch.phone) || cleanText(currentCache.phone),
    birthday: cleanText(nextPatch.birthday) || cleanText(currentCache.birthday),
    address: cleanText(nextPatch.address) || cleanText(currentCache.address),
  };
  await writeObjectStore(USER_CACHE_KEY, userCache);

  return getUserProfileById(email);
};

export const deletePostById = async (postId, requesterEmail) => {
  const cleanPostId = cleanText(postId);
  const cleanRequester = normalizeEmailKey(requesterEmail);

  if (!cleanPostId) {
    throw createStorageError('INVALID_POST', 'Post id is required.');
  }

  const existingPost = await requestApiJson({
    path: `/posts/${encodeURIComponent(cleanPostId)}`,
    method: 'GET',
  });

  const ownerEmail = normalizeCredential(existingPost?.creator_email);

  if (cleanRequester && ownerEmail && cleanRequester !== ownerEmail) {
    throw createStorageError('FORBIDDEN', 'You can only delete your own post.');
  }

  await requestApiJson({
    path: `/posts/${encodeURIComponent(cleanPostId)}`,
    method: 'DELETE',
  });

  const [commentBucket, postImageBucket] = await Promise.all([
    readObjectStore(COMMENT_BUCKET_KEY),
    readObjectStore(POST_IMAGE_BUCKET_KEY),
  ]);

  if (Object.prototype.hasOwnProperty.call(commentBucket, cleanPostId)) {
    delete commentBucket[cleanPostId];
  }

  if (Object.prototype.hasOwnProperty.call(postImageBucket, cleanPostId)) {
    delete postImageBucket[cleanPostId];
  }

  await Promise.all([
    writeObjectStore(COMMENT_BUCKET_KEY, commentBucket),
    writeObjectStore(POST_IMAGE_BUCKET_KEY, postImageBucket),
  ]);
};

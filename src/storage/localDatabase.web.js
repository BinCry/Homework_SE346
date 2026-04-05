import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADMIN_ACCOUNT, BLOG_IMAGES } from '../data/blogData';

const USERS_KEY = '@se346/web/users';
const POSTS_KEY = '@se346/web/posts';
const COMMENTS_KEY = '@se346/web/comments';
const META_KEY = '@se346/web/meta';

const LEGACY_ACCOUNTS_STORAGE_KEY = '@se346/accounts';
const LEGACY_POSTS_STORAGE_KEY = '@se346/posts';
const MIGRATION_META_KEY = 'migrated_asyncstorage_to_sqlite';

const DEFAULT_PLACEHOLDER = 'Chưa cập nhật';
const DEFAULT_BIO = 'Người dùng đang xây dựng blog cá nhân.';

let initializationPromise = null;

const normalizeCredential = (value = '') => String(value ?? '').trim().toLowerCase();

const cleanText = (value = '') => String(value ?? '').trim();

const cleanOptionalText = (value, fallback = DEFAULT_PLACEHOLDER) => {
  const cleaned = cleanText(value);
  return cleaned || fallback;
};

const safeParseJson = (rawValue, fallbackValue) => {
  try {
    const parsedValue = JSON.parse(rawValue);
    return parsedValue ?? fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
};

const createStorageError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const getNowIso = () => new Date().toISOString();

const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const slugify = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();

const readUsers = async () => {
  const rawValue = await AsyncStorage.getItem(USERS_KEY);
  const parsed = safeParseJson(rawValue, []);
  return Array.isArray(parsed) ? parsed : [];
};

const writeUsers = async (users) => {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const readPosts = async () => {
  const rawValue = await AsyncStorage.getItem(POSTS_KEY);
  const parsed = safeParseJson(rawValue, []);
  return Array.isArray(parsed) ? parsed : [];
};

const writePosts = async (posts) => {
  await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(posts));
};

const readComments = async () => {
  const rawValue = await AsyncStorage.getItem(COMMENTS_KEY);
  const parsed = safeParseJson(rawValue, []);
  return Array.isArray(parsed) ? parsed : [];
};

const writeComments = async (comments) => {
  await AsyncStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
};

const readMeta = async () => {
  const rawValue = await AsyncStorage.getItem(META_KEY);
  const parsed = safeParseJson(rawValue, {});
  return typeof parsed === 'object' && parsed ? parsed : {};
};

const writeMeta = async (meta) => {
  await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
};

const mapPostRow = (row) => ({
  id: row.id,
  caption: row.caption,
  image: row.image,
  createdAt: row.createdAt,
  time: 'Vừa xong',
});

const mapUserRow = (row) => ({
  id: row.id,
  role: row.role,
  name: row.name,
  username: row.username,
  email: row.email,
  avatar: row.avatar,
  bio: row.bio,
  phone: row.phone,
  birthday: row.birthday,
  address: row.address,
});

const toLegacyPostCreatedAt = (post, index) => {
  const existingDate = cleanText(post?.createdAt);

  if (existingDate) {
    const timestamp = Date.parse(existingDate);

    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp).toISOString();
    }
  }

  return new Date(Date.now() - index * 60 * 60 * 1000).toISOString();
};

const ensureAdminSeeded = async () => {
  const users = await readUsers();

  if (!users.some((user) => user.id === ADMIN_ACCOUNT.id)) {
    users.push({
      id: ADMIN_ACCOUNT.id,
      role: ADMIN_ACCOUNT.role || 'admin',
      name: cleanText(ADMIN_ACCOUNT.name) || 'Admin',
      username: cleanText(ADMIN_ACCOUNT.username) || '@admin',
      email: cleanText(ADMIN_ACCOUNT.email) || 'admin',
      password: cleanText(ADMIN_ACCOUNT.password) || 'admin',
      avatar: cleanText(ADMIN_ACCOUNT.avatar) || 'https://i.pravatar.cc/300?u=admin',
      bio: cleanOptionalText(ADMIN_ACCOUNT.bio, DEFAULT_BIO),
      phone: cleanOptionalText(ADMIN_ACCOUNT.phone),
      birthday: cleanOptionalText(ADMIN_ACCOUNT.birthday),
      address: cleanOptionalText(ADMIN_ACCOUNT.address),
      createdAt: getNowIso(),
      updatedAt: getNowIso(),
    });

    await writeUsers(users);
  }

  const posts = await readPosts();
  const adminPostCount = posts.filter((post) => post.authorId === ADMIN_ACCOUNT.id).length;

  if (adminPostCount === 0) {
    const fallbackPosts = Array.isArray(ADMIN_ACCOUNT.posts) ? ADMIN_ACCOUNT.posts : [];
    const seededPosts = fallbackPosts
      .filter((post) => cleanText(post?.caption))
      .map((post, index) => ({
        id: cleanText(post.id) || createId('post'),
        authorId: ADMIN_ACCOUNT.id,
        caption: cleanText(post.caption),
        image: cleanText(post.image) || BLOG_IMAGES[index % BLOG_IMAGES.length],
        createdAt: toLegacyPostCreatedAt(post, index),
        updatedAt: toLegacyPostCreatedAt(post, index),
      }));

    await writePosts([...posts, ...seededPosts]);
  }
};

const migrateLegacyDataIfNeeded = async () => {
  const meta = await readMeta();

  if (meta[MIGRATION_META_KEY] === '1') {
    return;
  }

  const legacyAccountsRaw = await AsyncStorage.getItem(LEGACY_ACCOUNTS_STORAGE_KEY);
  const legacyAccounts = safeParseJson(legacyAccountsRaw, []);

  const legacyPostBucketsRaw = await AsyncStorage.getItem(LEGACY_POSTS_STORAGE_KEY);
  const legacyPostBuckets = safeParseJson(legacyPostBucketsRaw, {});

  const users = await readUsers();
  const posts = await readPosts();

  const userMap = new Map(users.map((user) => [user.id, user]));

  if (Array.isArray(legacyAccounts)) {
    for (let index = 0; index < legacyAccounts.length; index += 1) {
      const account = legacyAccounts[index];
      const name = cleanText(account?.name);
      const email = normalizeCredential(account?.email);
      const username = cleanText(account?.username);
      const password = cleanText(account?.password);

      if (!name || !email || !username || !password) {
        continue;
      }

      const id = cleanText(account?.id) || `legacy-user-${index}`;

      userMap.set(id, {
        id,
        role: cleanText(account?.role) || 'user',
        name,
        username,
        email,
        password,
        avatar:
          cleanText(account?.avatar) || `https://i.pravatar.cc/300?u=${encodeURIComponent(email || id)}`,
        bio: cleanOptionalText(account?.bio, DEFAULT_BIO),
        phone: cleanOptionalText(account?.phone),
        birthday: cleanOptionalText(account?.birthday),
        address: cleanOptionalText(account?.address),
        createdAt: getNowIso(),
        updatedAt: getNowIso(),
      });
    }
  }

  const nextUsers = Array.from(userMap.values());
  const nextPosts = [...posts];

  const accountMap = new Map(
    (Array.isArray(legacyAccounts) ? legacyAccounts : []).map((account) => [cleanText(account?.id), account])
  );

  const postUserIds = new Set([
    ...Object.keys(legacyPostBuckets || {}),
    ...Array.from(accountMap.keys()),
  ]);

  for (const userId of postUserIds) {
    if (!userId) {
      continue;
    }

    const bucketPosts = legacyPostBuckets?.[userId];
    const accountPosts = Array.isArray(accountMap.get(userId)?.posts)
      ? accountMap.get(userId).posts
      : [];

    const sourcePosts = Array.isArray(bucketPosts)
      ? bucketPosts
      : Array.isArray(accountPosts)
        ? accountPosts
        : [];

    if (!sourcePosts.length) {
      continue;
    }

    for (let index = nextPosts.length - 1; index >= 0; index -= 1) {
      if (nextPosts[index].authorId === userId) {
        nextPosts.splice(index, 1);
      }
    }

    sourcePosts.forEach((post, index) => {
      const caption = cleanText(post?.caption);

      if (!caption) {
        return;
      }

      const createdAt = toLegacyPostCreatedAt(post, index);
      nextPosts.push({
        id: cleanText(post?.id) || createId('post'),
        authorId: userId,
        caption,
        image: cleanText(post?.image) || BLOG_IMAGES[index % BLOG_IMAGES.length],
        createdAt,
        updatedAt: createdAt,
      });
    });
  }

  await writeUsers(nextUsers);
  await writePosts(nextPosts);
  await writeMeta({
    ...meta,
    [MIGRATION_META_KEY]: '1',
  });
};

export const initializeLocalDatabase = async () => {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await ensureAdminSeeded();
      await migrateLegacyDataIfNeeded();
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  await initializationPromise;
};

export { normalizeCredential };

export const getUserProfileById = async (userId) => {
  if (!userId) {
    return null;
  }

  await initializeLocalDatabase();
  const users = await readUsers();
  const posts = await readPosts();

  const user = users.find((item) => item.id === userId);

  if (!user) {
    return null;
  }

  const userPosts = posts
    .filter((post) => post.authorId === userId)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .map(mapPostRow);

  return {
    ...mapUserRow(user),
    posts: userPosts,
  };
};

export const loginWithIdentifier = async (identifier, password) => {
  const cleanIdentifier = normalizeCredential(identifier);
  const cleanPassword = cleanText(password);

  if (!cleanIdentifier || !cleanPassword) {
    throw createStorageError('INVALID_INPUT', 'Identifier and password are required.');
  }

  await initializeLocalDatabase();
  const users = await readUsers();

  const matchedUser = users.find((user) => {
    const username = cleanText(user.username).replace(/^@/, '');

    return (
      normalizeCredential(user.email) === cleanIdentifier ||
      normalizeCredential(user.username) === cleanIdentifier ||
      normalizeCredential(username) === cleanIdentifier
    );
  });

  if (!matchedUser || cleanText(matchedUser.password) !== cleanPassword) {
    throw createStorageError('INVALID_CREDENTIALS', 'Tài khoản hoặc mật khẩu không đúng.');
  }

  return getUserProfileById(matchedUser.id);
};

export const registerLocalAccount = async ({ name, email, password }) => {
  const cleanName = cleanText(name);
  const cleanEmail = normalizeCredential(email);
  const cleanPassword = cleanText(password);

  if (!cleanName || !cleanEmail || !cleanPassword) {
    throw createStorageError('INVALID_INPUT', 'Thông tin đăng ký không hợp lệ.');
  }

  if (cleanPassword.length < 4) {
    throw createStorageError('WEAK_PASSWORD', 'Mật khẩu cần ít nhất 4 ký tự.');
  }

  await initializeLocalDatabase();
  const users = await readUsers();

  const emailExists = users.some((user) => normalizeCredential(user.email) === cleanEmail);

  if (emailExists) {
    throw createStorageError('DUPLICATE_EMAIL', 'Email đã tồn tại.');
  }

  const username = `@${slugify(cleanName) || slugify(cleanEmail.split('@')[0]) || 'user'}`;

  const usernameExists = users.some(
    (user) => normalizeCredential(user.username) === normalizeCredential(username)
  );

  if (usernameExists) {
    throw createStorageError('DUPLICATE_USERNAME', 'Tên đăng nhập đã tồn tại.');
  }

  const userId = createId('user');
  const now = getNowIso();

  const nextUser = {
    id: userId,
    role: 'user',
    name: cleanName,
    username,
    email: cleanEmail,
    password: cleanPassword,
    avatar: `https://i.pravatar.cc/300?u=${encodeURIComponent(cleanEmail)}`,
    bio: `${cleanName} vừa tạo blog cá nhân trên ứng dụng.`,
    phone: DEFAULT_PLACEHOLDER,
    birthday: DEFAULT_PLACEHOLDER,
    address: DEFAULT_PLACEHOLDER,
    createdAt: now,
    updatedAt: now,
  };

  await writeUsers([...users, nextUser]);
  return getUserProfileById(userId);
};

export const createPostForUser = async (userId, { caption, image }) => {
  const cleanCaption = cleanText(caption);
  const cleanImage = cleanText(image);

  if (!userId) {
    throw createStorageError('INVALID_USER', 'Không xác định được người dùng.');
  }

  if (!cleanCaption) {
    throw createStorageError('EMPTY_POST', 'Nội dung bài viết không được để trống.');
  }

  await initializeLocalDatabase();
  const users = await readUsers();

  const user = users.find((item) => item.id === userId);
  if (!user) {
    throw createStorageError('USER_NOT_FOUND', 'Tài khoản không tồn tại.');
  }

  const posts = await readPosts();
  const createdAt = getNowIso();

  const nextPost = {
    id: createId('post'),
    authorId: userId,
    caption: cleanCaption,
    image: cleanImage || `https://i.pravatar.cc/600?u=${encodeURIComponent(user.email || userId)}`,
    createdAt,
    updatedAt: createdAt,
  };

  await writePosts([nextPost, ...posts]);
};

export const getCommentsByPost = async (postId) => {
  if (!postId) {
    return [];
  }

  await initializeLocalDatabase();
  const comments = await readComments();
  const users = await readUsers();
  const userMap = new Map(users.map((user) => [user.id, user]));

  return comments
    .filter((comment) => comment.postId === postId)
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))
    .map((comment) => ({
      id: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
      content: comment.content,
      createdAt: comment.createdAt,
      author: {
        id: comment.authorId,
        name: userMap.get(comment.authorId)?.name || 'Người dùng',
        username: userMap.get(comment.authorId)?.username || '@user',
        avatar: userMap.get(comment.authorId)?.avatar || 'https://i.pravatar.cc/300?u=unknown',
      },
    }));
};

export const createCommentForPost = async (postId, userId, content) => {
  const cleanContent = cleanText(content);

  if (!postId || !userId) {
    throw createStorageError('INVALID_INPUT', 'Thông tin comment không hợp lệ.');
  }

  if (!cleanContent) {
    throw createStorageError('EMPTY_COMMENT', 'Nội dung comment không được để trống.');
  }

  await initializeLocalDatabase();
  const posts = await readPosts();
  const users = await readUsers();

  if (!posts.some((post) => post.id === postId)) {
    throw createStorageError('POST_NOT_FOUND', 'Bài viết không tồn tại.');
  }

  if (!users.some((user) => user.id === userId)) {
    throw createStorageError('USER_NOT_FOUND', 'Tài khoản không tồn tại.');
  }

  const comments = await readComments();

  const nextComment = {
    id: createId('comment'),
    postId,
    authorId: userId,
    content: cleanContent,
    createdAt: getNowIso(),
  };

  await writeComments([...comments, nextComment]);
};

export const getGlobalFeedWithComments = async () => {
  await initializeLocalDatabase();

  const users = await readUsers();
  const posts = await readPosts();
  const comments = await readComments();

  const userMap = new Map(users.map((user) => [user.id, user]));

  const postCommentMap = new Map();

  comments
    .slice()
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))
    .forEach((comment) => {
      if (!postCommentMap.has(comment.postId)) {
        postCommentMap.set(comment.postId, []);
      }

      const author = userMap.get(comment.authorId);

      postCommentMap.get(comment.postId).push({
        id: comment.id,
        postId: comment.postId,
        authorId: comment.authorId,
        content: comment.content,
        createdAt: comment.createdAt,
        author: {
          id: comment.authorId,
          name: author?.name || 'Người dùng',
          username: author?.username || '@user',
          avatar: author?.avatar || 'https://i.pravatar.cc/300?u=unknown',
        },
      });
    });

  return posts
    .slice()
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .map((post) => {
      const author = userMap.get(post.authorId);

      return {
        id: post.id,
        caption: post.caption,
        image: post.image,
        createdAt: post.createdAt,
        authorId: post.authorId,
        author: {
          id: post.authorId,
          name: author?.name || 'Người dùng',
          username: author?.username || '@user',
          avatar: author?.avatar || 'https://i.pravatar.cc/300?u=unknown',
        },
        comments: postCommentMap.get(post.id) || [],
      };
    });
};

export const updateUserProfile = async (userId, profilePatch) => {
  if (!userId) {
    throw createStorageError('INVALID_USER', 'Không xác định được người dùng.');
  }

  await initializeLocalDatabase();
  const users = await readUsers();

  const userIndex = users.findIndex((user) => user.id === userId);

  if (userIndex < 0) {
    throw createStorageError('USER_NOT_FOUND', 'Tài khoản không tồn tại.');
  }

  const currentUser = users[userIndex];

  const nextName =
    profilePatch?.name !== undefined ? cleanText(profilePatch.name) : cleanText(currentUser.name);

  if (!nextName) {
    throw createStorageError('INVALID_NAME', 'Tên hiển thị không hợp lệ.');
  }

  const updatedUser = {
    ...currentUser,
    name: nextName,
    avatar:
      profilePatch?.avatar !== undefined
        ? cleanText(profilePatch.avatar) || cleanText(currentUser.avatar)
        : cleanText(currentUser.avatar),
    bio:
      profilePatch?.bio !== undefined
        ? cleanOptionalText(profilePatch.bio, DEFAULT_BIO)
        : cleanOptionalText(currentUser.bio, DEFAULT_BIO),
    phone:
      profilePatch?.phone !== undefined
        ? cleanOptionalText(profilePatch.phone)
        : cleanOptionalText(currentUser.phone),
    birthday:
      profilePatch?.birthday !== undefined
        ? cleanOptionalText(profilePatch.birthday)
        : cleanOptionalText(currentUser.birthday),
    address:
      profilePatch?.address !== undefined
        ? cleanOptionalText(profilePatch.address)
        : cleanOptionalText(currentUser.address),
    updatedAt: getNowIso(),
  };

  users[userIndex] = updatedUser;
  await writeUsers(users);

  return getUserProfileById(userId);
};

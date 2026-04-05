import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { ADMIN_ACCOUNT, BLOG_IMAGES } from '../data/blogData';

const DATABASE_NAME = 'se346-local.db';

const LEGACY_ACCOUNTS_STORAGE_KEY = '@se346/accounts';
const LEGACY_POSTS_STORAGE_KEY = '@se346/posts';
const MIGRATION_META_KEY = 'migrated_asyncstorage_to_sqlite';

const DEFAULT_PLACEHOLDER = 'Chưa cập nhật';
const DEFAULT_BIO = 'Người dùng đang xây dựng blog cá nhân.';

let databasePromise = null;
let initializationPromise = null;

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const createStorageError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

export const normalizeCredential = (value = '') =>
  String(value).trim().toLowerCase();

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

const getNowIso = () => new Date().toISOString();

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getDatabaseAsync = async () => {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
};

const slugify = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();

const mapPostRow = (row) => ({
  id: row.id,
  caption: row.caption,
  image: row.image,
  createdAt: row.created_at,
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

  const fallbackDate = new Date(Date.now() - index * 60 * 60 * 1000);
  return fallbackDate.toISOString();
};

const upsertUserRow = async (db, user) => {
  await db.runAsync(
    `
      INSERT INTO users (
        id, role, name, username, email, password, avatar, bio, phone, birthday, address, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        role = excluded.role,
        name = excluded.name,
        username = excluded.username,
        email = excluded.email,
        password = excluded.password,
        avatar = excluded.avatar,
        bio = excluded.bio,
        phone = excluded.phone,
        birthday = excluded.birthday,
        address = excluded.address,
        updated_at = excluded.updated_at
    `,
    [
      user.id,
      user.role,
      user.name,
      user.username,
      user.email,
      user.password,
      user.avatar,
      user.bio,
      user.phone,
      user.birthday,
      user.address,
      user.created_at,
      user.updated_at,
    ]
  );
};

const savePostsForUser = async (db, userId, posts) => {
  if (!Array.isArray(posts)) {
    return;
  }

  await db.runAsync('DELETE FROM posts WHERE author_id = ?', [userId]);

  for (let index = 0; index < posts.length; index += 1) {
    const post = posts[index];
    const caption = cleanText(post?.caption);

    if (!caption) {
      continue;
    }

    const createdAt = toLegacyPostCreatedAt(post, index);
    const image = cleanText(post?.image) || BLOG_IMAGES[index % BLOG_IMAGES.length];
    const id = cleanText(post?.id) || createId('post');

    await db.runAsync(
      `
        INSERT OR REPLACE INTO posts (id, author_id, caption, image, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [id, userId, caption, image, createdAt, createdAt]
    );
  }
};

const createTablesAsync = async (db) => {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      avatar TEXT NOT NULL,
      bio TEXT NOT NULL,
      phone TEXT NOT NULL,
      birthday TEXT NOT NULL,
      address TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY NOT NULL,
      author_id TEXT NOT NULL,
      caption TEXT NOT NULL,
      image TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY NOT NULL,
      post_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at ASC);
  `);
};

const seedAdminIfNeededAsync = async (db) => {
  const now = getNowIso();
  const adminUser = {
    id: ADMIN_ACCOUNT.id,
    role: ADMIN_ACCOUNT.role || 'admin',
    name: cleanText(ADMIN_ACCOUNT.name) || 'Admin',
    username: cleanText(ADMIN_ACCOUNT.username) || '@admin',
    email: cleanText(ADMIN_ACCOUNT.email) || 'admin',
    password: cleanText(ADMIN_ACCOUNT.password) || 'admin',
    avatar: cleanText(ADMIN_ACCOUNT.avatar) || `https://i.pravatar.cc/300?u=admin`,
    bio: cleanOptionalText(ADMIN_ACCOUNT.bio, DEFAULT_BIO),
    phone: cleanOptionalText(ADMIN_ACCOUNT.phone),
    birthday: cleanOptionalText(ADMIN_ACCOUNT.birthday),
    address: cleanOptionalText(ADMIN_ACCOUNT.address),
    created_at: now,
    updated_at: now,
  };

  await upsertUserRow(db, adminUser);

  const adminPostCountRow = await db.getFirstAsync(
    'SELECT COUNT(*) AS count FROM posts WHERE author_id = ?',
    [ADMIN_ACCOUNT.id]
  );
  const adminPostCount = Number(adminPostCountRow?.count ?? 0);

  if (adminPostCount > 0) {
    return;
  }

  const fallbackPosts = Array.isArray(ADMIN_ACCOUNT.posts) ? ADMIN_ACCOUNT.posts : [];
  await savePostsForUser(db, ADMIN_ACCOUNT.id, fallbackPosts);
};

const readLegacyAccountsAsync = async () => {
  const rawValue = await AsyncStorage.getItem(LEGACY_ACCOUNTS_STORAGE_KEY);

  if (!rawValue) {
    return [];
  }

  const parsedValue = safeParseJson(rawValue, []);
  return Array.isArray(parsedValue) ? parsedValue : [];
};

const readLegacyPostBucketsAsync = async () => {
  const rawValue = await AsyncStorage.getItem(LEGACY_POSTS_STORAGE_KEY);

  if (!rawValue) {
    return {};
  }

  const parsedValue = safeParseJson(rawValue, {});
  return isPlainObject(parsedValue) ? parsedValue : {};
};

const normalizeLegacyAccount = (account, index) => {
  const email = normalizeCredential(account?.email);
  const username = cleanText(account?.username);
  const name = cleanText(account?.name);
  const password = cleanText(account?.password);

  if (!email || !username || !name || !password) {
    return null;
  }

  const id = cleanText(account?.id) || `legacy-user-${index}`;
  const now = getNowIso();

  return {
    id,
    role: cleanText(account?.role) || 'user',
    name,
    username,
    email,
    password,
    avatar:
      cleanText(account?.avatar) ||
      `https://i.pravatar.cc/300?u=${encodeURIComponent(email || id)}`,
    bio: cleanOptionalText(account?.bio, DEFAULT_BIO),
    phone: cleanOptionalText(account?.phone),
    birthday: cleanOptionalText(account?.birthday),
    address: cleanOptionalText(account?.address),
    created_at: now,
    updated_at: now,
    posts: Array.isArray(account?.posts) ? account.posts : [],
  };
};

const markMigrationDoneAsync = async (db) => {
  await db.runAsync(
    `
      INSERT INTO meta(key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    [MIGRATION_META_KEY, '1']
  );
};

const migrateLegacyAsyncStorageAsync = async (db) => {
  const migratedRow = await db.getFirstAsync(
    'SELECT value FROM meta WHERE key = ?',
    [MIGRATION_META_KEY]
  );

  if (migratedRow?.value === '1') {
    return;
  }

  const legacyAccounts = await readLegacyAccountsAsync();
  const legacyPostBuckets = await readLegacyPostBucketsAsync();

  const normalizedAccounts = legacyAccounts
    .map((account, index) => normalizeLegacyAccount(account, index))
    .filter(Boolean);

  for (const account of normalizedAccounts) {
    await upsertUserRow(db, account);
  }

  const accountMap = new Map(normalizedAccounts.map((account) => [account.id, account]));
  const userIds = new Set([
    ...Object.keys(legacyPostBuckets),
    ...normalizedAccounts.map((account) => account.id),
  ]);

  for (const userId of userIds) {
    const bucketPosts = legacyPostBuckets[userId];
    const accountPosts = accountMap.get(userId)?.posts ?? [];
    const selectedPosts = Array.isArray(bucketPosts)
      ? bucketPosts
      : Array.isArray(accountPosts)
        ? accountPosts
        : [];

    if (!Array.isArray(selectedPosts) || selectedPosts.length === 0) {
      continue;
    }

    await savePostsForUser(db, userId, selectedPosts);
  }

  await markMigrationDoneAsync(db);
};

const ensureUniqueEmailAsync = async (db, email, ignoreId = null) => {
  const existing = await db.getFirstAsync(
    'SELECT id FROM users WHERE lower(email) = ? LIMIT 1',
    [normalizeCredential(email)]
  );

  if (existing && existing.id !== ignoreId) {
    throw createStorageError('DUPLICATE_EMAIL', 'Email đã tồn tại.');
  }
};

const ensureUniqueUsernameAsync = async (db, username, ignoreId = null) => {
  const existing = await db.getFirstAsync(
    'SELECT id FROM users WHERE lower(username) = ? LIMIT 1',
    [normalizeCredential(username)]
  );

  if (existing && existing.id !== ignoreId) {
    throw createStorageError('DUPLICATE_USERNAME', 'Tên đăng nhập đã tồn tại.');
  }
};

const buildUsernameCandidate = (name, email) => {
  const usernameSeed = slugify(name) || slugify(email.split('@')[0]) || 'user';
  return `@${usernameSeed}`;
};

const readUserPostsAsync = async (db, userId) => {
  const rows = await db.getAllAsync(
    `
      SELECT id, caption, image, created_at
      FROM posts
      WHERE author_id = ?
      ORDER BY created_at DESC
    `,
    [userId]
  );

  return rows.map(mapPostRow);
};

export const initializeLocalDatabase = async () => {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const db = await getDatabaseAsync();
      await createTablesAsync(db);
      await seedAdminIfNeededAsync(db);
      await migrateLegacyAsyncStorageAsync(db);
      return db;
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  await initializationPromise;
};

export const getUserProfileById = async (userId) => {
  if (!userId) {
    return null;
  }

  await initializeLocalDatabase();
  const db = await getDatabaseAsync();

  const userRow = await db.getFirstAsync('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);

  if (!userRow) {
    return null;
  }

  const posts = await readUserPostsAsync(db, userId);

  return {
    ...mapUserRow(userRow),
    posts,
  };
};

export const loginWithIdentifier = async (identifier, password) => {
  const cleanIdentifier = normalizeCredential(identifier);
  const cleanPassword = cleanText(password);

  if (!cleanIdentifier || !cleanPassword) {
    throw createStorageError('INVALID_INPUT', 'Identifier and password are required.');
  }

  await initializeLocalDatabase();
  const db = await getDatabaseAsync();

  const userRow = await db.getFirstAsync(
    `
      SELECT *
      FROM users
      WHERE lower(email) = ? OR lower(username) = ? OR lower(replace(username, '@', '')) = ?
      LIMIT 1
    `,
    [cleanIdentifier, cleanIdentifier, cleanIdentifier]
  );

  if (!userRow || cleanText(userRow.password) !== cleanPassword) {
    throw createStorageError('INVALID_CREDENTIALS', 'Tài khoản hoặc mật khẩu không đúng.');
  }

  return getUserProfileById(userRow.id);
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
  const db = await getDatabaseAsync();

  await ensureUniqueEmailAsync(db, cleanEmail);

  const username = buildUsernameCandidate(cleanName, cleanEmail);
  await ensureUniqueUsernameAsync(db, username);

  const now = getNowIso();
  const userId = createId('user');

  await db.runAsync(
    `
      INSERT INTO users (
        id, role, name, username, email, password, avatar, bio, phone, birthday, address, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      'user',
      cleanName,
      username,
      cleanEmail,
      cleanPassword,
      `https://i.pravatar.cc/300?u=${encodeURIComponent(cleanEmail)}`,
      `${cleanName} vừa tạo blog cá nhân trên ứng dụng.`,
      DEFAULT_PLACEHOLDER,
      DEFAULT_PLACEHOLDER,
      DEFAULT_PLACEHOLDER,
      now,
      now,
    ]
  );

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
  const db = await getDatabaseAsync();

  const userRow = await db.getFirstAsync('SELECT id, email FROM users WHERE id = ? LIMIT 1', [userId]);

  if (!userRow) {
    throw createStorageError('USER_NOT_FOUND', 'Tài khoản không tồn tại.');
  }

  const createdAt = getNowIso();

  await db.runAsync(
    `
      INSERT INTO posts (id, author_id, caption, image, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      createId('post'),
      userId,
      cleanCaption,
      cleanImage || `https://i.pravatar.cc/600?u=${encodeURIComponent(userRow.email || userId)}`,
      createdAt,
      createdAt,
    ]
  );
};

export const getCommentsByPost = async (postId) => {
  if (!postId) {
    return [];
  }

  await initializeLocalDatabase();
  const db = await getDatabaseAsync();

  const rows = await db.getAllAsync(
    `
      SELECT
        c.id,
        c.post_id,
        c.author_id,
        c.content,
        c.created_at,
        u.name AS author_name,
        u.username AS author_username,
        u.avatar AS author_avatar
      FROM comments c
      JOIN users u ON u.id = c.author_id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `,
    [postId]
  );

  return rows.map((row) => ({
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    content: row.content,
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      name: row.author_name,
      username: row.author_username,
      avatar: row.author_avatar,
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
  const db = await getDatabaseAsync();

  const postExists = await db.getFirstAsync('SELECT id FROM posts WHERE id = ? LIMIT 1', [postId]);
  if (!postExists) {
    throw createStorageError('POST_NOT_FOUND', 'Bài viết không tồn tại.');
  }

  const userExists = await db.getFirstAsync('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!userExists) {
    throw createStorageError('USER_NOT_FOUND', 'Tài khoản không tồn tại.');
  }

  await db.runAsync(
    `
      INSERT INTO comments (id, post_id, author_id, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    [createId('comment'), postId, userId, cleanContent, getNowIso()]
  );
};

export const getGlobalFeedWithComments = async () => {
  await initializeLocalDatabase();
  const db = await getDatabaseAsync();

  const postRows = await db.getAllAsync(
    `
      SELECT
        p.id,
        p.author_id,
        p.caption,
        p.image,
        p.created_at,
        u.name AS author_name,
        u.username AS author_username,
        u.avatar AS author_avatar
      FROM posts p
      JOIN users u ON u.id = p.author_id
      ORDER BY p.created_at DESC
    `
  );

  const commentRows = await db.getAllAsync(
    `
      SELECT
        c.id,
        c.post_id,
        c.author_id,
        c.content,
        c.created_at,
        u.name AS author_name,
        u.username AS author_username,
        u.avatar AS author_avatar
      FROM comments c
      JOIN users u ON u.id = c.author_id
      ORDER BY c.created_at ASC
    `
  );

  const commentMap = new Map();

  for (const row of commentRows) {
    const nextComment = {
      id: row.id,
      postId: row.post_id,
      authorId: row.author_id,
      content: row.content,
      createdAt: row.created_at,
      author: {
        id: row.author_id,
        name: row.author_name,
        username: row.author_username,
        avatar: row.author_avatar,
      },
    };

    if (!commentMap.has(row.post_id)) {
      commentMap.set(row.post_id, []);
    }

    commentMap.get(row.post_id).push(nextComment);
  }

  return postRows.map((row) => ({
    id: row.id,
    caption: row.caption,
    image: row.image,
    createdAt: row.created_at,
    authorId: row.author_id,
    author: {
      id: row.author_id,
      name: row.author_name,
      username: row.author_username,
      avatar: row.author_avatar,
    },
    comments: commentMap.get(row.id) ?? [],
  }));
};

export const updateUserProfile = async (userId, profilePatch) => {
  if (!userId) {
    throw createStorageError('INVALID_USER', 'Không xác định được người dùng.');
  }

  await initializeLocalDatabase();
  const db = await getDatabaseAsync();

  const currentUser = await db.getFirstAsync('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);

  if (!currentUser) {
    throw createStorageError('USER_NOT_FOUND', 'Tài khoản không tồn tại.');
  }

  const nextName =
    profilePatch?.name !== undefined
      ? cleanText(profilePatch.name)
      : cleanText(currentUser.name);

  if (!nextName) {
    throw createStorageError('INVALID_NAME', 'Tên hiển thị không hợp lệ.');
  }

  const nextBio =
    profilePatch?.bio !== undefined
      ? cleanOptionalText(profilePatch.bio, DEFAULT_BIO)
      : cleanOptionalText(currentUser.bio, DEFAULT_BIO);
  const nextPhone =
    profilePatch?.phone !== undefined
      ? cleanOptionalText(profilePatch.phone)
      : cleanOptionalText(currentUser.phone);
  const nextBirthday =
    profilePatch?.birthday !== undefined
      ? cleanOptionalText(profilePatch.birthday)
      : cleanOptionalText(currentUser.birthday);
  const nextAddress =
    profilePatch?.address !== undefined
      ? cleanOptionalText(profilePatch.address)
      : cleanOptionalText(currentUser.address);
  const nextAvatar =
    profilePatch?.avatar !== undefined
      ? cleanText(profilePatch.avatar) || cleanText(currentUser.avatar)
      : cleanText(currentUser.avatar);

  await db.runAsync(
    `
      UPDATE users
      SET
        name = ?,
        avatar = ?,
        bio = ?,
        phone = ?,
        birthday = ?,
        address = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [nextName, nextAvatar, nextBio, nextPhone, nextBirthday, nextAddress, getNowIso(), userId]
  );

  return getUserProfileById(userId);
};

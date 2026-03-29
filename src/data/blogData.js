export const BLOG_IMAGES = [
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80',
];

const sanitizeValue = (value = '') => value.trim();

const slugify = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();

const pickImage = (seed = '') => {
  const index = seed.length % BLOG_IMAGES.length;
  return BLOG_IMAGES[index];
};

const padTime = (value) => String(value).padStart(2, '0');

const formatAbsoluteDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Vừa xong';
  }

  return `${padTime(date.getDate())}/${padTime(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export const getPostDisplayTime = (post) => {
  if (post?.createdAt) {
    const createdTime = new Date(post.createdAt).getTime();

    if (!Number.isNaN(createdTime)) {
      const minutes = Math.max(0, Math.floor((Date.now() - createdTime) / 60000));

      if (minutes < 1) {
        return 'Vừa xong';
      }

      if (minutes < 60) {
        return `${minutes} phút trước`;
      }

      const hours = Math.floor(minutes / 60);

      if (hours < 24) {
        return `${hours} giờ trước`;
      }

      const days = Math.floor(hours / 24);

      if (days < 7) {
        return `${days} ngày trước`;
      }

      return formatAbsoluteDate(createdTime);
    }
  }

  return post?.time || 'Vừa xong';
};

export const getFallbackBlogImage = (seed = '') => pickImage(seed);

export const ADMIN_ACCOUNT = {
  id: 'admin',
  role: 'admin',
  name: 'Minh Quân Phạm',
  username: '@admin',
  email: 'admin',
  password: 'admin',
  avatar: 'https://i.pravatar.cc/300?img=12',
  bio: 'Đây là blog riêng của admin.',
  phone: '0985512831',
  birthday: '2006-10-25',
  address: 'TP. Hồ Chí Minh, Việt Nam',
  posts: [
    {
      id: 'admin-post-1',
      time: '45 phút trước',
      caption: 'Cuối tuần nhẹ nhàng, làm ly cà phê rồi bắt đầu ngày mới.',
      image: BLOG_IMAGES[0],
    },
    {
      id: 'admin-post-2',
      time: '2 giờ trước',
      caption: 'Sáng nay trời mát, đi bộ một vòng thấy nhẹ đầu hẳn.',
      image: BLOG_IMAGES[1],
    },
    {
      id: 'admin-post-3',
      time: '1 ngày trước',
      caption: 'Một góc cà phê yên tĩnh, vừa làm bài vừa nghe nhạc chill.',
      image: BLOG_IMAGES[2],
    },
  ],
};

export const createLocalUserAccount = ({ name, email, password }) => {
  const cleanName = sanitizeValue(name);
  const cleanEmail = sanitizeValue(email).toLowerCase();
  const usernameSeed = slugify(cleanName) || slugify(cleanEmail.split('@')[0]) || 'user';
  const username = `@${usernameSeed}`;
  const avatar = `https://i.pravatar.cc/300?u=${encodeURIComponent(cleanEmail)}`;
  const welcomeImage = pickImage(cleanEmail);
  const secondImage = pickImage(`${cleanEmail}${cleanName}`);
  const timestamp = Date.now();

  return {
    id: `user-${timestamp}`,
    role: 'user',
    name: cleanName,
    username,
    email: cleanEmail,
    password,
    avatar,
    bio: `${cleanName} vừa tạo blog cá nhân trên ứng dụng.`,
    phone: 'Chưa cập nhật',
    birthday: 'Chưa cập nhật',
    address: 'Chưa cập nhật',
    posts: [
      {
        id: `post-${timestamp}-1`,
        time: 'Vừa xong',
        caption: `Xin chào, mình là ${cleanName}. Đây là bài viết đầu tiên trên blog của mình.`,
        image: welcomeImage,
      },
      {
        id: `post-${timestamp}-2`,
        time: 'Hôm nay',
        caption: 'Mục tiêu của mình là chia sẻ thêm nhiều bài viết hay trong thời gian tới.',
        image: secondImage,
      },
    ],
  };
};

export const createLocalPost = ({ caption, image, authorName, seed = '' }) => {
  const createdAt = new Date().toISOString();
  const cleanCaption = sanitizeValue(caption);
  const cleanImage = sanitizeValue(image);
  const identitySeed = `${seed}${authorName}${createdAt}`;

  return {
    id: `post-${Date.now()}`,
    caption: cleanCaption,
    image: cleanImage || pickImage(identitySeed),
    createdAt,
    time: 'Vừa xong',
  };
};

export const getBlogDataForUser = (user) => {
  const profile = user ?? ADMIN_ACCOUNT;
  const posts = Array.isArray(profile.posts) ? profile.posts : [];

  return {
    profile,
    featuredPost: posts[0] ?? null,
    posts: posts.slice(1),
  };
};

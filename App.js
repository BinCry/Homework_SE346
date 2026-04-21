import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FeedScreen from './src/screens/FeedScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';
import {
  createCommentForPost,
  deletePostById,
  createPostForUser,
  getGlobalFeedWithComments,
  getUserProfileById,
  initializeLocalDatabase,
  updateUserProfile,
} from './src/storage/localDatabase';

const APP_TABS = [
  { key: 'feed', label: 'Trang chủ' },
  { key: 'explore', label: 'Khám phá' },
  { key: 'create', label: 'Tạo bài' },
  { key: 'profile', label: 'Hồ sơ' },
];

function TabBar({ activeTab, onChange }) {
  return (
    <View style={styles.tabBar}>
      {APP_TABS.map((tab) => {
        const isActive = tab.key === activeTab;

        return (
          <Pressable
            key={tab.key}
            style={[styles.tabItem, isActive && styles.tabItemActive]}
            onPress={() => onChange(tab.key)}
          >
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function LoadingScreen() {
  return (
    <SafeAreaView style={styles.loadingSafeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#EEF1F6" />
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.loadingText}>Đang tải dữ liệu local của bạn...</Text>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [authScreen, setAuthScreen] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [lastIdentifier, setLastIdentifier] = useState('');
  const [activeTab, setActiveTab] = useState('feed');
  const [feedItems, setFeedItems] = useState([]);
  const [isInitializingDatabase, setIsInitializingDatabase] = useState(true);
  const [isHydratingUser, setIsHydratingUser] = useState(false);

  useEffect(() => {
    let mounted = true;

    const bootstrapDatabase = async () => {
      try {
        await initializeLocalDatabase();
      } finally {
        if (mounted) {
          setIsInitializingDatabase(false);
        }
      }
    };

    bootstrapDatabase();

    return () => {
      mounted = false;
    };
  }, []);

  const refreshFeed = useCallback(async () => {
    const nextFeed = await getGlobalFeedWithComments();
    setFeedItems(nextFeed);
    return nextFeed;
  }, []);

  const refreshCurrentUser = useCallback(async (userId) => {
    if (!userId) {
      return null;
    }

    const nextUser = await getUserProfileById(userId);

    if (nextUser) {
      setCurrentUser(nextUser);
    }

    return nextUser;
  }, []);

  const currentScreen = useMemo(() => {
    if (!currentUser) {
      return null;
    }

    if (activeTab === 'explore') {
      return (
        <ExploreScreen
          currentUser={currentUser}
          onOpenFeed={() => setActiveTab('feed')}
          onOpenCreate={() => setActiveTab('create')}
          onOpenProfile={() => setActiveTab('profile')}
        />
      );
    }

    if (activeTab === 'create') {
      return (
        <CreatePostScreen
          currentUser={currentUser}
          onOpenFeed={() => setActiveTab('feed')}
          onCreatePost={async ({ caption, image }) => {
            await createPostForUser(currentUser.id, { caption, image });
            await Promise.all([refreshFeed(), refreshCurrentUser(currentUser.id)]);
          }}
        />
      );
    }

    if (activeTab === 'profile') {
      return (
        <ProfileScreen
          currentUser={currentUser}
          onOpenFeed={() => setActiveTab('feed')}
          onOpenCreate={() => setActiveTab('create')}
          onUpdateProfile={async (profilePatch) => {
            const updatedUser = await updateUserProfile(currentUser.id, profilePatch);
            setCurrentUser(updatedUser);
            await refreshFeed();
          }}
          onLogout={() => {
            setLastIdentifier(currentUser?.email ?? '');
            setCurrentUser(null);
            setFeedItems([]);
            setActiveTab('feed');
            setAuthScreen('login');
          }}
        />
      );
    }

    return (
      <FeedScreen
        currentUser={currentUser}
        feedItems={feedItems}
        onCreateComment={async ({ postId, content }) => {
          await createCommentForPost(postId, currentUser.id, content);
          await refreshFeed();
        }}
        onDeletePost={async (postId) => {
          await deletePostById(postId, currentUser?.email);
          await Promise.all([refreshFeed(), refreshCurrentUser(currentUser.id)]);
        }}
        onOpenProfile={() => setActiveTab('profile')}
        onOpenCreate={() => setActiveTab('create')}
      />
    );
  }, [activeTab, currentUser, feedItems, refreshCurrentUser, refreshFeed]);

  const handleLoginSuccess = async (user) => {
    setIsHydratingUser(true);

    try {
      const hydratedUser = await getUserProfileById(user.id);
      setCurrentUser(hydratedUser ?? user);
      await refreshFeed();
      setActiveTab('feed');
      setAuthScreen('app');
    } finally {
      setIsHydratingUser(false);
    }
  };

  if (authScreen === 'register') {
    return (
      <RegisterScreen
        onSwitchToLogin={() => setAuthScreen('login')}
        onRegisterSuccess={(newUser) => {
          setLastIdentifier(newUser.email);
          setAuthScreen('login');
        }}
      />
    );
  }

  if (isInitializingDatabase || isHydratingUser) {
    return <LoadingScreen />;
  }

  if (authScreen === 'app' && currentUser) {
    return (
      <SafeAreaView style={styles.appShell}>
        <StatusBar barStyle="dark-content" backgroundColor="#F4F4F6" />
        <View style={styles.screenWrap}>{currentScreen}</View>
        <TabBar activeTab={activeTab} onChange={setActiveTab} />
      </SafeAreaView>
    );
  }

  return (
    <LoginScreen
      initialIdentifier={lastIdentifier}
      onSwitchToRegister={() => setAuthScreen('register')}
      onLoginSuccess={handleLoginSuccess}
    />
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: '#F4F4F6',
  },
  screenWrap: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tabItem: {
    flex: 1,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  tabItemActive: {
    backgroundColor: '#E5ECF6',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#111827',
  },
  loadingSafeArea: {
    flex: 1,
    backgroundColor: '#EEF1F6',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#334155',
    fontWeight: '600',
    textAlign: 'center',
  },
});


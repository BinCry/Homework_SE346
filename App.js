import React, { useState } from 'react';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import FeedScreen from './src/screens/FeedScreen';

export default function App() {
  const [authScreen, setAuthScreen] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [lastIdentifier, setLastIdentifier] = useState('admin');

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

  if (authScreen === 'feed') {
    return (
      <FeedScreen
        currentUser={currentUser}
        onOpenProfile={() => setAuthScreen('profile')}
      />
    );
  }

  if (authScreen === 'profile') {
    return (
      <ProfileScreen
        currentUser={currentUser}
        onBack={() => setAuthScreen('feed')}
        onLogout={() => {
          setLastIdentifier(currentUser?.role === 'admin' ? 'admin' : currentUser?.email ?? '');
          setCurrentUser(null);
          setAuthScreen('login');
        }}
      />
    );
  }

  return (
    <LoginScreen
      initialIdentifier={lastIdentifier}
      onSwitchToRegister={() => setAuthScreen('register')}
      onLoginSuccess={(user) => {
        setCurrentUser(user);
        setAuthScreen('feed');
      }}
    />
  );
}

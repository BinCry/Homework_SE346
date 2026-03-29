import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { ADMIN_ACCOUNT } from '../data/blogData';
import {
  findAccountByIdentifier,
  getStoredAccounts,
  normalizeCredential,
} from '../storage/accountStorage';

const BASE_WIDTH = 375;

const getScale = (screenWidth, size) => {
  const ratio = screenWidth / BASE_WIDTH;
  const scaled = size * ratio;
  return Math.max(size * 0.85, Math.min(scaled, size * 1.25));
};

const cardShadowStyle =
  Platform.OS === 'web'
    ? {
        boxShadow: '0px 10px 18px rgba(18, 24, 38, 0.1)',
      }
    : {
        shadowColor: '#121826',
        shadowOpacity: 0.1,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6,
      };

export default function LoginScreen({
  initialIdentifier = 'admin',
  onSwitchToRegister = () => { },
  onLoginSuccess = () => { },
}) {
  const { width, height } = useWindowDimensions();
  const [identifier, setIdentifier] = useState(initialIdentifier || 'admin');
  const [password, setPassword] = useState(
    normalizeCredential(initialIdentifier) === 'admin' ? 'admin' : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIdentifier(initialIdentifier || 'admin');
    setPassword(normalizeCredential(initialIdentifier) === 'admin' ? 'admin' : '');
  }, [initialIdentifier]);

  const s = useMemo(
    () => ({
      spacingXs: getScale(width, 8),
      spacingSm: getScale(width, 12),
      spacingMd: getScale(width, 16),
      spacingLg: getScale(width, 24),
      spacingXl: getScale(width, 32),
      radiusMd: getScale(width, 14),
      radiusLg: getScale(width, 18),
      titleSize: getScale(width, 46),
      bodySize: getScale(width, 16),
      labelSize: getScale(width, 24),
      buttonSize: getScale(width, 28),
      inputHeight: getScale(width, 54),
    }),
    [width]
  );

  const styles = useMemo(
    () => createStyles(s, width, height),
    [s, width, height]
  );

  const handleLogin = async () => {
    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();

    if (!cleanIdentifier || !cleanPassword) {
      Alert.alert('Thông báo', 'Vui lòng nhập tài khoản và mật khẩu.');
      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedIdentifier = normalizeCredential(cleanIdentifier);

      if (
        (normalizedIdentifier === 'admin' || normalizedIdentifier === '@admin') &&
        cleanPassword === ADMIN_ACCOUNT.password
      ) {
        onLoginSuccess(ADMIN_ACCOUNT);
        return;
      }

      const storedAccounts = await getStoredAccounts();
      const matchedAccount = findAccountByIdentifier(storedAccounts, cleanIdentifier);

      if (!matchedAccount || matchedAccount.password !== cleanPassword) {
        Alert.alert('Đăng nhập thất bại', 'Tài khoản hoặc mật khẩu không đúng.');
        return;
      }

      onLoginSuccess(matchedAccount);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#EEF1F6" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContainer}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Đăng nhập</Text>

            <View style={styles.section}>
              <Text style={styles.label}>Email/Tên đăng nhập</Text>
              <TextInput
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="tenban@email.com"
                placeholderTextColor="#7B8494"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Mật khẩu</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="********"
                placeholderTextColor="#7B8494"
                secureTextEntry
                multiline={false}
                textAlignVertical="center"
                style={[styles.input, styles.passwordInput]}
              />
              <Pressable hitSlop={10} style={styles.forgotWrap}>
                <Text style={styles.forgotText}>Quên mật khẩu?</Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              disabled={isSubmitting}
              onPress={handleLogin}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Đăng nhập</Text>
              )}
            </Pressable>

            <View style={styles.switchWrap}>
              <Text style={styles.switchText}>
                {'Chưa có tài khoản?'}
              </Text>
              <Pressable hitSlop={10} onPress={onSwitchToRegister}>
                <Text style={styles.switchAction}>Đăng ký</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (s, width, height) => {
  const sidePadding = Math.max(16, width * 0.07);
  const cardMaxWidth = 460;
  const topSpace = height < 700 ? s.spacingLg : s.spacingXl;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#EEF1F6',
    },
    flex: {
      flex: 1,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: sidePadding,
      paddingVertical: topSpace,
    },
    card: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: cardMaxWidth,
      backgroundColor: '#FFFFFF',
      borderRadius: s.radiusLg,
      borderWidth: 1.5,
      borderColor: '#D5DBE6',
      paddingHorizontal: s.spacingLg,
      paddingVertical: s.spacingXl,
      ...cardShadowStyle,
    },
    title: {
      fontSize: s.titleSize,
      fontWeight: '800',
      color: '#102228',
      textAlign: 'center',
      marginBottom: s.spacingXl,
      letterSpacing: 0.3,
    },
    section: {
      marginBottom: s.spacingLg,
    },
    label: {
      fontSize: s.bodySize,
      fontWeight: '700',
      color: '#101828',
      marginBottom: s.spacingSm,
    },
    input: {
      height: s.inputHeight,
      borderWidth: 1.5,
      borderColor: '#C7D0DE',
      borderRadius: s.radiusMd,
      backgroundColor: '#F8FAFD',
      paddingHorizontal: s.spacingMd,
      paddingVertical: 0,
      textAlignVertical: 'center',
      includeFontPadding: false,
      fontSize: s.bodySize,
      lineHeight: Math.round(s.bodySize * 1.2),
      color: '#111827',
    },
    passwordInput: {
      paddingTop: Platform.OS === 'android' ? 9 : 0,
      paddingBottom: Platform.OS === 'android' ? 1 : 0,
      lineHeight: Platform.OS === 'android' ? getScale(width, 20) : Math.round(s.bodySize * 1.2),
    },
    forgotWrap: {
      marginTop: s.spacingSm,
      alignSelf: 'flex-start',
    },
    forgotText: {
      fontSize: getScale(width, 14),
      fontWeight: '600',
      color: '#3E4C66',
    },
    button: {
      alignSelf: 'center',
      marginTop: s.spacingSm,
      minWidth: getScale(width, 170),
      height: getScale(width, 56),
      borderRadius: s.radiusMd,
      paddingHorizontal: s.spacingXl,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#0F172A',
      backgroundColor: '#111827',
    },
    buttonDisabled: {
      opacity: 0.75,
    },
    buttonText: {
      fontSize: s.buttonSize,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },
    switchWrap: {
      marginTop: s.spacingMd,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: getScale(width, 6),
    },
    switchText: {
      fontSize: getScale(width, 14),
      fontWeight: '500',
      color: '#3E4C66',
    },
    switchAction: {
      fontSize: getScale(width, 14),
      fontWeight: '700',
      color: '#111827',
      textDecorationLine: 'underline',
    },
  });
};

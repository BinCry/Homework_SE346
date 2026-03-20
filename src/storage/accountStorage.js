import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCOUNTS_STORAGE_KEY = '@se346/accounts';

export const normalizeCredential = (value = '') => value.trim().toLowerCase();

export const getStoredAccounts = async () => {
  try {
    const rawValue = await AsyncStorage.getItem(ACCOUNTS_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (error) {
    return [];
  }
};

export const saveStoredAccounts = async (accounts) => {
  await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
};

export const findAccountByIdentifier = (accounts, identifier) => {
  const normalizedIdentifier = normalizeCredential(identifier);

  return accounts.find((account) => {
    const username = account.username?.replace(/^@/, '') ?? '';
    const candidates = [
      account.email,
      account.username,
      username,
    ];

    return candidates.some(
      (candidate) => normalizeCredential(candidate) === normalizedIdentifier
    );
  });
};

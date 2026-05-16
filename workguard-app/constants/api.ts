import Constants from 'expo-constants';

const localhost = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';

export const API_BASE_URL = __DEV__
  ? `http://${localhost}:8000`
  : 'http://34.50.8.14:8000';

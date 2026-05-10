import Constants from 'expo-constants';

const localhost = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
export const API_BASE_URL = `http://${localhost}:8000`;

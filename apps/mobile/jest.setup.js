jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-haptics", () => ({ impactAsync: jest.fn(() => Promise.resolve()), notificationAsync: jest.fn(() => Promise.resolve()), selectionAsync: jest.fn(() => Promise.resolve()), ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }));
jest.mock("expo-audio", () => ({ createAudioPlayer: () => ({ play: jest.fn(), seekTo: jest.fn() }), setAudioModeAsync: jest.fn(() => Promise.resolve()) }));
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
jest.mock("lucide-react-native", () => {
  const mockIcon = () => null;
  return new Proxy({ __esModule: true }, { get: (t, k) => (k in t ? t[k] : mockIcon) });
});

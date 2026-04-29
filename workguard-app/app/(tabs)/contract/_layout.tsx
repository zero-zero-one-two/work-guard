import { Stack } from 'expo-router';

export default function ContractStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F6F7F9' },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="analyzing" />
      <Stack.Screen name="result" />
      <Stack.Screen
        name="camera"
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: '#000' },
        }}
      />
    </Stack>
  );
}

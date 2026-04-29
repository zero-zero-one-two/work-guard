import { Stack } from 'expo-router';

import ContractCameraScreen from '../../contract-camera';

export default function ContractCameraRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: '#000' },
        }}
      />
      <ContractCameraScreen />
    </>
  );
}

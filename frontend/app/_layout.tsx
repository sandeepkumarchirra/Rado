import React from 'react';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#1a1a1a' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="auth/signup" />
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/verify" />
      <Stack.Screen name="map/index" />
      <Stack.Screen name="messages/send" />
      <Stack.Screen name="profile/preferences" />
      <Stack.Screen name="profile/settings" />
      <Stack.Screen name="notifications/index" />
    </Stack>
  );
}
import React from 'react';
import { Redirect } from 'expo-router';

export default function LandingScreen() {
  // Redirect to feed which is now the default landing page
  return <Redirect href="/(tabs)/feed" />;
}

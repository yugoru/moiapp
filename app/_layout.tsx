import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

export default function RootLayout() {
  console.log('RootLayout: mounting');
  useFrameworkReady();

  return (
    <>
      <Slot />
      <StatusBar style="auto" />
    </>
  );
}

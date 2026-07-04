import { Stack } from 'expo-router';
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ManagementLayout() {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: isVi ? 'Quan Ly' : 'Management',
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="invoice" 
        options={{ 
          title: isVi ? 'Quan Ly Hoa Don' : 'Invoice Management',
          headerShown: true
        }} 
      />
      <Stack.Screen 
        name="payment-history" 
        options={{ 
          title: isVi ? 'Lich Su Thanh Toan' : 'Payment History',
          headerShown: true
        }} 
      />
      <Stack.Screen 
        name="debt" 
        options={{ 
          title: isVi ? 'Quan Ly Cong No' : 'Debt Management',
          headerShown: true
        }} 
      />
      <Stack.Screen 
        name="rooms" 
        options={{ 
          title: isVi ? 'Quan Ly Thu Chi' : 'Income & Expense Management',
          headerShown: true
        }} 
      />
      <Stack.Screen 
        name="electricity" 
        options={{ 
          title: isVi ? 'Quan Ly Dien' : 'Electricity Management',
          headerShown: true
        }} 
      />
      <Stack.Screen 
        name="shift-handover" 
        options={{ 
          title: isVi ? 'Quan Ly Giao Ca' : 'Shift Handover Management',
          headerShown: true
        }} 
      />
      <Stack.Screen 
        name="fanpage" 
        options={{ 
          title: isVi ? 'Quan Ly Fanpage' : 'Fanpage Management',
          headerShown: true
        }} 
      />
      <Stack.Screen 
        name="ai-chat" 
        options={{ 
          title: isVi ? 'AI Chatbox' : 'AI Chatbox',
          headerShown: true
        }} 
      />
      <Stack.Screen 
        name="zalo" 
        options={{ 
          title: isVi ? 'Quan Ly Zalo OA' : 'Zalo OA Management',
          headerShown: true
        }} 
      />
      <Stack.Screen 
        name="telegram" 
        options={{ 
          title: isVi ? 'Quan Ly Telegram' : 'Telegram Management',
          headerShown: true
        }} 
      />
      <Stack.Screen 
        name="camera" 
        options={{ 
          title: isVi ? 'Quan Ly Camera' : 'Camera Management',
          headerShown: true
        }} 
      />
    </Stack>
  );
}

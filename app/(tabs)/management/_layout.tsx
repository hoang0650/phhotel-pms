import { Stack } from 'expo-router';
import React from 'react';

export default function ManagementLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Quản Lý',
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="invoice" 
        options={{ 
          title: 'Quản Lý Hóa Đơn',
          headerShown: true
        }} 
      />
      <Stack.Screen 
        name="payment-history" 
        options={{ 
          title: 'Lịch Sử Thanh Toán',
          headerShown: true
        }} 
      />
      <Stack.Screen 
        name="debt" 
        options={{ 
          title: 'Quản Lý Công Nợ',
          headerShown: true
        }} 
      />
      <Stack.Screen 
        name="rooms" 
        options={{ 
          title: 'Quản Lý Thu/Chi',
          headerShown: true
        }} 
      />
      <Stack.Screen 
        name="electricity" 
        options={{ 
          title: 'Quản Lý Điện',
          headerShown: true
        }} 
      />
      <Stack.Screen 
        name="shift-handover" 
        options={{ 
          title: 'Quản Lý Giao Ca',
          headerShown: true
        }} 
      />
      <Stack.Screen 
        name="fanpage" 
        options={{ 
          title: 'Quản Lý Fanpage',
          headerShown: true
        }} 
      />
      <Stack.Screen 
        name="ai-chat" 
        options={{ 
          title: 'AI Chatbox',
          headerShown: true
        }} 
      />
    </Stack>
  );
}

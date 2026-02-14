import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface ManagementModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  gradient: string[];
}

const managementModules: ManagementModule[] = [
  {
    id: 'invoice',
    title: 'Quản Lý Hóa Đơn',
    description: 'Tạo và quản lý hóa đơn cho khách hàng',
    icon: 'document-text-outline',
    route: '/management/invoice',
    gradient: ['#FF6B6B', '#FF8E8E']
  },
  {
    id: 'payment-history',
    title: 'Lịch Sử Thanh Toán',
    description: 'Xem lịch sử thanh toán của khách',
    icon: 'time-outline',
    route: '/management/payment-history',
    gradient: ['#4ECDC4', '#44A08D']
  },
  {
    id: 'debt',
    title: 'Quản Lý Công Nợ',
    description: 'Theo dõi và quản lý công nợ',
    icon: 'wallet-outline',
    route: '/management/debt',
    gradient: ['#45B7D1', '#96C93D']
  },
  {
    id: 'rooms',
    title: 'Quản Lý Thu/Chi',
    description: 'Quản lý phiếu thu và chi',
    icon: 'cash-outline',
    route: '/management/rooms',
    gradient: ['#F093FB', '#F5576C']
  },
  {
    id: 'electricity',
    title: 'Quản Lý Điện',
    description: 'Điều khiển thiết bị điện trong phòng',
    icon: 'flash-outline',
    route: '/management/electricity',
    gradient: ['#FFD93D', '#FF6B6B']
  },
  {
    id: 'shift-handover',
    title: 'Quản Lý Giao Ca',
    description: 'Bàn giao ca làm việc và doanh thu',
    icon: 'swap-horizontal-outline',
    route: '/management/shift-handover',
    gradient: ['#5B8DEF', '#6BCBFF']
  },
  {
    id: 'fanpage',
    title: 'Quản Lý Fanpage',
    description: 'Quản lý tin nhắn từ fanpage',
    icon: 'chatbubble-ellipses-outline',
    route: '/management/fanpage',
    gradient: ['#6BCF7F', '#2E8B57']
  },
  {
    id: 'ai-chat',
    title: 'AI Chatbox',
    description: 'Trợ lý AI hỗ trợ khách hàng',
    icon: 'sparkles-outline',
    route: '/management/ai-chat',
    gradient: ['#667eea', '#764ba2']
  }
];

export default function ManagementScreen() {
  const router = useRouter();

  const handleModulePress = (route: string) => {
    router.push(route);
  };

  const renderModule = (module: ManagementModule) => (
    <TouchableOpacity
      key={module.id}
      style={styles.moduleCard}
      onPress={() => handleModulePress(module.route)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={module.gradient}
        style={styles.moduleGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.moduleContent}>
          <Ionicons name={module.icon as any} size={32} color="#FFF" />
          <Text style={styles.moduleTitle}>{module.title}</Text>
          <Text style={styles.moduleDescription}>{module.description}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản Lý Khách Sạn</Text>
        <Text style={styles.headerSubtitle}>Tất cả công cụ quản lý trong một nơi</Text>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.modulesGrid}>
          {managementModules.map(renderModule)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moduleCard: {
    width: '48%',
    marginBottom: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  moduleGradient: {
    borderRadius: 16,
    padding: 20,
  },
  moduleContent: {
    alignItems: 'center',
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 10,
    textAlign: 'center',
  },
  moduleDescription: {
    fontSize: 12,
    color: '#FFF',
    marginTop: 5,
    textAlign: 'center',
    opacity: 0.9,
  },
});

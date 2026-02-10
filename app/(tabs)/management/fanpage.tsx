import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../../contexts/LanguageContext';

interface FacebookMessage {
  id: string;
  sender_id: string;
  sender_name?: string;
  sender_avatar?: string;
  text: string;
  attachments?: Array<{
    type: 'image' | 'video' | 'audio' | 'file';
    payload: { url: string };
  }>;
  direction: 'in' | 'out';
  timestamp: number;
  mid?: string;
  reply_text?: string;
}

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  picture?: { data: { url: string } };
}

interface Conversation {
  sender_id: string;
  sender_name?: string;
  sender_avatar?: string;
  lastText: string;
  lastTime: number;
  unreadCount: number;
}

const MOCK_PAGES: FacebookPage[] = [
  {
    id: '1',
    name: 'Khách Sạn Phương Hoàng',
    access_token: 'mock_token_1',
    category: 'Hotel',
    picture: { data: { url: 'https://via.placeholder.com/150' } },
  },
  {
    id: '2',
    name: 'Resort Paradise',
    access_token: 'mock_token_2',
    category: 'Resort',
    picture: { data: { url: 'https://via.placeholder.com/150' } },
  },
];

const MOCK_MESSAGES: FacebookMessage[] = [
  {
    id: '1',
    sender_id: 'user_123',
    sender_name: 'Nguyễn Văn A',
    sender_avatar: 'https://via.placeholder.com/50',
    text: 'Xin chào, tôi muốn đặt phòng cho cuối tuần này',
    direction: 'in',
    timestamp: Date.now() - 3600000, // 1 hour ago
    mid: 'mid_1',
  },
  {
    id: '2',
    sender_id: 'page_1',
    text: 'Chào anh! Chúng tôi có thể giúp gì cho anh về đặt phòng?',
    direction: 'out',
    timestamp: Date.now() - 3300000, // 55 minutes ago
    mid: 'mid_2',
  },
  {
    id: '3',
    sender_id: 'user_123',
    sender_name: 'Nguyễn Văn A',
    sender_avatar: 'https://via.placeholder.com/50',
    text: 'Tôi cần 1 phòng đôi cho 2 người, từ thứ 6 đến chủ nhật',
    direction: 'in',
    timestamp: Date.now() - 3000000, // 50 minutes ago
    mid: 'mid_3',
  },
  {
    id: '4',
    sender_id: 'user_456',
    sender_name: 'Trần Thị B',
    sender_avatar: 'https://via.placeholder.com/50',
    text: 'Phòng có view biển không ạ?',
    direction: 'in',
    timestamp: Date.now() - 7200000, // 2 hours ago
    mid: 'mid_4',
  },
  {
    id: '5',
    sender_id: 'page_1',
    text: 'Dạ có ạ, chúng tôi có phòng hướng biển rất đẹp',
    direction: 'out',
    timestamp: Date.now() - 6900000, // 1 hour 55 minutes ago
    mid: 'mid_5',
  },
  {
    id: '6',
    sender_id: 'user_789',
    sender_name: 'Lê Văn C',
    sender_avatar: 'https://via.placeholder.com/50',
    text: 'Giá phòng bao nhiêu 1 đêm?',
    direction: 'in',
    timestamp: Date.now() - 10800000, // 3 hours ago
    mid: 'mid_6',
  },
  {
    id: '7',
    sender_id: 'user_789',
    sender_name: 'Lê Văn C',
    sender_avatar: 'https://via.placeholder.com/50',
    attachments: [{
      type: 'image',
      payload: { url: 'https://via.placeholder.com/300x200' }
    }],
    text: 'Tôi gửi ảnh chụp màn hình giá nhé',
    direction: 'in',
    timestamp: Date.now() - 10500000, // 2 hours 55 minutes ago
    mid: 'mid_7',
  },
];

export default function FanpageManagementScreen() {
  const { language } = useLanguage();
  const [pages, setPages] = useState<FacebookPage[]>(MOCK_PAGES);
  const [selectedPageId, setSelectedPageId] = useState<string>('1');
  const [messages, setMessages] = useState<FacebookMessage[]>(MOCK_MESSAGES);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [displayedMessages, setDisplayedMessages] = useState<FacebookMessage[]>([]);
  const [replyText, setReplyText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isBotActive, setIsBotActive] = useState<boolean>(false);
  const [showConversations, setShowConversations] = useState<boolean>(false);
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);

  const translations = {
    vi: {
      title: 'Quản lý Fanpage',
      selectPage: 'Chọn Fanpage',
      aiBot: 'AI Bot',
      on: 'Bật',
      off: 'Tắt',
      refresh: 'Làm mới',
      connect: 'Kết nối',
      connectFanpage: 'Kết nối Fanpage',
      typeMessage: 'Nhập tin nhắn...',
      send: 'Gửi',
      conversations: 'Cuộc hội thoại',
      noConversations: 'Chưa có hội thoại nào',
      selectConversation: 'Chọn một hội thoại để bắt đầu chat',
      confirmDelete: 'Bạn có chắc chắn muốn xóa tin nhắn này?',
      delete: 'Xóa',
      cancel: 'Hủy',
      connectNewFanpage: 'Kết nối Fanpage mới',
      facebookLogin: 'Đăng nhập Facebook',
      pageName: 'Tên Fanpage',
      pageCategory: 'Danh mục',
      connectButton: 'Kết nối',
      connectedPages: 'Fanpage đã kết nối',
      noPages: 'Chưa có Fanpage nào được kết nối',
      addPage: 'Thêm Fanpage',
      disconnect: 'Ngắt kết nối',
      confirmDisconnect: 'Bạn có chắc chắn muốn ngắt kết nối Fanpage này?',
      yesterday: 'Hôm qua',
      today: 'Hôm nay',
      image: 'Hình ảnh',
      video: 'Video',
      audio: 'Âm thanh',
      file: 'Tệp tin',
      attachment: 'Tệp đính kèm',
    },
    en: {
      title: 'Fanpage Management',
      selectPage: 'Select Page',
      aiBot: 'AI Bot',
      on: 'On',
      off: 'Off',
      refresh: 'Refresh',
      connect: 'Connect',
      connectFanpage: 'Connect Fanpage',
      typeMessage: 'Type a message...',
      send: 'Send',
      conversations: 'Conversations',
      noConversations: 'No conversations yet',
      selectConversation: 'Select a conversation to start chatting',
      confirmDelete: 'Are you sure you want to delete this message?',
      delete: 'Delete',
      cancel: 'Cancel',
      connectNewFanpage: 'Connect New Fanpage',
      facebookLogin: 'Facebook Login',
      pageName: 'Page Name',
      pageCategory: 'Category',
      connectButton: 'Connect',
      connectedPages: 'Connected Pages',
      noPages: 'No pages connected yet',
      addPage: 'Add Page',
      disconnect: 'Disconnect',
      confirmDisconnect: 'Are you sure you want to disconnect this fanpage?',
      yesterday: 'Yesterday',
      today: 'Today',
      image: 'Image',
      video: 'Video',
      audio: 'Audio',
      file: 'File',
      attachment: 'Attachment',
    },
  };

  const t = translations[language as keyof typeof translations];

  useEffect(() => {
    buildConversations();
    loadBotStatus();
  }, [messages, selectedPageId]);

  useEffect(() => {
    if (selectedSenderId) {
      filterDisplayedMessages();
    }
  }, [selectedSenderId, messages]);

  const buildConversations = () => {
    const conversationMap = new Map<string, Conversation>();
    const sortedMessages = [...messages].sort((a, b) => b.timestamp - a.timestamp);
    
    sortedMessages.forEach(message => {
      const partnerId = message.direction === 'in' ? message.sender_id : (message.recipient_id || 'Unknown');
      if (!partnerId) return;
      
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          sender_id: partnerId,
          sender_name: message.sender_name || partnerId,
          sender_avatar: message.sender_avatar || '',
          lastText: message.text || (message.attachments && message.attachments.length ? `[${t.attachment}]` : ''),
          lastTime: message.timestamp,
          unreadCount: message.direction === 'in' ? 1 : 0,
        });
      } else {
        const existing = conversationMap.get(partnerId)!;
        if ((!existing.sender_avatar || !existing.sender_name) && message.sender_name) {
          existing.sender_name = message.sender_name;
          existing.sender_avatar = message.sender_avatar || '';
        }
        // Update unread count for incoming messages
        if (message.direction === 'in') {
          existing.unreadCount += 1;
        }
      }
    });
    
    setConversations(Array.from(conversationMap.values()));
  };

  const filterDisplayedMessages = () => {
    const filtered = messages
      .filter(m => 
        (m.direction === 'in' && m.sender_id === selectedSenderId) ||
        (m.direction === 'out' && m.recipient_id === selectedSenderId)
      )
      .sort((a, b) => a.timestamp - b.timestamp);
    setDisplayedMessages(filtered);
  };

  const loadBotStatus = async () => {
    if (!selectedPageId) return;
    // Simulate API call
    setTimeout(() => {
      setIsBotActive(Math.random() > 0.5);
    }, 500);
  };

  const toggleBot = async (enabled: boolean) => {
    setIsBotActive(enabled);
    // Simulate API call
    setTimeout(() => {
      // Handle success/error
    }, 1000);
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In real implementation, this would fetch new messages
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changePage = async (pageId: string) => {
    setSelectedPageId(pageId);
    setSelectedSenderId('');
    setDisplayedMessages([]);
    // Simulate loading messages for new page
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const selectConversation = (senderId: string) => {
    setSelectedSenderId(senderId);
    // Mark conversation as read
    setConversations(prev => 
      prev.map(conv => 
        conv.sender_id === senderId 
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    );
    setShowConversations(false);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedSenderId || !selectedPageId) return;

    setIsSending(true);
    try {
      const newMessage: FacebookMessage = {
        id: Date.now().toString(),
        sender_id: selectedPageId,
        recipient_id: selectedSenderId,
        text: replyText,
        direction: 'out',
        timestamp: Date.now(),
        mid: `mid_${Date.now()}`,
      };
      
      setMessages(prev => [...prev, newMessage]);
      setReplyText('');
      
      // Simulate sending delay
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const connectFanpage = async () => {
    setShowConnectModal(true);
  };

  const handleConnectFanpage = async () => {
    // Simulate Facebook OAuth flow
    Alert.alert(
      t.facebookLogin,
      'This would open Facebook login in a real implementation',
      [{ text: 'OK' }]
    );
    setShowConnectModal(false);
  };

  const disconnectFanpage = async (pageId: string) => {
    Alert.alert(
      t.confirmDisconnect,
      '',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.disconnect,
          onPress: () => {
            setPages(prev => prev.filter(p => p.id !== pageId));
            if (selectedPageId === pageId) {
              setSelectedPageId('');
              setSelectedSenderId('');
              setDisplayedMessages([]);
            }
          },
        },
      ]
    );
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days === 1) return t.yesterday;
    return `${days} ngày trước`;
  };

  const renderMessage = (message: FacebookMessage) => {
    const isOutgoing = message.direction === 'out';
    const conversation = conversations.find(c => c.sender_id === (isOutgoing ? message.recipient_id : message.sender_id));
    
    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isOutgoing ? styles.outgoingMessage : styles.incomingMessage,
        ]}
      >
        {!isOutgoing && (
          <Image
            source={{ uri: conversation?.sender_avatar || 'https://via.placeholder.com/40' }}
            style={styles.avatar}
          />
        )}
        
        <View style={[
          styles.messageBubble,
          isOutgoing ? styles.outgoingBubble : styles.incomingBubble,
        ]}>
          {message.text ? (
            <Text style={[
              styles.messageText,
              isOutgoing ? styles.outgoingText : styles.incomingText,
            ]}>
              {message.text}
            </Text>
          ) : null}
          
          {message.attachments && message.attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {message.attachments.map((attachment, index) => (
                <View key={index} style={styles.attachmentItem}>
                  {attachment.type === 'image' && (
                    <Image
                      source={{ uri: attachment.payload.url }}
                      style={styles.attachmentImage}
                      resizeMode="cover"
                    />
                  )}
                  {attachment.type === 'video' && (
                    <View style={styles.attachmentPlaceholder}>
                      <Ionicons name="videocam" size={24} color="#666" />
                      <Text style={styles.attachmentText}>{t.video}</Text>
                    </View>
                  )}
                  {attachment.type === 'audio' && (
                    <View style={styles.attachmentPlaceholder}>
                      <Ionicons name="musical-note" size={24} color="#666" />
                      <Text style={styles.attachmentText}>{t.audio}</Text>
                    </View>
                  )}
                  {attachment.type === 'file' && (
                    <View style={styles.attachmentPlaceholder}>
                      <Ionicons name="document" size={24} color="#666" />
                      <Text style={styles.attachmentText}>{t.file}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
          
          <Text style={styles.timestamp}>
            {formatTimestamp(message.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const renderConversationItem = (conversation: Conversation) => (
    <TouchableOpacity
      key={conversation.sender_id}
      style={[
        styles.conversationItem,
        conversation.sender_id === selectedSenderId && styles.activeConversation,
      ]}
      onPress={() => selectConversation(conversation.sender_id)}
    >
      <Image
        source={{ uri: conversation.sender_avatar || 'https://via.placeholder.com/50' }}
        style={styles.conversationAvatar}
      />
      
      <View style={styles.conversationInfo}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {conversation.sender_name}
          </Text>
          <Text style={styles.conversationTime}>
            {formatTimestamp(conversation.lastTime)}
          </Text>
        </View>
        
        <Text style={styles.conversationLastMessage} numberOfLines={2}>
          {conversation.lastText}
        </Text>
      </View>
      
      {conversation.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>{conversation.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderPageItem = (page: FacebookPage) => (
    <View key={page.id} style={styles.pageItem}>
      <Image
        source={{ uri: page.picture?.data.url || 'https://via.placeholder.com/60' }}
        style={styles.pageAvatar}
      />
      
      <View style={styles.pageInfo}>
        <Text style={styles.pageName} numberOfLines={1}>
          {page.name}
        </Text>
        <Text style={styles.pageCategory}>
          {page.category || 'Khách sạn'}
        </Text>
      </View>
      
      <TouchableOpacity
        style={styles.disconnectButton}
        onPress={() => disconnectFanpage(page.id)}
      >
        <Ionicons name="close" size={16} color="#f44336" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <TouchableOpacity
          style={styles.conversationsButton}
          onPress={() => setShowConversations(true)}
        >
          <Ionicons name="chatbubbles" size={24} color="#333" />
          {conversations.some(c => c.unreadCount > 0) && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.pageSelector}>
          <Text style={styles.pageSelectorLabel}>{t.selectPage}:</Text>
          <TouchableOpacity
            style={styles.pageSelectorButton}
            onPress={() => { /* Page selection modal */ }}
          >
            <Text style={styles.pageSelectorText} numberOfLines={1}>
              {pages.find(p => p.id === selectedPageId)?.name || t.selectPage}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.toolbarActions}>
          <View style={styles.botToggle}>
            <Text style={styles.botToggleLabel}>{t.aiBot}:</Text>
            <TouchableOpacity
              style={[styles.botToggleButton, isBotActive && styles.botToggleButtonActive]}
              onPress={() => toggleBot(!isBotActive)}
            >
              <Text style={[styles.botToggleText, isBotActive && styles.botToggleTextActive]}>
                {isBotActive ? t.on : t.off}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.toolbarButton} onPress={refreshData}>
            <Ionicons name="refresh" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolbarButton} onPress={connectFanpage}>
            <Ionicons name="add" size={20} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showConversations}
        animationType="slide"
        onRequestClose={() => setShowConversations(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t.conversations}</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowConversations(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.conversationsList}>
            {conversations.length === 0 ? (
              <View style={styles.emptyConversations}>
                <Ionicons name="chatbubbles" size={48} color="#ccc" />
                <Text style={styles.emptyConversationsText}>{t.noConversations}</Text>
              </View>
            ) : (
              conversations.map(renderConversationItem)
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showConnectModal}
        animationType="slide"
        onRequestClose={() => setShowConnectModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t.connectNewFanpage}</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowConnectModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.connectModalContent}>
            <TouchableOpacity
              style={styles.facebookLoginButton}
              onPress={handleConnectFanpage}
            >
              <Ionicons name="logo-facebook" size={24} color="#fff" />
              <Text style={styles.facebookLoginButtonText}>
                {t.facebookLogin}
              </Text>
            </TouchableOpacity>

            <View style={styles.connectedPagesSection}>
              <Text style={styles.sectionTitle}>{t.connectedPages}</Text>
              {pages.length === 0 ? (
                <Text style={styles.noPagesText}>{t.noPages}</Text>
              ) : (
                pages.map(renderPageItem)
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <View style={styles.content}>
        {selectedSenderId ? (
          <>
            <ScrollView style={styles.messagesContainer}>
              {displayedMessages.map(renderMessage)}
            </ScrollView>

            <View style={styles.replyContainer}>
              <TextInput
                style={styles.replyInput}
                value={replyText}
                onChangeText={setReplyText}
                placeholder={t.typeMessage}
                multiline
                maxLength={1000}
                editable={!isSending}
                returnKeyType="send"
                onSubmitEditing={sendReply}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!replyText.trim() || isSending) && styles.disabledSendButton]}
                onPress={sendReply}
                disabled={!replyText.trim() || isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>{t.selectConversation}</Text>
            <TouchableOpacity
              style={styles.selectConversationButton}
              onPress={() => setShowConversations(true)}
            >
              <Text style={styles.selectConversationButtonText}>
                {t.conversations}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  conversationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  headerBadge: {
    backgroundColor: '#f44336',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pageSelectorLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  pageSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: 200,
  },
  pageSelectorText: {
    fontSize: 14,
    color: '#333',
    marginRight: 4,
    flex: 1,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  botToggleLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  botToggleButton: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  botToggleButtonActive: {
    backgroundColor: '#4CAF50',
  },
  botToggleText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  botToggleTextActive: {
    color: '#fff',
  },
  toolbarButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  incomingMessage: {
    alignSelf: 'flex-start',
  },
  outgoingMessage: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  incomingBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderTopLeftRadius: 4,
  },
  outgoingBubble: {
    backgroundColor: '#4CAF50',
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  incomingText: {
    color: '#333',
  },
  outgoingText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  attachmentsContainer: {
    marginTop: 8,
  },
  attachmentItem: {
    marginBottom: 8,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  attachmentPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    maxWidth: 200,
  },
  attachmentText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  replyInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    padding: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSendButton: {
    backgroundColor: '#ccc',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyStateTitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  selectConversationButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  selectConversationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    padding: 8,
  },
  conversationsList: {
    flex: 1,
  },
  emptyConversations: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyConversationsText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activeConversation: {
    backgroundColor: '#e8f5e8',
  },
  conversationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  conversationTime: {
    fontSize: 12,
    color: '#999',
  },
  conversationLastMessage: {
    fontSize: 14,
    color: '#666',
  },
  unreadBadge: {
    backgroundColor: '#f44336',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  connectModalContent: {
    flex: 1,
    padding: 16,
  },
  facebookLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1877f2',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  facebookLoginButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  connectedPagesSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  noPagesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 24,
  },
  pageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  pageAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  pageInfo: {
    flex: 1,
  },
  pageName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  pageCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  disconnectButton: {
    padding: 8,
  },
});
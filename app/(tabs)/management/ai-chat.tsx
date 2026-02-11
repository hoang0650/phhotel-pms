import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { aiApi } from '@/services/api/ai';
import { useRouter } from 'expo-router';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'quick_reply';
  metadata?: {
    confidence?: number;
    intent?: string;
    entities?: Array<{ name: string; value: string; confidence: number }>;
  };
  quickReplies?: Array<{ title: string; payload: string }>;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isActive: boolean;
}

const DEFAULT_CONVERSATION_ID = 'default-ai-chat';

export default function AIChatScreen() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: DEFAULT_CONVERSATION_ID,
      title: 'AI Chatbox',
      lastMessage: '',
      timestamp: new Date().toISOString(),
      unreadCount: 0,
      isActive: true,
    },
  ]);
  const [currentConversationId, setCurrentConversationId] = useState<string>(DEFAULT_CONVERSATION_ID);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [datasetModalVisible, setDatasetModalVisible] = useState(false);
  const [datasetText, setDatasetText] = useState('');
  const [datasetLoading, setDatasetLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const translations = {
    vi: {
      title: 'AI Chatbox',
      conversations: 'Cuộc hội thoại',
      typeMessage: 'Nhập tin nhắn...',
      send: 'Gửi',
      aiTyping: 'AI đang trả lời',
      newConversation: 'Cuộc trò chuyện mới',
      clearHistory: 'Xóa lịch sử',
      connectFanpage: 'Kết nối Fanpage',
      viewFanpageHistory: 'Xem lịch sử Fanpage',
      uploadDataset: 'Tải dataset',
      uploadDatasetTitle: 'Tải dataset JSON',
      datasetPlaceholder: 'Dán JSON (mảng products hoặc {products: [...]})',
      upload: 'Tải lên',
      cancel: 'Hủy',
      system: 'Hệ thống',
      user: 'Người dùng',
      ai: 'AI',
      quickReply: 'Trả lời nhanh',
      confidence: 'Độ tin cậy',
      intent: 'Ý định',
      entities: 'Thực thể',
      deleteConversation: 'Xóa cuộc hội thoại',
      confirmDelete: 'Bạn có chắc chắn muốn xóa cuộc hội thoại này?',
      noMessages: 'Chưa có tin nhắn nào',
      startConversation: 'Bắt đầu cuộc trò chuyện',
    },
    en: {
      title: 'AI Chatbox',
      conversations: 'Conversations',
      typeMessage: 'Type a message...',
      send: 'Send',
      aiTyping: 'AI is typing',
      newConversation: 'New Conversation',
      clearHistory: 'Clear History',
      connectFanpage: 'Connect Fanpage',
      viewFanpageHistory: 'View Fanpage History',
      uploadDataset: 'Upload dataset',
      uploadDatasetTitle: 'Upload dataset JSON',
      datasetPlaceholder: 'Paste JSON (products array or {products: [...]})',
      upload: 'Upload',
      cancel: 'Cancel',
      system: 'System',
      user: 'User',
      ai: 'AI',
      quickReply: 'Quick Reply',
      confidence: 'Confidence',
      intent: 'Intent',
      entities: 'Entities',
      deleteConversation: 'Delete Conversation',
      confirmDelete: 'Are you sure you want to delete this conversation?',
      noMessages: 'No messages yet',
      startConversation: 'Start conversation',
    },
  };

  const t = translations[language as keyof typeof translations];
  const tenantId = (user?.hotelId || user?.businessId || 'default').toString();

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
    setConversations(prev =>
      prev.map(c =>
        c.id === currentConversationId
          ? {
              ...c,
              lastMessage: message.content,
              timestamp: message.timestamp,
              unreadCount: 0,
            }
          : c
      )
    );
  }, [currentConversationId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  useEffect(() => {
    if (!tenantId) return;
    const wsUrl = aiApi.getWebSocketUrl(tenantId);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        if (!data) return;
        const content = data.text || data.message || '';
        if (!content) return;
        const senderName = data.sender_name ? `${data.sender_name}: ` : '';
        const systemMessage: ChatMessage = {
          id: Date.now().toString(),
          content: `Fanpage ${senderName}${content}`.trim(),
          sender: 'system',
          timestamp: new Date().toISOString(),
          type: 'text',
        };
        addMessage(systemMessage);
      } catch {}
    };

    ws.onerror = () => {};
    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
    };
  }, [tenantId, addMessage]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'text',
    };

    addMessage(userMessage);
    setInputText('');
    setIsTyping(true);
    setIsLoading(true);

    try {
      const response = await aiApi.chat(tenantId, userMessage.content);
      const answerText = response?.answer || 'Xin lỗi, tôi chưa có dữ liệu để tư vấn.';
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: answerText,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        type: 'text',
        metadata: {
          confidence: 0.9,
          intent: 'general_response',
          entities: [],
        },
      };
      addMessage(aiMessage);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Lỗi gọi AI tư vấn.',
        sender: 'ai',
        timestamp: new Date().toISOString(),
        type: 'text',
      };
      addMessage(errorMessage);
    } finally {
      setIsTyping(false);
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    await sendMessage(inputText);
  };

  const handleQuickReply = (payload: string) => {
    const quickReplyMessages: { [key: string]: string } = {
      book_new_room: 'Tôi muốn đặt phòng mới',
      check_availability: 'Kiểm tra phòng trống',
      cancel_booking: 'Tôi muốn hủy đặt phòng',
      room_status: 'Xem trạng thái phòng',
      update_price: 'Cập nhật giá phòng',
      add_room: 'Thêm phòng mới',
      monthly_revenue: 'Xem doanh thu tháng',
      operational_costs: 'Xem chi phí vận hành',
      occupancy_rate: 'Xem tỷ suất lấp đầy',
    };
    const content = quickReplyMessages[payload] || '';
    if (content) {
      sendMessage(content);
    }
  };

  const switchConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setMessages([]);
    setShowConversations(false);
  };

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: `Cuộc trò chuyện ${conversations.length + 1}`,
      lastMessage: 'Bắt đầu cuộc trò chuyện mới',
      timestamp: new Date().toISOString(),
      unreadCount: 0,
      isActive: true,
    };

    setConversations(prev => [newConversation, ...prev]);
    setMessages([]);
    setCurrentConversationId(newConversation.id);
    setShowConversations(false);
  };

  const deleteConversation = (conversationId: string) => {
    Alert.alert(
      t.confirmDelete,
      '',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          onPress: () => {
            setConversations(prev => prev.filter(c => c.id !== conversationId));
            if (currentConversationId === conversationId) {
              const remainingConversations = conversations.filter(c => c.id !== conversationId);
              if (remainingConversations.length > 0) {
                switchConversation(remainingConversations[0].id);
              } else {
                setMessages([]);
                setCurrentConversationId('');
              }
            }
          },
        },
      ]
    );
  };

  const renderMessage = (message: ChatMessage) => (
    <View
      key={message.id}
      style={[
        styles.messageContainer,
        message.sender === 'user' ? styles.userMessage : styles.aiMessage,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          message.sender === 'user' ? styles.userBubble : styles.aiBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            message.sender === 'user' ? styles.userMessageText : styles.aiMessageText,
          ]}
        >
          {message.content}
        </Text>
        
        {message.metadata && (
          <View style={styles.metadataContainer}>
            {message.metadata.confidence && (
              <Text style={styles.metadataText}>
                {t.confidence}: {(message.metadata.confidence * 100).toFixed(1)}%
              </Text>
            )}
            {message.metadata.intent && (
              <Text style={styles.metadataText}>
                {t.intent}: {message.metadata.intent}
              </Text>
            )}
            {message.metadata.entities && message.metadata.entities.length > 0 && (
              <Text style={styles.metadataText}>
                {t.entities}: {message.metadata.entities.map(e => e.name).join(', ')}
              </Text>
            )}
          </View>
        )}
        
        <Text style={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </Text>
      </View>
      
      {message.quickReplies && message.quickReplies.length > 0 && (
        <View style={styles.quickRepliesContainer}>
          {message.quickReplies.map((reply, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickReplyButton}
              onPress={() => handleQuickReply(reply.payload)}
            >
              <Text style={styles.quickReplyText}>{reply.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderConversationItem = (conversation: Conversation) => (
    <TouchableOpacity
      key={conversation.id}
      style={[
        styles.conversationItem,
        conversation.id === currentConversationId && styles.activeConversation,
      ]}
      onPress={() => switchConversation(conversation.id)}
    >
      <View style={styles.conversationInfo}>
        <Text
          style={[
            styles.conversationTitle,
            conversation.id === currentConversationId && styles.activeConversationTitle,
          ]}
        >
          {conversation.title}
        </Text>
        <Text style={styles.conversationLastMessage} numberOfLines={1}>
          {conversation.lastMessage}
        </Text>
        <Text style={styles.conversationTimestamp}>
          {new Date(conversation.timestamp).toLocaleDateString()}
        </Text>
      </View>
      
      {conversation.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>{conversation.unreadCount}</Text>
        </View>
      )}
      
      <TouchableOpacity
        style={styles.deleteConversationButton}
        onPress={() => deleteConversation(conversation.id)}
      >
        <Ionicons name="trash" size={16} color="#f44336" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const connectFanpage = async () => {
    try {
      const resp = await aiApi.getFacebookOAuthUrl(tenantId);
      if (resp?.url) {
        await Linking.openURL(resp.url);
      } else {
        Alert.alert(t.connectFanpage, 'Không lấy được URL kết nối.');
      }
    } catch (error) {
      Alert.alert(t.connectFanpage, 'Không thể kết nối Fanpage.');
    }
  };

  const openFanpageHistory = () => {
    router.push('/management/fanpage');
  };

  const clearHistory = () => {
    if (messages.length === 0) {
      Alert.alert(t.clearHistory, t.noMessages);
      return;
    }
    Alert.alert(t.clearHistory, t.confirmDelete, [
      { text: t.cancel, style: 'cancel' },
      { text: t.clearHistory, onPress: () => setMessages([]) },
    ]);
  };

  const openDatasetModal = () => {
    setDatasetText('');
    setDatasetModalVisible(true);
  };

  const uploadDataset = async () => {
    if (!datasetText.trim() || datasetLoading) return;
    setDatasetLoading(true);
    try {
      const parsed = JSON.parse(datasetText);
      const products = Array.isArray(parsed) ? parsed : parsed?.products;
      if (!Array.isArray(products) || products.length === 0) {
        Alert.alert(t.uploadDataset, 'Dataset JSON không hợp lệ hoặc trống.');
        return;
      }
      await aiApi.uploadDataset(tenantId, products);
      const systemMessage: ChatMessage = {
        id: Date.now().toString(),
        content: `Đã tải dataset (${products.length} mục).`,
        sender: 'system',
        timestamp: new Date().toISOString(),
        type: 'text',
      };
      addMessage(systemMessage);
      setDatasetModalVisible(false);
    } catch (error) {
      Alert.alert(t.uploadDataset, 'Không thể tải dataset.');
    } finally {
      setDatasetLoading(false);
    }
  };

  const currentConversation = conversations.find(c => c.id === currentConversationId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setShowConversations(true)}
        >
          <Ionicons name="menu" size={24} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {currentConversation?.title || t.title}
        </Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={openDatasetModal}>
            <Ionicons name="cloud-upload" size={20} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={clearHistory}>
            <Ionicons name="trash" size={20} color="#f44336" />
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
            <TouchableOpacity
              style={styles.newConversationButton}
              onPress={createNewConversation}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.newConversationButtonText}>
                {t.newConversation}
              </Text>
            </TouchableOpacity>
            
            {conversations.map(renderConversationItem)}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalFooterButton} onPress={connectFanpage}>
              <Ionicons name="link" size={20} color="#4CAF50" />
              <Text style={styles.modalFooterButtonText}>
                {t.connectFanpage}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalFooterButton} onPress={openFanpageHistory}>
              <Ionicons name="document-text" size={20} color="#4CAF50" />
              <Text style={styles.modalFooterButtonText}>
                {t.viewFanpageHistory}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalFooterButton} onPress={openDatasetModal}>
              <Ionicons name="cloud-upload" size={20} color="#4CAF50" />
              <Text style={styles.modalFooterButtonText}>
                {t.uploadDataset}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles" size={64} color="#ccc" />
            <Text style={styles.emptyText}>{t.noMessages}</Text>
            <Text style={styles.emptySubtext}>{t.startConversation}</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
          >
            {messages.map(renderMessage)}
            {isTyping && (
              <View style={styles.typingContainer}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.typingText}>{t.aiTyping}</Text>
              </View>
            )}
          </ScrollView>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachmentButton} onPress={openDatasetModal}>
            <Ionicons name="attach" size={24} color="#666" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t.typeMessage}
            multiline
            maxLength={1000}
            editable={!isLoading}
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
          />
          
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.disabledSendButton]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={datasetModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDatasetModalVisible(false)}
      >
        <View style={styles.datasetOverlay}>
          <View style={styles.datasetModal}>
            <Text style={styles.datasetTitle}>{t.uploadDatasetTitle}</Text>
            <TextInput
              style={styles.datasetInput}
              value={datasetText}
              onChangeText={setDatasetText}
              placeholder={t.datasetPlaceholder}
              multiline
              editable={!datasetLoading}
            />
            <View style={styles.datasetActions}>
              <TouchableOpacity style={styles.datasetCancel} onPress={() => setDatasetModalVisible(false)}>
                <Text style={styles.datasetCancelText}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.datasetUpload, datasetLoading && styles.datasetUploadDisabled]}
                onPress={uploadDataset}
                disabled={datasetLoading}
              >
                {datasetLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.datasetUploadText}>{t.upload}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  datasetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  datasetModal: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  datasetTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  datasetInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  datasetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  datasetCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  datasetCancelText: {
    color: '#666',
    fontSize: 14,
  },
  datasetUpload: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  datasetUploadDisabled: {
    opacity: 0.6,
  },
  datasetUploadText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#4CAF50',
    borderTopRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  aiMessageText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  metadataContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  metadataText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  quickRepliesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  quickReplyButton: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  quickReplyText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  attachmentButton: {
    padding: 8,
    marginRight: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    padding: 10,
    marginLeft: 8,
  },
  disabledSendButton: {
    backgroundColor: '#ccc',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
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
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    padding: 8,
  },
  conversationsList: {
    flex: 1,
  },
  newConversationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    margin: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  newConversationButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activeConversation: {
    backgroundColor: '#e8f5e8',
  },
  conversationInfo: {
    flex: 1,
    marginRight: 12,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  activeConversationTitle: {
    color: '#4CAF50',
  },
  conversationLastMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  conversationTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  unreadBadge: {
    backgroundColor: '#f44336',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteConversationButton: {
    padding: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalFooterButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 8,
  },
  modalFooterButtonText: {
    marginTop: 4,
    fontSize: 12,
    color: '#4CAF50',
  },
});

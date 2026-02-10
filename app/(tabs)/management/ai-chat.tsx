import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../../contexts/LanguageContext';

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

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    title: 'Hỗ trợ đặt phòng',
    lastMessage: 'Tôi có thể giúp bạn đặt phòng khách sạn',
    timestamp: '2024-01-15T10:30:00Z',
    unreadCount: 0,
    isActive: true,
  },
  {
    id: '2',
    title: 'Quản lý phòng',
    lastMessage: 'Phòng 101 đang trống',
    timestamp: '2024-01-15T09:15:00Z',
    unreadCount: 2,
    isActive: false,
  },
  {
    id: '3',
    title: 'Báo cáo tài chính',
    lastMessage: 'Doanh thu tháng này tăng 15%',
    timestamp: '2024-01-14T16:45:00Z',
    unreadCount: 0,
    isActive: false,
  },
];

const MOCK_MESSAGES: { [key: string]: ChatMessage[] } = {
  '1': [
    {
      id: '1',
      content: 'Xin chào! Tôi có thể giúp gì cho bạn về đặt phòng?',
      sender: 'ai',
      timestamp: '2024-01-15T10:25:00Z',
      type: 'text',
      quickReplies: [
        { title: 'Đặt phòng mới', payload: 'book_new_room' },
        { title: 'Xem phòng trống', payload: 'check_availability' },
        { title: 'Hủy đặt phòng', payload: 'cancel_booking' },
      ],
    },
    {
      id: '2',
      content: 'Tôi muốn đặt phòng đôi cho 2 người',
      sender: 'user',
      timestamp: '2024-01-15T10:28:00Z',
      type: 'text',
    },
    {
      id: '3',
      content: 'Tôi có thể giúp bạn đặt phòng đôi. Bạn muốn đặt cho ngày nào?',
      sender: 'ai',
      timestamp: '2024-01-15T10:28:00Z',
      type: 'text',
      metadata: {
        intent: 'book_room',
        entities: [
          { name: 'room_type', value: 'double', confidence: 0.95 },
          { name: 'guest_count', value: '2', confidence: 0.98 },
        ],
      },
    },
  ],
  '2': [
    {
      id: '4',
      content: 'Chào bạn! Tôi có thể giúp bạn quản lý phòng.',
      sender: 'ai',
      timestamp: '2024-01-15T09:10:00Z',
      type: 'text',
      quickReplies: [
        { title: 'Xem trạng thái phòng', payload: 'room_status' },
        { title: 'Cập nhật giá phòng', payload: 'update_price' },
        { title: 'Thêm phòng mới', payload: 'add_room' },
      ],
    },
  ],
  '3': [
    {
      id: '5',
      content: 'Chào bạn! Tôi có thể giúp bạn với báo cáo tài chính.',
      sender: 'ai',
      timestamp: '2024-01-14T16:40:00Z',
      type: 'text',
      quickReplies: [
        { title: 'Doanh thu theo tháng', payload: 'monthly_revenue' },
        { title: 'Chi phí vận hành', payload: 'operational_costs' },
        { title: 'Tỷ suất lấp đầy', payload: 'occupancy_rate' },
      ],
    },
  ],
};

export default function AIChatScreen() {
  const { language } = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [currentConversationId, setCurrentConversationId] = useState<string>('1');
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES['1']);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

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

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputText.trim(),
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'text',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponses = {
        book_new_room: 'Tôi có thể giúp bạn đặt phòng mới. Bạn cần cung cấp thông tin như: loại phòng, số lượng khách, ngày nhận phòng và ngày trả phòng.',
        check_availability: 'Tôi sẽ kiểm tra phòng trống cho bạn. Bạn muốn kiểm tra cho ngày nào?',
        cancel_booking: 'Để hủy đặt phòng, tôi cần mã đặt phòng của bạn. Vui lòng cung cấp mã đặt phòng.',
        room_status: 'Hiện tại có 5 phòng trống, 3 phòng đang được sử dụng và 2 phòng đang bảo trì.',
        update_price: 'Tôi có thể giúp bạn cập nhật giá phòng. Bạn muốn cập nhật giá cho phòng nào?',
        add_room: 'Để thêm phòng mới, tôi cần thông tin như: số phòng, loại phòng, giá và sức chứa.',
        monthly_revenue: 'Doanh thu tháng này là 850 triệu VND, tăng 15% so với tháng trước.',
        operational_costs: 'Chi phí vận hành tháng này là 320 triệu VND, bao gồm: nhân sự, điện nước, bảo trì.',
        occupancy_rate: 'Tỷ suất lấp đầy hiện tại là 78%, cao hơn mức trung bình tháng trước là 72%.',
      };

      let responseContent = 'Tôi không hiểu yêu cầu của bạn. Bạn có thể cung cấp thêm thông tin được không?';
      let quickReplies: Array<{ title: string; payload: string }> = [];

      // Check for keywords in user message
      const lowerContent = userMessage.content.toLowerCase();
      if (lowerContent.includes('đặt phòng') || lowerContent.includes('book')) {
        responseContent = aiResponses.book_new_room;
        quickReplies = [
          { title: 'Phòng đơn', payload: 'single_room' },
          { title: 'Phòng đôi', payload: 'double_room' },
          { title: 'Phòng gia đình', payload: 'family_room' },
        ];
      } else if (lowerContent.includes('trống') || lowerContent.includes('available')) {
        responseContent = aiResponses.check_availability;
      } else if (lowerContent.includes('hủy') || lowerContent.includes('cancel')) {
        responseContent = aiResponses.cancel_booking;
      } else if (lowerContent.includes('phòng') && lowerContent.includes('status')) {
        responseContent = aiResponses.room_status;
      } else if (lowerContent.includes('giá') || lowerContent.includes('price')) {
        responseContent = aiResponses.update_price;
      } else if (lowerContent.includes('doanh thu') || lowerContent.includes('revenue')) {
        responseContent = aiResponses.monthly_revenue;
      } else if (lowerContent.includes('chi phí') || lowerContent.includes('cost')) {
        responseContent = aiResponses.operational_costs;
      } else if (lowerContent.includes('tỷ suất') || lowerContent.includes('occupancy')) {
        responseContent = aiResponses.occupancy_rate;
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: responseContent,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        type: 'text',
        quickReplies,
        metadata: {
          confidence: 0.85 + Math.random() * 0.15, // Random confidence between 0.85-1.0
          intent: 'general_response',
          entities: [],
        },
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
      setIsLoading(false);
    }, 1500);
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

    setInputText(quickReplyMessages[payload] || '');
    handleSendMessage();
  };

  const switchConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setMessages(MOCK_MESSAGES[conversationId] || []);
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

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: 'Chào bạn! Tôi là AI assistant. Tôi có thể giúp gì cho bạn?',
      sender: 'ai',
      timestamp: new Date().toISOString(),
      type: 'text',
      quickReplies: [
        { title: 'Đặt phòng', payload: 'book_new_room' },
        { title: 'Quản lý phòng', payload: 'room_status' },
        { title: 'Báo cáo', payload: 'monthly_revenue' },
      ],
    };

    setConversations(prev => [newConversation, ...prev]);
    MOCK_MESSAGES[newConversation.id] = [newMessage];
    switchConversation(newConversation.id);
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
            delete MOCK_MESSAGES[conversationId];
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
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="call" size={20} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="videocam" size={20} color="#4CAF50" />
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
            <TouchableOpacity style={styles.modalFooterButton}>
              <Ionicons name="link" size={20} color="#4CAF50" />
              <Text style={styles.modalFooterButtonText}>
                {t.connectFanpage}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalFooterButton}>
              <Ionicons name="document-text" size={20} color="#4CAF50" />
              <Text style={styles.modalFooterButtonText}>
                {t.viewFanpageHistory}
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
          <TouchableOpacity style={styles.attachmentButton}>
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
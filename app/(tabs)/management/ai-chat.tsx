import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHotel } from '@/contexts/HotelContext';
import {
  aiApi,
  type OpenClawDevicePairingItem,
} from '@/services/api/ai';
import { API_CONFIG } from '@/services/api/config';
import { useRouter } from 'expo-router';
import { AccessGuard } from '@/components/AccessGuard';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'quick_reply';
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
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
const FILE_URL_REGEX = /(?:Link tải:\s*)?(https?:\/\/[^\s]+?\.(?:xlsx|docx|pdf))/i;

const buildToolAwareMessage = (
  id: string,
  answerText: string,
  timestamp: string
): ChatMessage => {
  const rawText = (answerText || '').trim();
  const match = rawText.match(FILE_URL_REGEX);

  if (!match?.[1]) {
    return {
      id,
      content: rawText || 'Xin lỗi, tôi chưa có dữ liệu để tư vấn.',
      sender: 'ai',
      timestamp,
      type: 'text',
    };
  }

  const fileUrl = match[1];
  const extension = fileUrl.split('.').pop()?.toLowerCase() || '';
  const fileType =
    extension === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : extension === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf';
  const cleanedContent = rawText
    .replace(match[0], '')
    .replace('Đã xuất file Excel thành công.', '')
    .replace('Đã tạo file Word thành công.', '')
    .replace('Đã tạo file PDF thành công.', '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    id,
    content: cleanedContent || 'AI đã tạo file đính kèm.',
    sender: 'ai',
    timestamp,
    type: 'file',
    fileUrl,
    fileType,
    fileName: fileUrl.split('/').pop() || `report.${extension || 'file'}`,
  };
};

const isRevenuePrompt = (message: string) => {
  const normalized = message.toLowerCase();
  return [
    'doanh thu',
    'thu chi',
    'phiếu thu',
    'phiếu chi',
    'tiền mặt',
    'chuyển khoản',
    'cà thẻ',
    'giao ca',
    'profit',
    'revenue',
  ].some(keyword => normalized.includes(keyword));
};

const isWebPrompt = (message: string) => {
  const normalized = message.toLowerCase();
  const hasUrl = /(https?:\/\/|www\.)/i.test(message);
  return hasUrl || [
    'đọc báo',
    'doc bao',
    'tin tức',
    'tin tuc',
    'bài báo',
    'bai bao',
    'tóm tắt web',
    'tom tat web',
    'tóm tắt bài',
    'tom tat bai',
    'tóm tắt link',
    'tom tat link',
    'đọc link',
    'doc link',
    'đọc web',
    'doc web',
    'website',
    'web',
    'news',
    'article',
    'search web',
    'web search',
  ].some(keyword => normalized.includes(keyword));
};

export default function AIChatScreen() {
  const { language } = useLanguage();
  const { user, token, isAdmin } = useAuth();
  const { selectedHotelId, selectedHotel, hotels, selectHotel, canSelectMultipleHotels, isLoading: hotelContextLoading } = useHotel();
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
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingApproving, setPairingApproving] = useState(false);
  const [pendingPairings, setPendingPairings] = useState<OpenClawDevicePairingItem[]>([]);
  const [pairedDevices, setPairedDevices] = useState<OpenClawDevicePairingItem[]>([]);
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
      selectedHotel: 'Khách sạn',
      noHotelSelected: 'Vui lòng chọn khách sạn trước khi dùng AI.',
      noRevenuePermission: 'Bạn không có quyền hỏi dữ liệu doanh thu.',
      exportExcel: 'Xuất Excel',
      exportWord: 'Xuất Word',
      exportPdf: 'Xuất PDF',
      openFile: 'Mở file',
      generatedFile: 'File AI tạo',
      hotelLoading: 'Đang tải khách sạn...',
      webSummary: 'Tóm tắt web',
      webNews: 'Tin tức mới',
      openClawPairing: 'OpenClaw Pairing',
      loadPairings: 'Tải pending pairing',
      approveLatestPairing: 'Approve mới nhất',
      approve: 'Approve',
      pendingPairings: 'Pending pairing',
      pairedDevices: 'Thiết bị đã duyệt',
      noPendingPairings: 'Chưa có pending pairing',
      noPendingPairingsDesc: 'Bấm Kết nối ở OpenClaw Control UI trước, sau đó quay lại đây tải danh sách pairing.',
      onlyAdminCanApprove: 'Chỉ admin hoặc superadmin mới được phép approve OpenClaw pairing.',
      loadingPairingsFailed: 'Không tải được danh sách OpenClaw pairing.',
      approvePairingFailed: 'Không approve được OpenClaw pairing.',
      approvePairingSuccess: 'Đã approve OpenClaw pairing thành công.',
      deviceClient: 'Client',
      deviceRole: 'Vai trò',
      deviceScopes: 'Scopes',
      deviceTime: 'Thời gian',
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
      selectedHotel: 'Hotel',
      noHotelSelected: 'Please select a hotel before using AI.',
      noRevenuePermission: 'You do not have permission to ask revenue data.',
      exportExcel: 'Export Excel',
      exportWord: 'Export Word',
      exportPdf: 'Export PDF',
      openFile: 'Open file',
      generatedFile: 'Generated file',
      hotelLoading: 'Loading hotels...',
      webSummary: 'Web summary',
      webNews: 'Latest news',
      openClawPairing: 'OpenClaw Pairing',
      loadPairings: 'Load pending pairings',
      approveLatestPairing: 'Approve latest',
      approve: 'Approve',
      pendingPairings: 'Pending pairings',
      pairedDevices: 'Approved devices',
      noPendingPairings: 'No pending pairings',
      noPendingPairingsDesc: 'Click Connect in OpenClaw Control UI first, then return here to load the pairing list.',
      onlyAdminCanApprove: 'Only admin or superadmin can approve OpenClaw pairings.',
      loadingPairingsFailed: 'Failed to load OpenClaw pairings.',
      approvePairingFailed: 'Failed to approve OpenClaw pairing.',
      approvePairingSuccess: 'OpenClaw pairing approved successfully.',
      deviceClient: 'Client',
      deviceRole: 'Role',
      deviceScopes: 'Scopes',
      deviceTime: 'Time',
      deleteConversation: 'Delete Conversation',
      confirmDelete: 'Are you sure you want to delete this conversation?',
      noMessages: 'No messages yet',
      startConversation: 'Start conversation',
    },
  };

  const t = translations[language as keyof typeof translations];
  const effectiveHotelId = useMemo(
    () => (selectedHotelId || user?.hotelId || '').toString(),
    [selectedHotelId, user?.hotelId]
  );
  const businessId = (user?.businessId || '').toString();
  const tenantId = (effectiveHotelId || businessId || 'default').toString();
  const canAskRevenue = useMemo(() => {
    const role = String(user?.role || '').toLowerCase();
    return ['superadmin', 'admin', 'business', 'hotel', 'staff', 'manager', 'hotel_manager'].includes(role);
  }, [user?.role]);

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

  const openFileUrl = useCallback(async (url?: string) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(t.openFile, 'Không thể mở file được tạo.');
    }
  }, [t.openFile]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    const webPrompt = isWebPrompt(content);
    if (!effectiveHotelId && !businessId && !webPrompt) {
      Alert.alert(t.title, t.noHotelSelected);
      return;
    }
    if (isRevenuePrompt(content) && !canAskRevenue) {
      Alert.alert(t.title, t.noRevenuePermission);
      return;
    }

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
      const response = await aiApi.chat(
        tenantId,
        userMessage.content,
        undefined,
        user?.role || null,
        user?.id || null,
        token || null,
        {
          hotelId: effectiveHotelId || null,
          businessId: businessId || null,
          apiUrl: API_CONFIG.BASE_URL,
        }
      );
      const answerText = response?.answer || 'Xin lỗi, tôi chưa có dữ liệu để tư vấn.';
      const aiMessage = buildToolAwareMessage(
        (Date.now() + 1).toString(),
        answerText,
        new Date().toISOString()
      );
      aiMessage.metadata = {
        confidence: 0.9,
        intent: aiMessage.type === 'file' ? 'tool_export' : 'general_response',
        entities: [],
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
      monthly_revenue: 'Doanh thu tháng này',
      daily_revenue: 'Doanh thu hôm nay',
      yesterday_revenue: 'Doanh thu hôm qua',
      weekly_revenue: 'Doanh thu tuần này',
      yearly_revenue: 'Doanh thu năm nay',
      operational_costs: 'Xem chi phí vận hành',
      occupancy_rate: 'Xem tỷ suất lấp đầy',
    };
    const content = quickReplyMessages[payload] || '';
    if (content) {
      sendMessage(content);
    }
  };

  const exportQuickActions = useMemo(
    () => [
      {
        label: t.exportExcel,
        query: 'Xuất file Excel báo cáo doanh thu tháng này',
      },
      {
        label: t.exportWord,
        query: 'Xuất file Word báo cáo doanh thu tháng này',
      },
      {
        label: t.exportPdf,
        query: 'Xuất file PDF báo cáo doanh thu tháng này',
      },
    ],
    [t.exportExcel, t.exportPdf, t.exportWord]
  );
  const webQuickActions = useMemo(
    () => [
      {
        label: t.webSummary,
        query: 'Tóm tắt nội dung link web này: https://vnexpress.net/',
      },
      {
        label: t.webNews,
        query: 'Tìm tin tức mới nhất về du lịch Việt Nam hôm nay và tóm tắt ngắn gọn',
      },
    ],
    [t.webNews, t.webSummary]
  );

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

        {message.fileUrl ? (
          <TouchableOpacity
            style={styles.fileCard}
            onPress={() => openFileUrl(message.fileUrl)}
            activeOpacity={0.85}
          >
            <View style={styles.fileCardHeader}>
              <Ionicons
                name={message.fileType?.includes('sheet') ? 'grid' : message.fileType?.includes('wordprocessingml') ? 'document-text' : 'document'}
                size={18}
                color="#1890ff"
              />
              <Text style={styles.fileCardTitle}>{t.generatedFile}</Text>
            </View>
            <Text style={styles.fileCardName} numberOfLines={1}>
              {message.fileName || message.fileUrl.split('/').pop()}
            </Text>
            <Text style={styles.fileCardAction}>{t.openFile}</Text>
          </TouchableOpacity>
        ) : null}
        
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

  const getPairingRequestedAt = useCallback((item: OpenClawDevicePairingItem) => {
    const timestamp =
      Number(item?.requestedAtMs || 0) ||
      Number(item?.updatedAtMs || 0) ||
      Number(item?.ts || 0);
    return Number.isFinite(timestamp) && timestamp > 0
      ? new Date(timestamp).toLocaleString()
      : '-';
  }, []);

  const loadOpenClawPairings = useCallback(async () => {
    if (!isAdmin) {
      Alert.alert(t.openClawPairing, t.onlyAdminCanApprove);
      return;
    }
    setPairingLoading(true);
    try {
      const response = await aiApi.getOpenClawDevicePairings();
      setPendingPairings(Array.isArray(response?.pending) ? response.pending : []);
      setPairedDevices(Array.isArray(response?.paired) ? response.paired : []);
      if (!response?.pending?.length) {
        Alert.alert(t.openClawPairing, t.noPendingPairingsDesc);
      }
    } catch (error) {
      Alert.alert(t.openClawPairing, t.loadingPairingsFailed);
    } finally {
      setPairingLoading(false);
    }
  }, [isAdmin, t.loadingPairingsFailed, t.noPendingPairingsDesc, t.onlyAdminCanApprove, t.openClawPairing]);

  const approveOpenClawPairing = useCallback(async (requestId?: string) => {
    if (!isAdmin) {
      Alert.alert(t.openClawPairing, t.onlyAdminCanApprove);
      return;
    }
    setPairingApproving(true);
    try {
      await aiApi.approveOpenClawDevicePairing({
        requestId: requestId || undefined,
        clientId: 'openclaw-control-ui',
        clientMode: 'ui',
        role: 'operator',
      });
      Alert.alert(t.openClawPairing, t.approvePairingSuccess);
      await loadOpenClawPairings();
    } catch (error) {
      Alert.alert(t.openClawPairing, t.approvePairingFailed);
    } finally {
      setPairingApproving(false);
    }
  }, [isAdmin, loadOpenClawPairings, t.approvePairingFailed, t.approvePairingSuccess, t.onlyAdminCanApprove, t.openClawPairing]);

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
  const revenueQuickActions = [
    { label: language === 'en' ? 'Revenue today' : 'Doanh thu hôm nay', query: 'Doanh thu hôm nay' },
    { label: language === 'en' ? 'Revenue yesterday' : 'Doanh thu hôm qua', query: 'Doanh thu hôm qua' },
    { label: language === 'en' ? 'Revenue this week' : 'Doanh thu tuần này', query: 'Doanh thu tuần này' },
    { label: language === 'en' ? 'Revenue this month' : 'Doanh thu tháng này', query: 'Doanh thu tháng này' },
    { label: language === 'en' ? 'Revenue this year' : 'Doanh thu năm nay', query: 'Doanh thu năm nay' },
  ];

  return (
    <AccessGuard addon="aiChatboxFeature">
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

      <View style={styles.hotelContextBar}>
        <Text style={styles.hotelContextLabel}>{t.selectedHotel}:</Text>
        <Text style={styles.hotelContextValue}>
          {hotelContextLoading ? t.hotelLoading : selectedHotel?.name || effectiveHotelId || t.noHotelSelected}
        </Text>
      </View>
      {/* {canSelectMultipleHotels ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.hotelChipScroll}
          contentContainerStyle={styles.hotelChipContent}
        >
          {hotels.map(hotel => (
            <TouchableOpacity
              key={hotel.id}
              style={[styles.hotelChip, selectedHotelId === hotel.id && styles.hotelChipActive]}
              onPress={() => selectHotel(hotel.id)}
            >
              <Text style={[styles.hotelChipText, selectedHotelId === hotel.id && styles.hotelChipTextActive]}>
                {hotel.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null} */}

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

          {isAdmin ? (
            <View style={styles.adminPanel}>
              <Text style={styles.adminPanelTitle}>{t.openClawPairing}</Text>
              <Text style={styles.adminPanelDescription}>
                {t.noPendingPairingsDesc}
              </Text>
              <View style={styles.adminActionsRow}>
                <TouchableOpacity
                  style={[styles.adminActionButton, styles.adminSecondaryButton]}
                  onPress={loadOpenClawPairings}
                  disabled={pairingLoading}
                >
                  {pairingLoading ? (
                    <ActivityIndicator size="small" color="#1890ff" />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={16} color="#1890ff" />
                      <Text style={styles.adminSecondaryText}>{t.loadPairings}</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.adminActionButton, styles.adminPrimaryButton, (!pendingPairings.length || pairingApproving) && styles.adminDisabledButton]}
                  onPress={() => approveOpenClawPairing()}
                  disabled={!pendingPairings.length || pairingApproving}
                >
                  {pairingApproving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      <Text style={styles.adminPrimaryText}>{t.approveLatestPairing}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.adminSectionTitle}>
                {t.pendingPairings} ({pendingPairings.length})
              </Text>
              {!pendingPairings.length ? (
                <View style={styles.adminEmptyCard}>
                  <Text style={styles.adminEmptyTitle}>{t.noPendingPairings}</Text>
                  <Text style={styles.adminEmptyDescription}>{t.noPendingPairingsDesc}</Text>
                </View>
              ) : (
                pendingPairings.map((pairing) => (
                  <View key={pairing.requestId || `${pairing.clientId}-${pairing.ts}`} style={styles.pairingCard}>
                    <Text style={styles.pairingRequestId}>{pairing.requestId || '-'}</Text>
                    <Text style={styles.pairingMeta}>{t.deviceClient}: {pairing.clientId || '-'} / {pairing.clientMode || '-'}</Text>
                    <Text style={styles.pairingMeta}>{t.deviceRole}: {pairing.role || pairing.roles?.join(', ') || '-'}</Text>
                    <Text style={styles.pairingMeta}>{t.deviceScopes}: {pairing.scopes?.join(', ') || '-'}</Text>
                    <Text style={styles.pairingMeta}>{t.deviceTime}: {getPairingRequestedAt(pairing)}</Text>
                    <TouchableOpacity
                      style={[styles.singleApproveButton, pairingApproving && styles.adminDisabledButton]}
                      onPress={() => approveOpenClawPairing(pairing.requestId)}
                      disabled={pairingApproving}
                    >
                      <Text style={styles.singleApproveButtonText}>{t.approve}</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}

              {pairedDevices.length ? (
                <>
                  <Text style={styles.adminSectionTitle}>
                    {t.pairedDevices} ({pairedDevices.length})
                  </Text>
                  {pairedDevices.slice(0, 5).map((device) => (
                    <View key={device.deviceId || `${device.clientId}-${device.ts}`} style={styles.pairedDeviceCard}>
                      <Text style={styles.pairingRequestId}>{device.deviceId || '-'}</Text>
                      <Text style={styles.pairingMeta}>{t.deviceClient}: {device.clientId || '-'} / {device.clientMode || '-'}</Text>
                      <Text style={styles.pairingMeta}>{t.deviceRole}: {device.role || device.roles?.join(', ') || '-'}</Text>
                      <Text style={styles.pairingMeta}>{t.deviceScopes}: {device.scopes?.join(', ') || '-'}</Text>
                    </View>
                  ))}
                </>
              ) : null}
            </View>
          ) : null}
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

        {canAskRevenue ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickActionsContainer}
              contentContainerStyle={styles.quickActionsContent}
            >
              {revenueQuickActions.map(action => (
                <TouchableOpacity
                  key={action.query}
                  style={styles.quickActionButton}
                  onPress={() => sendMessage(action.query)}
                  disabled={isLoading}
                >
                  <Text style={styles.quickActionText}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.exportActionsContainer}
              contentContainerStyle={styles.quickActionsContent}
            >
              {exportQuickActions.map(action => (
                <TouchableOpacity
                  key={action.query}
                  style={[styles.quickActionButton, styles.exportActionButton]}
                  onPress={() => sendMessage(action.query)}
                  disabled={isLoading}
                >
                  <Ionicons name="download-outline" size={14} color="#1890ff" />
                  <Text style={[styles.quickActionText, styles.exportActionText]}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.exportActionsContainer}
          contentContainerStyle={styles.quickActionsContent}
        >
          {webQuickActions.map(action => (
            <TouchableOpacity
              key={action.query}
              style={[styles.quickActionButton, styles.exportActionButton]}
              onPress={() => sendMessage(action.query)}
              disabled={isLoading}
            >
              <Ionicons name="globe-outline" size={14} color="#1890ff" />
              <Text style={[styles.quickActionText, styles.exportActionText]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

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
    </AccessGuard>
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
  hotelContextBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  hotelContextLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  hotelContextValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  hotelChipScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  hotelChipContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  hotelChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  hotelChipActive: {
    backgroundColor: '#e6f4ff',
    borderColor: '#1890ff',
  },
  hotelChipText: {
    fontSize: 13,
    color: '#555',
  },
  hotelChipTextActive: {
    color: '#1890ff',
    fontWeight: '600',
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
  fileCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#d6e4ff',
    backgroundColor: '#f8fbff',
    borderRadius: 12,
    padding: 12,
  },
  fileCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  fileCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1890ff',
  },
  fileCardName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  fileCardAction: {
    marginTop: 8,
    fontSize: 13,
    color: '#1890ff',
    fontWeight: '600',
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
  quickActionsContainer: {
    maxHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  quickActionsContent: {
    gap: 8,
    alignItems: 'center',
  },
  quickActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
  },
  exportActionsContainer: {
    maxHeight: 44,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  exportActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f7ff',
    borderColor: '#bfdbfe',
  },
  exportActionText: {
    color: '#1890ff',
    fontWeight: '600',
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
    paddingTop: 30,
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
  adminPanel: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8eef8',
  },
  adminPanelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  adminPanelDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6b7280',
    marginBottom: 12,
  },
  adminActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  adminActionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
  },
  adminSecondaryButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  adminPrimaryButton: {
    backgroundColor: '#1890ff',
  },
  adminDisabledButton: {
    opacity: 0.55,
  },
  adminSecondaryText: {
    color: '#1890ff',
    fontSize: 13,
    fontWeight: '600',
  },
  adminPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  adminSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 10,
  },
  adminEmptyCard: {
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  adminEmptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  adminEmptyDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6b7280',
  },
  pairingCard: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#f8fbff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  pairedDeviceCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fafafa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  pairingRequestId: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  pairingMeta: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4b5563',
    marginBottom: 2,
  },
  singleApproveButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#e6f4ff',
    borderWidth: 1,
    borderColor: '#91caff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  singleApproveButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0958d9',
  },
});

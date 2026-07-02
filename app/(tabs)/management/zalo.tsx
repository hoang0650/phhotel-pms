import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aiApi } from '@/services/api/ai';
import { useAuth } from '@/contexts/AuthContext';
import { useHotel } from '@/contexts/HotelContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface ZaloMessage {
  id: string;
  page_id: string;
  sender_id: string;
  recipient_id?: string;
  sender_name?: string;
  sender_avatar?: string;
  text: string;
  attachments?: Array<{ type?: string; payload?: { url?: string } }>;
  direction: 'in' | 'out';
  timestamp: number;
  mid?: string;
}

interface ZaloOA {
  id: string;
  name?: string;
  display_name?: string;
  avatar?: string;
}

interface Conversation {
  sender_id: string;
  sender_name?: string;
  sender_avatar?: string;
  lastText: string;
  lastTime: number;
}

export default function ZaloManagementScreen() {
  const { user } = useAuth();
  const { selectedHotelId } = useHotel();
  const { language } = useLanguage();
  const [oas, setOas] = useState<ZaloOA[]>([]);
  const [selectedOaId, setSelectedOaId] = useState('');
  const [messages, setMessages] = useState<ZaloMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isBotActive, setIsBotActive] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [showOaModal, setShowOaModal] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const t = useMemo(() => ({
    title: language === 'vi' ? 'Quản lý Zalo OA' : 'Zalo OA Management',
    selectOa: language === 'vi' ? 'Chọn OA' : 'Select OA',
    conversations: language === 'vi' ? 'Cuộc hội thoại' : 'Conversations',
    emptyConversations: language === 'vi' ? 'Chưa có hội thoại nào' : 'No conversations yet',
    connect: language === 'vi' ? 'Kết nối OA' : 'Connect OA',
    refresh: language === 'vi' ? 'Làm mới' : 'Refresh',
    bot: language === 'vi' ? 'AI Bot' : 'AI Bot',
    on: language === 'vi' ? 'Bật' : 'On',
    off: language === 'vi' ? 'Tắt' : 'Off',
    send: language === 'vi' ? 'Gửi' : 'Send',
    typeMessage: language === 'vi' ? 'Nhập tin nhắn...' : 'Type a message...',
    noThread: language === 'vi' ? 'Chọn cuộc hội thoại để bắt đầu chat' : 'Select a conversation to start chatting',
    loadFailed: language === 'vi' ? 'Không thể tải dữ liệu Zalo OA.' : 'Failed to load Zalo OA data.',
    connectFailed: language === 'vi' ? 'Không thể mở trang kết nối Zalo OA.' : 'Failed to open Zalo OAuth page.',
    sendFailed: language === 'vi' ? 'Không thể gửi tin nhắn Zalo.' : 'Failed to send Zalo message.',
    image: language === 'vi' ? '[Hình ảnh]' : '[Image]',
    sticker: language === 'vi' ? '[Nhãn dán]' : '[Sticker]',
  }), [language]);

  const tenantId = String(selectedHotelId || user?.hotelId || user?.businessId || '');

  const displayedMessages = useMemo(() => {
    return messages
      .filter((message) =>
        (message.direction === 'in' && message.sender_id === selectedSenderId) ||
        (message.direction === 'out' && message.recipient_id === selectedSenderId)
      )
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, selectedSenderId]);

  const buildConversations = useCallback((nextMessages: ZaloMessage[]) => {
    const map = new Map<string, Conversation>();
    [...nextMessages]
      .sort((a, b) => b.timestamp - a.timestamp)
      .forEach((message) => {
        const partnerId = message.direction === 'in' ? message.sender_id : (message.recipient_id || '');
        if (!partnerId || map.has(partnerId)) return;
        const firstAttachment = message.attachments?.[0];
        let lastText = message.text || '';
        if (!lastText && firstAttachment?.type === 'image') lastText = t.image;
        if (!lastText && firstAttachment?.type === 'sticker') lastText = t.sticker;
        map.set(partnerId, {
          sender_id: partnerId,
          sender_name: message.sender_name || partnerId,
          sender_avatar: message.sender_avatar || '',
          lastText,
          lastTime: message.timestamp,
        });
      });
    setConversations(Array.from(map.values()));
  }, [t.image, t.sticker]);

  const loadBotStatus = useCallback(async (oaId: string) => {
    try {
      const status = await aiApi.getBotStatus(tenantId, oaId);
      setIsBotActive(!!status?.active);
    } catch {
      setIsBotActive(false);
    }
  }, [tenantId]);

  const loadMessages = useCallback(async (oaId: string) => {
    const response = await aiApi.getZaloMessages(tenantId, oaId);
    const rawMessages = Array.isArray(response) ? response : Array.isArray(response?.messages) ? response.messages : [];
    const normalized: ZaloMessage[] = rawMessages.map((item: any) => ({
      id: item.mid || `${item.timestamp || Date.now()}`,
      page_id: item.page_id || oaId,
      sender_id: item.sender_id,
      recipient_id: item.recipient_id,
      sender_name: item.sender_name,
      sender_avatar: item.sender_avatar,
      text: item.text || '',
      attachments: item.attachments,
      direction: item.direction === 'out' ? 'out' : 'in',
      timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
      mid: item.mid,
    }));
    setMessages(normalized);
    buildConversations(normalized);
  }, [buildConversations, tenantId]);

  const loadOas = useCallback(async () => {
    const response = await aiApi.getZaloOAs(tenantId);
    const nextOas = Array.isArray(response) ? response : Array.isArray(response?.oas) ? response.oas : [];
    setOas(nextOas);
    return nextOas;
  }, [tenantId]);

  const refreshData = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const nextOas = await loadOas();
      const nextOaId = nextOas.find((oa) => oa.id === selectedOaId)?.id || nextOas[0]?.id || '';
      setSelectedOaId(nextOaId);
      setSelectedSenderId('');
      if (nextOaId) {
        await Promise.all([loadMessages(nextOaId), loadBotStatus(nextOaId)]);
      } else {
        setMessages([]);
        setConversations([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadBotStatus, loadMessages, loadOas, selectedOaId, tenantId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!tenantId) return;
    const ws = new WebSocket(aiApi.getWebSocketUrl(tenantId));
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data || data.platform !== 'zalo') return;
        if (selectedOaId && data.page_id && data.page_id !== selectedOaId) return;
        setMessages((prev) => {
          if (data.mid && prev.some((item) => item.mid === data.mid)) return prev;
          const next = [...prev, {
            id: data.mid || `${Date.now()}`,
            page_id: data.page_id,
            sender_id: data.sender_id,
            recipient_id: data.recipient_id,
            sender_name: data.sender_name,
            sender_avatar: data.sender_avatar,
            text: data.text || '',
            attachments: data.attachments,
            direction: data.direction === 'out' ? 'out' : 'in',
            timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
            mid: data.mid,
          }];
          buildConversations(next);
          return next;
        });
      } catch {}
    };
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [buildConversations, selectedOaId, tenantId]);

  const changeOa = async (oaId: string) => {
    setSelectedOaId(oaId);
    setSelectedSenderId('');
    setShowOaModal(false);
    setIsLoading(true);
    try {
      await Promise.all([loadMessages(oaId), loadBotStatus(oaId)]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBot = async (enabled: boolean) => {
    if (!selectedOaId) return;
    setIsBotActive(enabled);
    try {
      await aiApi.toggleBot(tenantId, selectedOaId, enabled);
    } catch {
      setIsBotActive(!enabled);
    }
  };

  const connectOa = async () => {
    try {
      const result = await aiApi.getZaloOAuthUrl(tenantId);
      if (result?.url) {
        await Linking.openURL(result.url);
        setShowOaModal(false);
      }
    } catch {}
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedSenderId || !selectedOaId) return;
    setIsSending(true);
    try {
      const text = replyText.trim();
      await aiApi.sendZaloMessage(tenantId, selectedOaId, selectedSenderId, text);
      const outgoing: ZaloMessage = {
        id: `out_${Date.now()}`,
        page_id: selectedOaId,
        sender_id: selectedOaId,
        recipient_id: selectedSenderId,
        text,
        direction: 'out',
        timestamp: Date.now(),
      };
      setMessages((prev) => {
        const next = [...prev, outgoing];
        buildConversations(next);
        return next;
      });
      setReplyText('');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return language === 'vi' ? 'Vừa xong' : 'Just now';
    if (minutes < 60) return `${minutes}${language === 'vi' ? ' phút' : 'm'}`;
    if (hours < 24) return `${hours}${language === 'vi' ? ' giờ' : 'h'}`;
    return `${days}${language === 'vi' ? ' ngày' : 'd'}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <TouchableOpacity style={styles.iconButton} onPress={() => setShowConversations(true)}>
          <Ionicons name="chatbubbles-outline" size={22} color="#0f766e" />
        </TouchableOpacity>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.selectButton} onPress={() => setShowOaModal(true)}>
          <Text style={styles.selectLabel}>{t.selectOa}</Text>
          <Text style={styles.selectValue} numberOfLines={1}>
            {oas.find((item) => item.id === selectedOaId)?.display_name || oas.find((item) => item.id === selectedOaId)?.name || t.selectOa}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleButton, isBotActive && styles.toggleButtonActive]} onPress={() => toggleBot(!isBotActive)}>
          <Text style={[styles.toggleText, isBotActive && styles.toggleTextActive]}>{t.bot}: {isBotActive ? t.on : t.off}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={refreshData}>
          <Ionicons name="refresh" size={20} color="#334155" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0f766e" />
        </View>
      ) : selectedSenderId ? (
        <>
          <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
            {displayedMessages.map((message) => {
              const isOutgoing = message.direction === 'out';
              return (
                <View key={message.id} style={[styles.messageRow, isOutgoing ? styles.messageRowOut : styles.messageRowIn]}>
                  {!isOutgoing ? (
                    <Image
                      source={{ uri: message.sender_avatar || 'https://via.placeholder.com/40' }}
                      style={styles.avatar}
                    />
                  ) : null}
                  <View style={[styles.bubble, isOutgoing ? styles.bubbleOut : styles.bubbleIn]}>
                    {!!message.text && (
                      <Text style={[styles.messageText, isOutgoing && styles.messageTextOut]}>{message.text}</Text>
                    )}
                    {message.attachments?.map((attachment, index) => (
                      <Text key={`${message.id}-${index}`} style={[styles.attachmentText, isOutgoing && styles.messageTextOut]}>
                        {attachment?.type === 'image' ? t.image : attachment?.type === 'sticker' ? t.sticker : `[${attachment?.type || 'file'}]`}
                      </Text>
                    ))}
                    <Text style={styles.timeText}>{formatTime(message.timestamp)}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.replyBar}>
            <TextInput
              style={styles.replyInput}
              value={replyText}
              onChangeText={setReplyText}
              placeholder={t.typeMessage}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendReply} disabled={!replyText.trim() || isSending}>
              {isSending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.centerBox}>
          <Ionicons name="chatbubbles-outline" size={52} color="#94a3b8" />
          <Text style={styles.emptyText}>{t.noThread}</Text>
        </View>
      )}

      <Modal visible={showConversations} animationType="slide" onRequestClose={() => setShowConversations(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t.conversations}</Text>
            <TouchableOpacity onPress={() => setShowConversations(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {conversations.length === 0 ? (
              <Text style={styles.emptyListText}>{t.emptyConversations}</Text>
            ) : conversations.map((conversation) => (
              <TouchableOpacity
                key={conversation.sender_id}
                style={styles.listRow}
                onPress={() => {
                  setSelectedSenderId(conversation.sender_id);
                  setShowConversations(false);
                }}
              >
                <Image source={{ uri: conversation.sender_avatar || 'https://via.placeholder.com/50' }} style={styles.listAvatar} />
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>{conversation.sender_name || conversation.sender_id}</Text>
                  <Text style={styles.listSubtitle} numberOfLines={1}>{conversation.lastText}</Text>
                </View>
                <Text style={styles.listTime}>{formatTime(conversation.lastTime)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showOaModal} animationType="slide" onRequestClose={() => setShowOaModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t.selectOa}</Text>
            <TouchableOpacity onPress={() => setShowOaModal(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.primaryAction} onPress={connectOa}>
            <Ionicons name="link-outline" size={18} color="#fff" />
            <Text style={styles.primaryActionText}>{t.connect}</Text>
          </TouchableOpacity>
          <ScrollView>
            {oas.map((oa) => (
              <TouchableOpacity key={oa.id} style={styles.listRow} onPress={() => changeOa(oa.id)}>
                <Image source={{ uri: oa.avatar || 'https://via.placeholder.com/48' }} style={styles.listAvatar} />
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>{oa.display_name || oa.name || oa.id}</Text>
                  <Text style={styles.listSubtitle}>{oa.id}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  selectButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectLabel: { fontSize: 12, color: '#64748b' },
  selectValue: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginTop: 2 },
  toggleButton: {
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleButtonActive: { backgroundColor: '#0f766e' },
  toggleText: { color: '#334155', fontWeight: '600', fontSize: 12 },
  toggleTextActive: { color: '#fff' },
  iconButton: { padding: 8 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { marginTop: 12, color: '#64748b', textAlign: 'center' },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end' },
  messageRowIn: { justifyContent: 'flex-start' },
  messageRowOut: { justifyContent: 'flex-end' },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  bubbleIn: { backgroundColor: '#fff', borderTopLeftRadius: 4 },
  bubbleOut: { backgroundColor: '#0f766e', borderTopRightRadius: 4 },
  messageText: { color: '#111827', fontSize: 14, lineHeight: 20 },
  messageTextOut: { color: '#fff' },
  attachmentText: { marginTop: 4, color: '#475569' },
  timeText: { fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 4 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  replyInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  emptyListText: { padding: 24, textAlign: 'center', color: '#64748b' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  listAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  listContent: { flex: 1 },
  listTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  listSubtitle: { marginTop: 2, fontSize: 13, color: '#64748b' },
  listTime: { fontSize: 12, color: '#94a3b8', marginLeft: 8 },
  primaryAction: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f766e',
    margin: 16,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  primaryActionText: { color: '#fff', fontWeight: '700' },
});

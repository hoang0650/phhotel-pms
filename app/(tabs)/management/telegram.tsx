import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { AccessGuard } from '@/components/AccessGuard';

interface TgMessage {
  id: string;
  page_id: string;
  sender_id: string;
  recipient_id?: string;
  sender_name?: string;
  text: string;
  direction: 'in' | 'out';
  timestamp: number;
  mid?: string;
}

interface TelegramBot {
  id: string;
  name?: string;
  username?: string;
}

interface Conversation {
  sender_id: string;
  sender_name?: string;
  lastText: string;
  lastTime: number;
}

export default function TelegramManagementScreen() {
  const { user } = useAuth();
  const { selectedHotelId } = useHotel();
  const { language } = useLanguage();
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState('');
  const [messages, setMessages] = useState<TgMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState('');
  const [replyText, setReplyText] = useState('');
  const [botTokenInput, setBotTokenInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isBotActive, setIsBotActive] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [showBotModal, setShowBotModal] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const t = useMemo(() => ({
    title: language === 'vi' ? 'Quản lý Telegram' : 'Telegram Management',
    selectBot: language === 'vi' ? 'Chọn Bot' : 'Select Bot',
    conversations: language === 'vi' ? 'Cuộc hội thoại' : 'Conversations',
    noConversations: language === 'vi' ? 'Chưa có hội thoại nào' : 'No conversations yet',
    connect: language === 'vi' ? 'Kết nối Bot' : 'Connect Bot',
    tokenPlaceholder: language === 'vi' ? 'Nhập Bot Token' : 'Enter Bot Token',
    refresh: language === 'vi' ? 'Làm mới' : 'Refresh',
    bot: language === 'vi' ? 'AI Bot' : 'AI Bot',
    on: language === 'vi' ? 'Bật' : 'On',
    off: language === 'vi' ? 'Tắt' : 'Off',
    send: language === 'vi' ? 'Gửi' : 'Send',
    typeMessage: language === 'vi' ? 'Nhập tin nhắn...' : 'Type a message...',
    noThread: language === 'vi' ? 'Chọn cuộc hội thoại để bắt đầu chat' : 'Select a conversation to start chatting',
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

  const buildConversations = useCallback((nextMessages: TgMessage[]) => {
    const map = new Map<string, Conversation>();
    const nameMap = new Map<string, string>();
    nextMessages.forEach((message) => {
      if (message.direction === 'in' && message.sender_name) {
        nameMap.set(message.sender_id, message.sender_name);
      }
    });
    [...nextMessages]
      .sort((a, b) => b.timestamp - a.timestamp)
      .forEach((message) => {
        const partnerId = message.direction === 'in' ? message.sender_id : (message.recipient_id || '');
        if (!partnerId || map.has(partnerId)) return;
        map.set(partnerId, {
          sender_id: partnerId,
          sender_name: nameMap.get(partnerId) || message.sender_name || partnerId,
          lastText: message.text || '',
          lastTime: message.timestamp,
        });
      });
    setConversations(Array.from(map.values()));
  }, []);

  const loadBotStatus = useCallback(async (botId: string) => {
    try {
      const status = await aiApi.getBotStatus(tenantId, botId);
      setIsBotActive(!!status?.active);
    } catch {
      setIsBotActive(false);
    }
  }, [tenantId]);

  const loadMessages = useCallback(async (botId: string) => {
    const response = await aiApi.getTelegramMessages(tenantId, botId);
    const rawMessages = Array.isArray(response) ? response : Array.isArray(response?.messages) ? response.messages : [];
    const normalized: TgMessage[] = rawMessages.map((item: any) => ({
      id: item.mid || `${item.timestamp || Date.now()}`,
      page_id: item.page_id || botId,
      sender_id: item.sender_id,
      recipient_id: item.recipient_id,
      sender_name: item.sender_name,
      text: item.text || '',
      direction: item.direction === 'out' ? 'out' : 'in',
      timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
      mid: item.mid,
    }));
    setMessages(normalized);
    buildConversations(normalized);
  }, [buildConversations, tenantId]);

  const loadBots = useCallback(async () => {
    const response = await aiApi.getTelegramBots(tenantId);
    const nextBots = Array.isArray(response) ? response : Array.isArray(response?.bots) ? response.bots : [];
    setBots(nextBots);
    return nextBots;
  }, [tenantId]);

  const refreshData = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const nextBots = await loadBots();
      const nextBotId = nextBots.find((bot) => bot.id === selectedBotId)?.id || nextBots[0]?.id || '';
      setSelectedBotId(nextBotId);
      setSelectedSenderId('');
      if (nextBotId) {
        await Promise.all([loadMessages(nextBotId), loadBotStatus(nextBotId)]);
      } else {
        setMessages([]);
        setConversations([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadBotStatus, loadBots, loadMessages, selectedBotId, tenantId]);

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
        if (!data || data.platform !== 'telegram') return;
        if (selectedBotId && data.page_id && data.page_id !== selectedBotId) return;
        setMessages((prev) => {
          if (data.mid && prev.some((item) => item.mid === data.mid)) return prev;
          const next = [...prev, {
            id: data.mid || `${Date.now()}`,
            page_id: data.page_id,
            sender_id: data.sender_id,
            recipient_id: data.recipient_id,
            sender_name: data.sender_name,
            text: data.text || '',
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
  }, [buildConversations, selectedBotId, tenantId]);

  const changeBot = async (botId: string) => {
    setSelectedBotId(botId);
    setSelectedSenderId('');
    setShowBotModal(false);
    setIsLoading(true);
    try {
      await Promise.all([loadMessages(botId), loadBotStatus(botId)]);
    } finally {
      setIsLoading(false);
    }
  };

  const connectBot = async () => {
    if (!botTokenInput.trim()) return;
    setIsConnecting(true);
    try {
      await aiApi.connectTelegramBot(tenantId, botTokenInput.trim());
      setBotTokenInput('');
      await refreshData();
      setShowBotModal(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const toggleBot = async (enabled: boolean) => {
    if (!selectedBotId) return;
    setIsBotActive(enabled);
    try {
      await aiApi.toggleBot(tenantId, selectedBotId, enabled);
    } catch {
      setIsBotActive(!enabled);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedSenderId || !selectedBotId) return;
    setIsSending(true);
    try {
      const text = replyText.trim();
      await aiApi.sendTelegramMessage(tenantId, selectedBotId, selectedSenderId, text);
      const outgoing: TgMessage = {
        id: `out_${Date.now()}`,
        page_id: selectedBotId,
        sender_id: selectedBotId,
        recipient_id: selectedSenderId,
        sender_name: selectedBotId,
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
    <AccessGuard features={['telegram_messages']}>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <TouchableOpacity style={styles.iconButton} onPress={() => setShowConversations(true)}>
          <Ionicons name="chatbubbles-outline" size={22} color="#0f766e" />
        </TouchableOpacity>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.selectButton} onPress={() => setShowBotModal(true)}>
          <Text style={styles.selectLabel}>{t.selectBot}</Text>
          <Text style={styles.selectValue} numberOfLines={1}>
            {bots.find((item) => item.id === selectedBotId)?.name || bots.find((item) => item.id === selectedBotId)?.username || t.selectBot}
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
                  <View style={[styles.bubble, isOutgoing ? styles.bubbleOut : styles.bubbleIn]}>
                    {!!message.sender_name && !isOutgoing ? (
                      <Text style={styles.senderName}>{message.sender_name}</Text>
                    ) : null}
                    <Text style={[styles.messageText, isOutgoing && styles.messageTextOut]}>{message.text}</Text>
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
          <Ionicons name="paper-plane-outline" size={52} color="#94a3b8" />
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
              <Text style={styles.emptyListText}>{t.noConversations}</Text>
            ) : conversations.map((conversation) => (
              <TouchableOpacity
                key={conversation.sender_id}
                style={styles.listRow}
                onPress={() => {
                  setSelectedSenderId(conversation.sender_id);
                  setShowConversations(false);
                }}
              >
                <View style={styles.listAvatar}>
                  <Ionicons name="person-outline" size={20} color="#0f766e" />
                </View>
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

      <Modal visible={showBotModal} animationType="slide" onRequestClose={() => setShowBotModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t.selectBot}</Text>
            <TouchableOpacity onPress={() => setShowBotModal(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>
          <View style={styles.connectBox}>
            <TextInput
              style={styles.tokenInput}
              value={botTokenInput}
              onChangeText={setBotTokenInput}
              placeholder={t.tokenPlaceholder}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.primaryAction} onPress={connectBot} disabled={isConnecting || !botTokenInput.trim()}>
              {isConnecting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryActionText}>{t.connect}</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView>
            {bots.map((bot) => (
              <TouchableOpacity key={bot.id} style={styles.listRow} onPress={() => changeBot(bot.id)}>
                <View style={styles.listAvatar}>
                  <Ionicons name="logo-tux" size={20} color="#0f766e" />
                </View>
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>{bot.name || bot.username || bot.id}</Text>
                  <Text style={styles.listSubtitle}>{bot.username || bot.id}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      </SafeAreaView>
    </AccessGuard>
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
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  bubbleIn: { backgroundColor: '#fff', borderTopLeftRadius: 4 },
  bubbleOut: { backgroundColor: '#0f766e', borderTopRightRadius: 4 },
  senderName: { fontSize: 12, fontWeight: '700', color: '#0f766e', marginBottom: 4 },
  messageText: { color: '#111827', fontSize: 14, lineHeight: 20 },
  messageTextOut: { color: '#fff' },
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
  listAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { flex: 1 },
  listTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  listSubtitle: { marginTop: 2, fontSize: 13, color: '#64748b' },
  listTime: { fontSize: 12, color: '#94a3b8', marginLeft: 8 },
  connectBox: { padding: 16, gap: 12 },
  tokenInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  primaryAction: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: { color: '#fff', fontWeight: '700' },
});

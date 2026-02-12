import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  User,
  Phone,
  Mail,
  Crown,
  ChevronRight,
  Plus,
  Globe,
  AlertCircle,
  CheckCircle,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { bookingsApi, guestsApi, roomsApi } from '@/services/api';
import { Booking, Guest, Room } from '@/types/hotel';
import { useHotel } from '@/contexts/HotelContext';
import { Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { aiApi } from '@/services/api/ai';
import { useGuestDraftStore } from '@/stores/guestDraft';
import { useRouter } from 'expo-router';

export default function GuestsScreen() {
  const insets = useSafeAreaInsets();
  const { selectedHotelId, selectedHotel } = useHotel();
  const [searchQuery, setSearchQuery] = useState('');
  const [showVipOnly, setShowVipOnly] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [assignVisible, setAssignVisible] = useState(false);
  const [assignRoomId, setAssignRoomId] = useState<string | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    idNumber: '',
    nationality: 'Việt Nam',
    address: '',
    gender: '',
    dateOfBirth: '',
  });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrPhase, setOcrPhase] = useState<'upload' | 'scan' | 'process' | ''>('');
  const [ocrImages, setOcrImages] = useState<string[]>([]);
  const setGuestDraft = useGuestDraftStore(s => s.setDraft);
  const router = useRouter();

  const clearOcrImages = () => {
    setOcrImages([]);
  };

  const replaceOcrImageAt = async (index: number) => {
    const file = await pickSingleImage();
    if (!file) return;
    setOcrImages(prev => {
      const next = [...prev];
      next[index] = file.uri;
      return next;
    });
  };

  const closeCreateModal = () => {
    setCreateVisible(false);
    setOcrLoading(false);
    setOcrStatus('');
    setOcrPhase('');
    setOcrImages([]);
  };

  const effectiveHotelId = selectedHotelId || selectedHotel?.id;
  const { data: guests = [], isLoading, refetch } = useQuery({
    queryKey: ['guests', effectiveHotelId],
    queryFn: () => (effectiveHotelId ? guestsApi.getByHotel(effectiveHotelId) : []),
    enabled: !!effectiveHotelId,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', effectiveHotelId],
    queryFn: () => (effectiveHotelId ? bookingsApi.getByHotel(effectiveHotelId) : []),
    enabled: !!effectiveHotelId,
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms', effectiveHotelId],
    queryFn: () => (effectiveHotelId ? roomsApi.getAll(effectiveHotelId) : []),
    enabled: !!effectiveHotelId,
  });

  const normalizeName = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
  const normalizeEmail = (value: string) => value.toLowerCase().trim();
  const normalizePhone = (value: string) => value.replace(/[^\d+]/g, '');
  const normalizeIdNumber = (value: string) => value.replace(/\s+/g, '').trim();

  const guestStats = useMemo(() => {
    const stats = new Map<string, { totalStays: number; totalSpent: number }>();
    if (guests.length === 0 || bookings.length === 0) return stats;

    const tokenToGuestId = new Map<string, string>();
    guests.forEach((guest) => {
      if (guest.idNumber) tokenToGuestId.set(`id:${normalizeIdNumber(guest.idNumber)}`, guest.id);
      if (guest.phone) tokenToGuestId.set(`phone:${normalizePhone(guest.phone)}`, guest.id);
      if (guest.email) tokenToGuestId.set(`email:${normalizeEmail(guest.email)}`, guest.id);
      if (guest.name) tokenToGuestId.set(`name:${normalizeName(guest.name)}`, guest.id);
    });

    const getGuestIdForBooking = (booking: Booking) => {
      const tokens: string[] = [];
      if (booking.guestIdNumber) tokens.push(`id:${normalizeIdNumber(booking.guestIdNumber)}`);
      if (booking.guestPhone) tokens.push(`phone:${normalizePhone(booking.guestPhone)}`);
      if (booking.guestEmail) tokens.push(`email:${normalizeEmail(booking.guestEmail)}`);
      if (booking.guestName) tokens.push(`name:${normalizeName(booking.guestName)}`);
      for (const token of tokens) {
        const id = tokenToGuestId.get(token);
        if (id) return id;
      }
      return null;
    };

    const ensureStats = (guestId: string) => {
      const existing = stats.get(guestId);
      if (existing) return existing;
      const next = { totalStays: 0, totalSpent: 0 };
      stats.set(guestId, next);
      return next;
    };

    bookings.forEach((booking) => {
      const guestId = getGuestIdForBooking(booking);
      if (!guestId) return;
      const entry = ensureStats(guestId);
      if (booking.status !== 'cancelled') {
        entry.totalStays += 1;
      }
      const isPaid = booking.paymentStatus === 'paid' || booking.status === 'checked_out';
      if (isPaid) {
        entry.totalSpent += booking.paidAmount || booking.totalAmount || 0;
      }
    });

    return stats;
  }, [bookings, guests]);

  const availableRooms = useMemo(() => {
    return rooms.filter((room) => room.status === 'vacant');
  }, [rooms]);

  const computedGuests = useMemo(() => {
    if (guests.length === 0) return guests;
    return guests.map((guest) => {
      const stats = guestStats.get(guest.id);
      if (!stats) return guest;
      const isRegularGuest = (guest.guestType || 'regular') === 'regular';
      const totalStays = isRegularGuest ? (stats.totalStays > 0 ? 1 : 0) : stats.totalStays;
      return {
        ...guest,
        totalStays,
        totalSpent: stats.totalSpent,
        vipStatus: isRegularGuest ? false : (guest.vipStatus || stats.totalSpent > 3000000),
      };
    });
  }, [guests, guestStats]);

  const filteredGuests = useMemo(() => {
    return computedGuests.filter((guest) => {
      const matchesSearch =
        guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.phone.includes(searchQuery) ||
        guest.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesVip = !showVipOnly || guest.vipStatus;
      return matchesSearch && matchesVip;
    });
  }, [computedGuests, searchQuery, showVipOnly]);

  const vipCount = useMemo(() => computedGuests.filter((g) => g.vipStatus).length, [computedGuests]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(-2)
      .join('')
      .toUpperCase();
  };

  const getGuestTypeLabel = (type?: Guest['guestType']) => {
    if (type === 'frequent') return 'Khách quen';
    if (type === 'group') return 'Khách đoàn';
    return 'Khách lưu';
  };

  const getGenderLabel = (gender?: string) => {
    if (!gender) return '-';
    const value = gender.toLowerCase();
    if (value === 'male' || value === 'nam') return 'Nam';
    if (value === 'female' || value === 'nữ' || value === 'nu') return 'Nữ';
    return gender;
  };

  const renderGuestCard = (guest: Guest) => {
    return (
      <TouchableOpacity
        key={guest.id}
        style={styles.guestCard}
        activeOpacity={0.7}
        onPress={() => {
          setSelectedGuest(guest);
          setDetailVisible(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, guest.vipStatus && styles.avatarVip]}>
              <Text style={styles.avatarText}>{getInitials(guest.name)}</Text>
            </View>
            {guest.vipStatus && (
              <View style={styles.vipBadge}>
                <Crown size={10} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.guestInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.guestName}>{guest.name}</Text>
              {guest.vipStatus && (
                <View style={styles.vipTag}>
                  <Text style={styles.vipTagText}>VIP</Text>
                </View>
              )}
            </View>
            <View style={styles.nationalityRow}>
              <Globe size={12} color={Colors.light.textSecondary} />
              <Text style={styles.nationalityText}>{guest.nationality || 'Việt Nam'}</Text>
            </View>
          </View>
          <ChevronRight size={20} color={Colors.light.textSecondary} />
        </View>

        <View style={styles.contactRow}>
          {guest.phone && (
            <View style={styles.contactItem}>
              <Phone size={14} color={Colors.light.tint} />
              <Text style={styles.contactText}>{guest.phone}</Text>
            </View>
          )}
          {guest.email && (
            <View style={styles.contactItem}>
              <Mail size={14} color={Colors.light.tint} />
              <Text style={styles.contactText} numberOfLines={1}>{guest.email}</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{guest.totalStays}</Text>
            <Text style={styles.statLabel}>Lượt ở</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatCurrency(guest.totalSpent)}</Text>
            <Text style={styles.statLabel}>Tổng chi tiêu</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const pickSingleImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return null;
    const a = res.assets[0];
    const mime = (a as any).mimeType || 'image/jpeg';
    return { uri: a.uri, name: a.fileName || 'image.jpg', type: mime };
  };

  const pickTwoImages = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 2,
    });
    if (res.canceled || !res.assets || res.assets.length === 0) return [];
    return res.assets.slice(0, 2).map((a) => {
      const mime = (a as any).mimeType || 'image/jpeg';
      return { uri: a.uri, name: a.fileName || 'image.jpg', type: mime };
    });
  };

  const handleScanOneImage = async () => {
    setOcrLoading(true);
    setOcrPhase('upload');
    setOcrStatus('Đang chọn ảnh...');
    try {
      const file = await pickSingleImage();
      if (!file) return;
      setOcrImages([file.uri]);
      setOcrPhase('upload');
      setOcrStatus('Đang upload ảnh lên AI...');
      const data = await aiApi.ocr(file);
      setOcrPhase('scan');
      setOcrStatus('Đang scan OCR...');
      setOcrPhase('process');
      setOcrStatus('Đang xử lý kết quả...');
      const next = normalizeOcrData(data);
      setForm(prev => ({ ...prev, ...next }));
      setGuestDraft({
        fullName: next.fullName,
        phone: next.phone,
        idNumber: next.idNumber,
        nationality: next.nationality,
        address: next.address,
        gender: next.gender,
        dateOfBirth: next.dateOfBirth,
      });
    } catch (e: any) {
      console.warn('OCR error', e?.message || e);
    } finally {
      setOcrLoading(false);
      setOcrStatus('');
      setOcrPhase('');
    }
  };

  const handleScanTwoImages = async () => {
    setOcrLoading(true);
    setOcrPhase('upload');
    setOcrStatus('Đang chọn 2 ảnh...');
    try {
      const picked = await pickTwoImages();
      let front = picked[0];
      let back = picked[1];

      if (!front) return;
      if (!back) {
        setOcrImages([front.uri]);
        setOcrStatus('Đang chọn ảnh mặt sau...');
        const backPicked = await pickSingleImage();
        if (!backPicked) return;
        back = backPicked;
      }

      setOcrImages([front.uri, back.uri]);
      setOcrPhase('upload');
      setOcrStatus('Đang upload 2 ảnh lên AI...');
      const data = await aiApi.ocrCard(front, back);
      setOcrPhase('scan');
      setOcrStatus('Đang scan OCR...');
      setOcrPhase('process');
      setOcrStatus('Đang xử lý kết quả...');
      const next = normalizeOcrData(data);
      setForm(prev => ({ ...prev, ...next }));
      setGuestDraft({
        fullName: next.fullName,
        phone: next.phone,
        idNumber: next.idNumber,
        nationality: next.nationality,
        address: next.address,
        gender: next.gender,
        dateOfBirth: next.dateOfBirth,
      });
    } catch (e: any) {
      console.warn('OCR error', e?.message || e);
    } finally {
      setOcrLoading(false);
      setOcrStatus('');
      setOcrPhase('');
    }
  };

  const normalizeOcrData = (ocrData: any) => {
    const fullNameServer = typeof ocrData?.fullName === 'string' ? ocrData.fullName.trim() : '';
    const idNum = typeof ocrData?.idNumber === 'string' ? ocrData.idNumber.replace(/\s+/g, '').trim() : '';
    const nationality = ocrData?.nationality || 'Việt Nam';
    const gender = ocrData?.gender && (ocrData.gender === 'male' || ocrData.gender === 'female') ? ocrData.gender : '';
    const dateOfBirth = parseDateToISO(ocrData?.dateOfBirth) || '';
    const rawText = Array.isArray(ocrData?.rawText)
      ? ocrData.rawText
      : typeof ocrData?.rawText === 'string'
        ? ocrData.rawText.split(/\r?\n/)
        : [];
    const normLines = rawText.map((l: string) => (l || '').trim()).filter((l: string) => l.length > 0);
    let address = typeof ocrData?.address === 'string' ? ocrData.address : '';
    address = address.replace(/\bplace\s*of\s*birth\b/iu, '').replace(/(nơi\s*sinh|quê\s*quán)/iu, '').trim();
    if (!address && normLines.length) {
      address = buildAddressFromRaw(normLines);
    }
    const next = {
      fullName: fullNameServer || form.fullName,
      idNumber: idNum || form.idNumber,
      nationality,
      address: address || form.address,
    gender: gender || form.gender,
    dateOfBirth: dateOfBirth || form.dateOfBirth,
      phone: form.phone,
      email: form.email,
    };
    return next;
  };

  const parseDateToISO = (input: any): string | null => {
    if (!input) return null;
    if (input instanceof Date && !isNaN(input.getTime())) {
      const dd = String(input.getDate()).padStart(2, '0');
      const mm = String(input.getMonth() + 1).padStart(2, '0');
      const yyyy = String(input.getFullYear());
      return `${dd}/${mm}/${yyyy}`;
    }
    if (typeof input === 'string') {
      const s = input.replace(/[\.\-\s]/g, '/').trim();
      const parts = s.split('/');
      if (parts.length === 3) {
        const isYearFirst = parts[0].length === 4;
        const d = parseInt(isYearFirst ? parts[2] : parts[0], 10);
        const m = parseInt(parts[1], 10);
        const y = parseInt(isYearFirst ? parts[0] : parts[2], 10);
        if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          const dt = new Date(y, m - 1, d);
          if (!isNaN(dt.getTime())) {
            const mm = String(m).padStart(2, '0');
            const dd = String(d).padStart(2, '0');
            return `${dd}/${mm}/${y}`;
          }
        }
      }
    }
    return null;
  };
  const formatDateDisplay = (value?: string) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      const dd = String(parsed.getDate()).padStart(2, '0');
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const yyyy = String(parsed.getFullYear());
      return `${dd}/${mm}/${yyyy}`;
    }
    return parseDateToISO(value) || value;
  };
  const parseDateForBackend = (value?: string) => {
    if (!value) return undefined;
    const normalized = parseDateToISO(value);
    if (normalized) {
      const [dd, mm, yyyy] = normalized.split('/');
      if (yyyy && mm && dd) return `${yyyy}-${mm}-${dd}`;
    }
    const parsed = new Date(value);
    return !isNaN(parsed.getTime()) ? parsed.toISOString() : undefined;
  };
  const buildAddressFromRaw = (lines: string[]) => {
    const norm = lines.map(l => (l || '').trim()).filter(l => l.length > 0);
    const drop = /(họ\s*và\s*tên|ho\s*va\s*ten|full\s*name|giới\s*tính|gender|quốc\s*tịch|nationality|date\s*of|ngày|bộ\s*công\s*an|ministry|căn\s*cước|identity|^\d{9,12}$|<<)/iu;
    const stop = /(TP\.?\s*Hồ\s*Chí\s*Minh|Hà\s*Nội|Đà\s*Nẵng|Cần\s*Thơ|TP\.?|Thành\s*phố|Tỉnh)/iu;
    const hasKw = /(Thôn|Ấp|Xã|Phường|P\.?|Quận|Q\.?|Huyện|Đường|Số|Khu|KP|Khu\s*phố|Tổ|Block|Residence|Chung\s*cư|Apartment|Ward|District|Street|Road|City|Province|TP\.?|Thành\s*phố|Tỉnh)/iu;
    const parts: string[] = [];
    let started = false;
    for (let i = 0; i < norm.length; i++) {
      const l = norm[i];
      if (drop.test(l)) continue;
      if (!started && hasKw.test(l)) started = true;
      if (!started) continue;
      parts.push(l);
      if (stop.test(l)) break;
      if (/\bTP\.?\s*[A-ZÀÁẠẢÃÂĂÈÉẸẺẼÊÌÍỊỈĨÒÓỌỎÕÔƠÙÚỤỦŨƯỲÝỴỶỸ]/.test(l)) break;
      if (/\bTỉnh\b/i.test(l)) break;
    }
    let s = parts.join(', ');
    s = s.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim();
    s = s.replace(/Th(ù|ủ)\s*Thi(e|ê)m.*?TP\.\s*H(ồ|o)\s*Ch(i|í)\s*Minh/giu, '').trim();
    return s;
  };

  const handleSave = async () => {
    if (!effectiveHotelId) {
      Alert.alert('Thông báo', 'Vui lòng chọn khách sạn trước');
      return;
    }
    const payload = {
      hotelId: effectiveHotelId,
      guestType: 'regular',
      personalInfo: {
        fullName: form.fullName || 'Khách lẻ',
        idNumber: form.idNumber || undefined,
        nationality: form.nationality || undefined,
        gender: form.gender || undefined,
        dateOfBirth: parseDateForBackend(form.dateOfBirth),
      },
      contactInfo: {
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address ? { street: form.address } : undefined,
      },
    };
    const created = await guestsApi.create(payload);
    if (created) {
      closeCreateModal();
      refetch();
    }
  };

  const handleAssignDraft = () => {
    if (!effectiveHotelId) {
      Alert.alert('Thông báo', 'Vui lòng chọn khách sạn trước');
      return;
    }
    setAssignVisible(true);
  };

  const closeAssignModal = () => {
    setAssignVisible(false);
    setAssignRoomId(null);
  };

  const handleConfirmAssign = () => {
    if (!assignRoomId) {
      Alert.alert('Thông báo', 'Vui lòng chọn phòng');
      return;
    }
    setGuestDraft({
      fullName: form.fullName,
      phone: form.phone,
      email: form.email,
      idNumber: form.idNumber,
      nationality: form.nationality,
      address: form.address,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth,
    });
    closeCreateModal();
    closeAssignModal();
    router.push({ pathname: '/(tabs)/rooms', params: { assignRoomId } } as any);
  };

  if (isLoading && guests.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Đang tải danh sách khách hàng...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Khách hàng</Text>
          <Text style={styles.subtitle}>{selectedHotel?.name || 'Tất cả'} • {computedGuests.length} khách</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setCreateVisible(true)}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={18} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên, SĐT hoặc email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.light.textSecondary}
          />
        </View>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, !showVipOnly && styles.filterChipActive]}
          onPress={() => setShowVipOnly(false)}
        >
          <Text style={[styles.filterChipText, !showVipOnly && styles.filterChipTextActive]}>
            Tất cả ({computedGuests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, showVipOnly && styles.filterChipActiveVip]}
          onPress={() => setShowVipOnly(true)}
        >
          <Crown size={14} color={showVipOnly ? '#fff' : '#f59e0b'} />
          <Text style={[styles.filterChipText, showVipOnly && styles.filterChipTextActive]}>
            VIP ({vipCount})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.guestsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.guestsListContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {filteredGuests.map(renderGuestCard)}
        {filteredGuests.length === 0 && (
          <View style={styles.emptyState}>
            {guests.length === 0 ? (
              <>
                <AlertCircle size={48} color={Colors.light.textSecondary} />
                <Text style={styles.emptyText}>Chưa có dữ liệu khách hàng</Text>
                <Text style={styles.emptySubtext}>Kiểm tra kết nối API</Text>
              </>
            ) : (
              <>
                <User size={48} color={Colors.light.textSecondary} />
                <Text style={styles.emptyText}>Không tìm thấy khách hàng</Text>
              </>
            )}
          </View>
        )}
      </ScrollView>
      <Modal visible={detailVisible} transparent animationType="slide" onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thông tin khách</Text>
            </View>
            <View style={styles.detailList}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Tên khách</Text>
                <Text style={styles.detailValue}>{selectedGuest?.name || '-'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Giới tính</Text>
                <Text style={styles.detailValue}>{getGenderLabel(selectedGuest?.gender)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Ngày sinh</Text>
                <Text style={styles.detailValue}>{formatDateDisplay(selectedGuest?.dateOfBirth)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Loại khách</Text>
                <Text style={styles.detailValue}>{getGuestTypeLabel(selectedGuest?.guestType)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>CMND/CCCD</Text>
                <Text style={styles.detailValue}>{selectedGuest?.idNumber || '-'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Số điện thoại</Text>
                <Text style={styles.detailValue}>{selectedGuest?.phone || '-'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{selectedGuest?.email || '-'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Địa chỉ</Text>
                <Text style={styles.detailValue}>{selectedGuest?.address || '-'}</Text>
              </View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.footerBtn, { borderColor: Colors.light.border }]} onPress={() => setDetailVisible(false)}>
                <Text style={[styles.footerBtnText, { color: Colors.light.textSecondary }]}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={createVisible} transparent animationType="slide" onRequestClose={closeCreateModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm khách hàng</Text>
              {ocrLoading && <ActivityIndicator size="small" color={Colors.light.tint} />}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.scanBtn, { backgroundColor: '#0ea5e9' }]} onPress={handleScanOneImage}>
                <Text style={styles.scanBtnText}>Scan 1 ảnh</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.scanBtn, { backgroundColor: '#6366f1' }]} onPress={handleScanTwoImages}>
                <Text style={styles.scanBtnText}>Scan 2 mặt</Text>
              </TouchableOpacity>
            </View>
            {!!ocrStatus && (
              <View style={styles.ocrStatusRow}>
                <ActivityIndicator size="small" color={Colors.light.textSecondary} />
                <Text style={styles.ocrStatusText}>
                  {ocrPhase === 'upload' ? 'Upload: ' : ocrPhase === 'scan' ? 'Scan: ' : ocrPhase === 'process' ? 'Xử lý: ' : ''}
                  {ocrStatus}
                </Text>
              </View>
            )}
            {ocrImages.length > 0 && (
              <View style={styles.ocrPreviewRow}>
                <TouchableOpacity style={styles.ocrClearButton} onPress={clearOcrImages}>
                  <Text style={styles.ocrClearText}>Xóa ảnh đã chọn</Text>
                </TouchableOpacity>
                {ocrImages.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.ocrPreviewItem}>
                    <Image source={{ uri }} style={styles.ocrPreviewImage} />
                    {ocrImages.length > 1 && (
                      <Text style={styles.ocrPreviewLabel}>{index === 0 ? 'Mặt trước' : 'Mặt sau'}</Text>
                    )}
                    <TouchableOpacity style={styles.ocrReplaceButton} onPress={() => replaceOcrImageAt(index)}>
                      <Text style={styles.ocrReplaceText}>Chọn lại</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Họ và tên</Text>
              <TextInput style={styles.input} value={form.fullName} onChangeText={(v) => setForm({ ...form, fullName: v })} />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>SĐT</Text>
              <TextInput style={styles.input} value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>CMND/CCCD</Text>
              <TextInput style={styles.input} value={form.idNumber} onChangeText={(v) => setForm({ ...form, idNumber: v })} />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Giới tính</Text>
              <TextInput style={styles.input} value={form.gender} onChangeText={(v) => setForm({ ...form, gender: v })} placeholder="male hoặc female" />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Ngày sinh</Text>
      <TextInput style={styles.input} value={form.dateOfBirth} onChangeText={(v) => setForm({ ...form, dateOfBirth: v })} placeholder="dd/MM/yyyy" />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Quốc tịch</Text>
              <TextInput style={styles.input} value={form.nationality} onChangeText={(v) => setForm({ ...form, nationality: v })} />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Địa chỉ</Text>
              <TextInput style={styles.input} value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.footerBtn, { borderColor: Colors.light.border }]} onPress={closeCreateModal}>
                <Text style={[styles.footerBtnText, { color: Colors.light.textSecondary }]}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.footerPrimary, { backgroundColor: Colors.light.tint }]} onPress={handleSave}>
                <Text style={styles.footerPrimaryText}>Lưu</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.footerPrimary, { backgroundColor: '#13c2c2' }]} onPress={handleAssignDraft}>
                <Text style={styles.footerPrimaryText}>Assign vào Rooms</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={assignVisible} transparent animationType="slide" onRequestClose={closeAssignModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.assignModalCard]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn phòng</Text>
              {roomsLoading && <ActivityIndicator size="small" color={Colors.light.tint} />}
            </View>
            <ScrollView style={styles.assignList} contentContainerStyle={styles.assignListContent}>
              {availableRooms.length > 0 ? (
                availableRooms.map((room: Room) => {
                  const isSelected = assignRoomId === room.id;
                  return (
                    <TouchableOpacity
                      key={room.id}
                      style={[styles.assignRoomItem, isSelected && styles.assignRoomItemSelected]}
                      onPress={() => setAssignRoomId(room.id)}
                    >
                      <View>
                        <Text style={styles.assignRoomNumber}>Phòng {room.number}</Text>
                        <Text style={styles.assignRoomMeta}>
                          {(room.roomType || room.type) ?? '-'} • Tầng {room.floor}
                        </Text>
                      </View>
                      {isSelected && <CheckCircle size={20} color={Colors.light.tint} />}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.assignEmpty}>
                  <AlertCircle size={22} color={Colors.light.textSecondary} />
                  <Text style={styles.assignEmptyText}>Không có phòng trống</Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.footerBtn, { borderColor: Colors.light.border }]} onPress={closeAssignModal}>
                <Text style={[styles.footerBtnText, { color: Colors.light.textSecondary }]}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.footerPrimary, { backgroundColor: Colors.light.tint }]} onPress={handleConfirmAssign}>
                <Text style={styles.footerPrimaryText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: Colors.light.tint,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: Colors.light.tint,
  },
  filterChipActiveVip: {
    backgroundColor: '#f59e0b',
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500' as const,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  guestsList: {
    flex: 1,
  },
  guestsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  guestCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarVip: {
    backgroundColor: '#f59e0b',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  vipBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  guestInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guestName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  vipTag: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vipTagText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#f59e0b',
  },
  nationalityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  nationalityText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  contactText: {
    fontSize: 13,
    color: Colors.light.text,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    borderRadius: 10,
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.light.border,
    marginHorizontal: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  assignModalCard: {
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  assignList: {
    maxHeight: 360,
  },
  assignListContent: {
    paddingBottom: 12,
  },
  assignRoomItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 10,
  },
  assignRoomItemSelected: {
    borderColor: Colors.light.tint,
    backgroundColor: '#eef9f9',
  },
  assignRoomNumber: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  assignRoomMeta: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  assignEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  assignEmptyText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  detailList: {
    gap: 10,
    marginBottom: 12,
  },
  detailItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
    fontWeight: '600' as const,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500' as const,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  ocrStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  ocrStatusText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  ocrPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  ocrClearButton: {
    width: '100%',
    alignItems: 'flex-end',
  },
  ocrClearText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textDecorationLine: 'underline',
  },
  ocrPreviewItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  ocrPreviewImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    backgroundColor: '#eef2f7',
  },
  ocrPreviewLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  ocrReplaceButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
  },
  ocrReplaceText: {
    fontSize: 12,
    color: Colors.light.tint,
  },
  scanBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  scanBtnText: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  inputRow: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.light.text,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  footerBtnText: {
    fontWeight: '600' as const,
  },
  footerPrimary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  footerPrimaryText: {
    color: '#fff',
    fontWeight: '700' as const,
  },
});

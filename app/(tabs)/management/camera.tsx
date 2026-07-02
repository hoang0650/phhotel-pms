import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useHotel } from '@/contexts/HotelContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cameraApi, CameraAccessMode, CameraConfig, CameraProviderId } from '@/services/api/camera';

type CameraFormState = {
  name: string;
  provider: CameraProviderId | '';
  accessMode: CameraAccessMode;
  agentBaseUrl: string;
  agentToken: string;
  ipAddress: string;
  port: string;
  username: string;
  password: string;
  rtspPath: string;
  status: string;
  enableOcr: boolean;
  enableFaceRecognition: boolean;
  autoCheckin: boolean;
};

const createEmptyForm = (): CameraFormState => ({
  name: 'Camera Quay Le Tan',
  provider: '',
  accessMode: 'cloud',
  agentBaseUrl: '',
  agentToken: '',
  ipAddress: '',
  port: '554',
  username: 'admin',
  password: '',
  rtspPath: '/Streaming/Channels/101',
  status: 'active',
  enableOcr: true,
  enableFaceRecognition: false,
  autoCheckin: false,
});

const mapCameraToForm = (camera?: CameraConfig | null): CameraFormState => ({
  name: camera?.name || 'Camera Quay Le Tan',
  provider: (camera?.provider as CameraProviderId) || '',
  accessMode: (camera?.accessMode as CameraAccessMode) || 'cloud',
  agentBaseUrl: camera?.agentBaseUrl || '',
  agentToken: camera?.agentToken || '',
  ipAddress: camera?.ipAddress || '',
  port: String(camera?.port || 554),
  username: camera?.username || 'admin',
  password: camera?.password || '',
  rtspPath: camera?.rtspPath || '/Streaming/Channels/101',
  status: camera?.status || 'active',
  enableOcr: !!camera?.aiConfig?.enableOcr,
  enableFaceRecognition: !!camera?.aiConfig?.enableFaceRecognition,
  autoCheckin: !!camera?.aiConfig?.autoCheckin,
});

export default function CameraManagementScreen() {
  const { language } = useLanguage();
  const {
    hotels,
    selectedHotel,
    selectedHotelId,
    selectHotel,
    canSelectMultipleHotels,
  } = useHotel();
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [form, setForm] = useState<CameraFormState>(createEmptyForm());
  const [stats, setStats] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingAgent, setIsTestingAgent] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [agentStatus, setAgentStatus] = useState<string>('');

  const t = useMemo(() => ({
    title: language === 'vi' ? 'Camera Management' : 'Camera Management',
    hotel: language === 'vi' ? 'Khach san' : 'Hotel',
    camera: language === 'vi' ? 'Camera' : 'Camera',
    provider: language === 'vi' ? 'Nha cung cap' : 'Provider',
    accessMode: language === 'vi' ? 'Che do truy cap' : 'Access mode',
    cloud: language === 'vi' ? 'Cloud' : 'Cloud',
    agent: language === 'vi' ? 'Agent' : 'Agent',
    save: language === 'vi' ? 'Luu cau hinh' : 'Save config',
    testAgent: language === 'vi' ? 'Kiem tra agent' : 'Test agent',
    refreshStats: language === 'vi' ? 'Lam moi thong ke' : 'Refresh stats',
    status: language === 'vi' ? 'Trang thai' : 'Status',
    active: language === 'vi' ? 'Hoat dong' : 'Active',
    inactive: language === 'vi' ? 'Tam dung' : 'Inactive',
    stats: language === 'vi' ? 'Thong ke camera' : 'Camera stats',
    noHotel: language === 'vi' ? 'Chua co khach san duoc chon' : 'No selected hotel',
    noCameras: language === 'vi' ? 'Chua co camera nao duoc cau hinh' : 'No camera configured',
    saved: language === 'vi' ? 'Da dong bo cau hinh camera' : 'Camera configuration saved',
    saveFailed: language === 'vi' ? 'Luu cau hinh camera that bai' : 'Failed to save camera configuration',
    agentOk: language === 'vi' ? 'Agent dang hoat dong' : 'Agent is online',
    agentFailed: language === 'vi' ? 'Khong the ket noi agent' : 'Failed to connect to agent',
  }), [language]);

  const setField = <K extends keyof CameraFormState>(key: K, value: CameraFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const getDefaultRtspPath = (provider: CameraProviderId | '') =>
    provider === 'kbvision' ? '/cam/realmonitor?channel=1&subtype=0' : '/Streaming/Channels/101';

  const loadCameras = useCallback(async () => {
    if (!selectedHotelId) return;
    setIsLoading(true);
    try {
      const nextCameras = await cameraApi.getAll(selectedHotelId);
      setCameras(nextCameras);
      const activeCamera = nextCameras.find((item) => item.status === 'active') || nextCameras[0] || null;
      setSelectedCameraId(activeCamera?._id || null);
      setForm(activeCamera ? mapCameraToForm(activeCamera) : createEmptyForm());
    } finally {
      setIsLoading(false);
    }
  }, [selectedHotelId]);

  const loadStats = useCallback(async () => {
    if (!selectedHotelId) return;
    setIsLoadingStats(true);
    try {
      const nextStats = await cameraApi.getDashboardStats(selectedHotelId, statsPeriod);
      setStats(nextStats || null);
    } finally {
      setIsLoadingStats(false);
    }
  }, [selectedHotelId, statsPeriod]);

  useEffect(() => {
    loadCameras();
  }, [loadCameras]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const currentCamera = useMemo(
    () => cameras.find((item) => String(item._id) === String(selectedCameraId)) || null,
    [cameras, selectedCameraId]
  );

  const saveConfig = async () => {
    if (!selectedHotelId || !form.provider) return;
    setIsSaving(true);
    try {
      const payload: CameraConfig = {
        hotelId: selectedHotelId,
        name: form.name.trim(),
        provider: form.provider,
        accessMode: form.accessMode,
        agentBaseUrl: form.agentBaseUrl.trim(),
        agentToken: form.agentToken.trim(),
        ipAddress: form.ipAddress.trim(),
        port: Number(form.port || 554),
        username: form.username.trim(),
        password: form.password,
        rtspPath: form.rtspPath.trim(),
        status: form.status,
        aiConfig: {
          enableOcr: form.enableOcr,
          enableFaceRecognition: form.enableFaceRecognition,
          autoCheckin: form.autoCheckin,
        },
      };
      const saved = selectedCameraId
        ? await cameraApi.update(selectedCameraId, payload)
        : await cameraApi.save(payload);
      if (!saved?._id && !selectedCameraId) {
        throw new Error('SAVE_FAILED');
      }
      Alert.alert(t.title, t.saved);
      await loadCameras();
    } catch {
      Alert.alert(t.title, t.saveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const testAgent = async () => {
    if (!form.agentBaseUrl.trim()) return;
    setIsTestingAgent(true);
    try {
      const result = await cameraApi.testAgent(form.agentBaseUrl.trim(), form.agentToken.trim());
      const ok = !!result?.ok || !!result?.online;
      setAgentStatus(ok ? t.agentOk : (result?.message || t.agentFailed));
    } catch (error: any) {
      setAgentStatus(error?.message || t.agentFailed);
    } finally {
      setIsTestingAgent(false);
    }
  };

  const statsEntries = useMemo(() => {
    const source = stats || {};
    return [
      { key: 'totalGuestsToday', label: language === 'vi' ? 'Khach hom nay' : 'Guests today', value: source.totalGuestsToday ?? source.totalGuests ?? 0 },
      { key: 'checkedInToday', label: language === 'vi' ? 'Check-in hom nay' : 'Check-ins today', value: source.checkedInToday ?? 0 },
      { key: 'matchedFaceToday', label: language === 'vi' ? 'Nhan dien khuon mat' : 'Face matched', value: source.matchedFaceToday ?? source.recognizedToday ?? 0 },
      { key: 'occupancyRate', label: language === 'vi' ? 'Ty le lap day' : 'Occupancy', value: source.occupancyRate ?? 0 },
    ];
  }, [language, stats]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t.title}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t.hotel}</Text>
        {selectedHotel ? (
          <Text style={styles.currentHotel}>{selectedHotel.name}</Text>
        ) : (
          <Text style={styles.mutedText}>{t.noHotel}</Text>
        )}
        {canSelectMultipleHotels ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {hotels.map((hotel) => (
              <TouchableOpacity
                key={hotel.id}
                style={[styles.chip, hotel.id === selectedHotelId && styles.chipActive]}
                onPress={() => selectHotel(hotel.id)}
              >
                <Text style={[styles.chipText, hotel.id === selectedHotelId && styles.chipTextActive]}>{hotel.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>{t.camera}</Text>
          {isLoading ? <ActivityIndicator size="small" color="#0f766e" /> : null}
        </View>
        {cameras.length === 0 ? (
          <Text style={styles.mutedText}>{t.noCameras}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {cameras.map((camera) => (
              <TouchableOpacity
                key={camera._id || camera.name}
                style={[styles.chip, String(camera._id) === String(selectedCameraId) && styles.chipActive]}
                onPress={() => {
                  setSelectedCameraId(camera._id || null);
                  setForm(mapCameraToForm(camera));
                }}
              >
                <Text style={[styles.chipText, String(camera._id) === String(selectedCameraId) && styles.chipTextActive]}>
                  {camera.name || camera._id}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t.provider}</Text>
        <View style={styles.chipRowWrap}>
          {(['hikvision', 'kbvision'] as CameraProviderId[]).map((provider) => (
            <TouchableOpacity
              key={provider}
              style={[styles.chip, form.provider === provider && styles.chipActive]}
              onPress={() => {
                setField('provider', provider);
                if (!form.rtspPath.trim() || form.rtspPath === getDefaultRtspPath(form.provider)) {
                  setField('rtspPath', getDefaultRtspPath(provider));
                }
              }}
            >
              <Text style={[styles.chipText, form.provider === provider && styles.chipTextActive]}>{provider}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, styles.topGap]}>{t.accessMode}</Text>
        <View style={styles.chipRowWrap}>
          {(['cloud', 'agent'] as CameraAccessMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.chip, form.accessMode === mode && styles.chipActive]}
              onPress={() => setField('accessMode', mode)}
            >
              <Text style={[styles.chipText, form.accessMode === mode && styles.chipTextActive]}>{mode === 'cloud' ? t.cloud : t.agent}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>RTSP / Agent</Text>
        <TextInput style={styles.input} value={form.name} onChangeText={(value) => setField('name', value)} placeholder="Camera name" />
        <TextInput style={styles.input} value={form.ipAddress} onChangeText={(value) => setField('ipAddress', value)} placeholder="IP Address" autoCapitalize="none" />
        <TextInput style={styles.input} value={form.port} onChangeText={(value) => setField('port', value)} placeholder="Port" keyboardType="number-pad" />
        <TextInput style={styles.input} value={form.username} onChangeText={(value) => setField('username', value)} placeholder="Username" autoCapitalize="none" />
        <TextInput style={styles.input} value={form.password} onChangeText={(value) => setField('password', value)} placeholder="Password" secureTextEntry />
        <TextInput style={styles.input} value={form.rtspPath} onChangeText={(value) => setField('rtspPath', value)} placeholder="RTSP Path" autoCapitalize="none" />
        {form.accessMode === 'agent' ? (
          <>
            <TextInput style={styles.input} value={form.agentBaseUrl} onChangeText={(value) => setField('agentBaseUrl', value)} placeholder="Agent Base URL" autoCapitalize="none" />
            <TextInput style={styles.input} value={form.agentToken} onChangeText={(value) => setField('agentToken', value)} placeholder="Agent Token" autoCapitalize="none" />
          </>
        ) : null}
        <Text style={styles.label}>{t.status}</Text>
        <View style={styles.chipRowWrap}>
          {['active', 'inactive'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.chip, form.status === status && styles.chipActive]}
              onPress={() => setField('status', status)}
            >
              <Text style={[styles.chipText, form.status === status && styles.chipTextActive]}>
                {status === 'active' ? t.active : t.inactive}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>AI Config</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>OCR</Text>
          <Switch value={form.enableOcr} onValueChange={(value) => setField('enableOcr', value)} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Face Recognition</Text>
          <Switch value={form.enableFaceRecognition} onValueChange={(value) => setField('enableFaceRecognition', value)} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Auto Check-in</Text>
          <Switch value={form.autoCheckin} onValueChange={(value) => setField('autoCheckin', value)} />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>{t.stats}</Text>
          {isLoadingStats ? <ActivityIndicator size="small" color="#0f766e" /> : null}
        </View>
        <View style={styles.chipRowWrap}>
          {(['day', 'week', 'month'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.chip, statsPeriod === period && styles.chipActive]}
              onPress={() => setStatsPeriod(period)}
            >
              <Text style={[styles.chipText, statsPeriod === period && styles.chipTextActive]}>{period}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.statsGrid}>
          {statsEntries.map((item) => (
            <View key={item.key} style={styles.statCard}>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={saveConfig} disabled={isSaving || !selectedHotelId || !form.provider}>
          {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>{t.save}</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton, form.accessMode !== 'agent' && styles.disabledButton]}
          onPress={testAgent}
          disabled={isTestingAgent || form.accessMode !== 'agent'}
        >
          {isTestingAgent ? <ActivityIndicator size="small" color="#0f766e" /> : <Text style={styles.secondaryButtonText}>{t.testAgent}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={loadStats}>
          <Text style={styles.secondaryButtonText}>{t.refreshStats}</Text>
        </TouchableOpacity>
        {agentStatus ? <Text style={styles.agentStatus}>{agentStatus}</Text> : null}
        {currentCamera?._id ? <Text style={styles.cameraMeta}>ID: {currentCamera._id}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 14 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  currentHotel: { fontSize: 15, color: '#0f766e', fontWeight: '600' },
  mutedText: { color: '#64748b' },
  chipRow: { gap: 8, paddingTop: 4, paddingBottom: 2 },
  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  chipActive: { backgroundColor: '#0f766e' },
  chipText: { color: '#334155', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topGap: { marginTop: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#0f172a',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  switchLabel: { fontSize: 15, color: '#0f172a' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: { fontSize: 20, fontWeight: '700', color: '#0f766e' },
  statLabel: { marginTop: 4, fontSize: 12, color: '#64748b' },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: { backgroundColor: '#0f766e' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  secondaryButtonText: { color: '#0f766e', fontWeight: '700' },
  disabledButton: { opacity: 0.5 },
  agentStatus: { color: '#334155', lineHeight: 20 },
  cameraMeta: { color: '#94a3b8', fontSize: 12 },
});

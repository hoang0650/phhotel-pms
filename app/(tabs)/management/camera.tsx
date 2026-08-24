import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
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
import {
  buildCameraPayload,
  cameraApi,
  CameraAccessMode,
  CameraConfig,
  CameraProviderId,
  LabelZone,
  StaffAssignment,
  StaffLabelRole,
} from '@/services/api/camera';
import { staffsApi } from '@/services/api/staffs';
import { Staff } from '@/types/hotel';
import { AccessGuard } from '@/components/AccessGuard';
import {
  buildAgentBaseUrlFromHost,
  defaultRoleFromZone,
  getAgentHealthUrl,
  getDefaultRtspPath,
  isBlockedAgentApiUrl,
  isPrivateCameraIp,
  normalizeAgentBaseUrl,
  normalizeRtspPath,
} from '@/utils/camera-config';

type FrameOverlay = {
  id: string;
  label: string;
  color: string;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
};

type CameraFormState = {
  name: string;
  provider: CameraProviderId | '';
  accessMode: CameraAccessMode;
  agentBaseUrl: string;
  agentToken: string;
  agentHostInput: string;
  ipAddress: string;
  port: string;
  username: string;
  password: string;
  rtspPath: string;
  status: string;
  enableOcr: boolean;
  enableFaceRecognition: boolean;
  enableGuestLabels: boolean;
  enableStayEstimate: boolean;
  autoCheckin: boolean;
  labelZone: LabelZone;
};

const createEmptyForm = (): CameraFormState => ({
  name: 'Camera Quầy Lễ Tân',
  provider: '',
  accessMode: 'cloud',
  agentBaseUrl: '',
  agentToken: '',
  agentHostInput: 'localhost',
  ipAddress: '',
  port: '554',
  username: 'admin',
  password: '',
  rtspPath: '/Streaming/Channels/101',
  status: 'active',
  enableOcr: true,
  enableFaceRecognition: false,
  enableGuestLabels: true,
  enableStayEstimate: true,
  autoCheckin: false,
  labelZone: 'general',
});

const mapCameraToForm = (camera?: CameraConfig | null): CameraFormState => ({
  name: camera?.name || 'Camera Quầy Lễ Tân',
  provider: (camera?.provider as CameraProviderId) || '',
  accessMode: (camera?.accessMode as CameraAccessMode) || 'cloud',
  agentBaseUrl: camera?.agentBaseUrl || '',
  agentToken: camera?.agentToken || '',
  agentHostInput: 'localhost',
  ipAddress: camera?.ipAddress || '',
  port: String(camera?.port || 554),
  username: camera?.username || 'admin',
  password: camera?.password || '',
  rtspPath: normalizeRtspPath(
    camera?.rtspPath || getDefaultRtspPath((camera?.provider as CameraProviderId) || 'hikvision'),
    camera?.provider
  ),
  status: camera?.status || 'active',
  enableOcr: camera?.aiConfig?.enableOcr !== false,
  enableFaceRecognition: !!camera?.aiConfig?.enableFaceRecognition,
  enableGuestLabels: camera?.aiConfig?.enableGuestLabels !== false,
  enableStayEstimate: camera?.aiConfig?.enableStayEstimate !== false,
  autoCheckin: !!camera?.aiConfig?.autoCheckin,
  labelZone: (camera?.aiConfig?.labelZone as LabelZone) || 'general',
});

const mapStaffAssignments = (camera?: CameraConfig | null): StaffAssignment[] =>
  (camera?.aiConfig?.staffAssignments || [])
    .filter((item) => item?.staffId && (item.role === 'receptionist' || item.role === 'housekeeper'))
    .map((item) => ({
      staffId: String(item.staffId),
      name: item.name || '',
      role: item.role as StaffLabelRole,
    }));

const staffDisplayName = (staff: Staff): string => {
  const name = [staff.personalInfo?.lastName, staff.personalInfo?.firstName].filter(Boolean).join(' ').trim();
  return name || staff.id;
};

const labelColor = (raw: unknown): string => {
  const value = String(raw || '').toLowerCase();
  if (value.includes('reception') || value.includes('lễ tân')) return '#1677ff';
  if (value.includes('house') || value.includes('buồng')) return '#722ed1';
  if (value.includes('guest') || value.includes('khách')) return '#52c41a';
  if (value.includes('staff') || value.includes('nhân')) return '#fa8c16';
  return '#13c2c2';
};

const buildOverlaysFromProcessResult = (res: Record<string, any> | null): FrameOverlay[] => {
  if (!res) return [];
  const frameW = Number(res.frameWidth) || 0;
  const frameH = Number(res.frameHeight) || 0;
  if (!frameW || !frameH) return [];

  const persons: any[] = Array.isArray(res.persons) ? res.persons : [];
  const faces: any[] = Array.isArray(res.faces) ? res.faces : [];
  const overlays: FrameOverlay[] = [];

  const pushBBox = (id: string, bbox: number[], label: string, color: string) => {
    if (!bbox || bbox.length < 4) return;
    const [x1, y1, x2, y2] = bbox;
    overlays.push({
      id,
      label,
      color,
      leftPct: Math.max(0, (x1 / frameW) * 100),
      topPct: Math.max(0, (y1 / frameH) * 100),
      widthPct: Math.max(2, ((x2 - x1) / frameW) * 100),
      heightPct: Math.max(2, ((y2 - y1) / frameH) * 100),
    });
  };

  persons.forEach((person, idx) => {
    const bbox = Array.isArray(person?.bbox) ? person.bbox.map(Number) : null;
    if (!bbox) return;
    const face = faces.find((item) => item?.trackId != null && item.trackId === person?.trackId) || faces[idx];
    const label =
      String(face?.labelVi || face?.label || person?.labelVi || person?.label || `P${idx + 1}`);
    pushBBox(String(person?.trackId ?? idx), bbox, label, labelColor(label));
  });

  if (!overlays.length) {
    faces.forEach((face, idx) => {
      const bbox = Array.isArray(face?.bbox) ? face.bbox.map(Number) : null;
      if (!bbox) return;
      const label = String(face?.labelVi || face?.label || `F${idx + 1}`);
      pushBBox(`face-${face?.trackId ?? idx}`, bbox, label, labelColor(label));
    });
  }

  return overlays;
};

export default function CameraManagementScreen() {
  const { language } = useLanguage();
  const {
    hotels,
    selectedHotel,
    selectedHotelId,
    selectHotel,
    canSelectMultipleHotels,
  } = useHotel();

  const [currentStep, setCurrentStep] = useState(0);
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [form, setForm] = useState<CameraFormState>(createEmptyForm());
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);
  const [hotelStaff, setHotelStaff] = useState<Staff[]>([]);
  const [assignStaffId, setAssignStaffId] = useState<string | null>(null);
  const [assignRole, setAssignRole] = useState<StaffLabelRole>('receptionist');
  const [stats, setStats] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingAgent, setIsTestingAgent] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isAssigningStaff, setIsAssigningStaff] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [agentOnline, setAgentOnline] = useState<boolean | null>(null);
  const [agentError, setAgentError] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isPreviewRunning, setIsPreviewRunning] = useState(false);
  const [isPreviewEnlarged, setIsPreviewEnlarged] = useState(false);
  const [frameOverlays, setFrameOverlays] = useState<FrameOverlay[]>([]);
  const selectedCameraIdRef = useRef<string | null>(null);
  const previewBusyRef = useRef(false);
  const isPreviewRunningRef = useRef(false);
  selectedCameraIdRef.current = selectedCameraId;
  isPreviewRunningRef.current = isPreviewRunning;

  const t = useMemo(() => {
    const vi = language === 'vi';
    return {
      title: vi ? 'Cấu hình Camera AI' : 'Camera AI Configuration',
      stepProvider: vi ? 'Nhà cung cấp' : 'Provider',
      stepConnection: vi ? 'Kết nối' : 'Connection',
      stepAi: vi ? 'Tích hợp AI' : 'AI Integration',
      hotel: vi ? 'Khách sạn' : 'Hotel',
      camera: vi ? 'Camera' : 'Camera',
      provider: vi ? 'Nhà cung cấp' : 'Provider',
      accessMode: vi ? 'Chế độ truy cập' : 'Access mode',
      cloud: vi ? 'Cloud' : 'Cloud',
      agent: vi ? 'Máy khách sạn (Agent)' : 'Hotel PC (Agent)',
      save: vi ? 'Lưu & đồng bộ' : 'Save & sync',
      testAgent: vi ? 'Kiểm tra Agent' : 'Test agent',
      refreshStats: vi ? 'Làm mới thống kê' : 'Refresh stats',
      status: vi ? 'Trạng thái' : 'Status',
      active: vi ? 'Hoạt động' : 'Active',
      inactive: vi ? 'Tạm dừng' : 'Inactive',
      stats: vi ? 'Thống kê AI' : 'AI stats',
      noHotel: vi ? 'Chưa chọn khách sạn' : 'No hotel selected',
      noCameras: vi ? 'Chưa có camera — cấu hình trên web hoặc tạo mới tại đây' : 'No cameras yet',
      saved: vi ? 'Đã đồng bộ cấu hình camera với backend' : 'Camera configuration synced',
      saveFailed: vi ? 'Lưu cấu hình camera thất bại' : 'Failed to save camera configuration',
      agentOk: vi ? 'Agent online' : 'Agent is online',
      agentFailed: vi ? 'Không thể kết nối agent' : 'Failed to connect to agent',
      agentUrlRequired: vi ? 'Vui lòng nhập URL Agent (copy từ BAT_DAU.bat trên web)' : 'Enter Agent URL from web BAT_DAU.bat',
      agentUrlBlocked: vi ? 'URL không được trỏ vào API production' : 'URL must not point to production API',
      agentUrlWarning: vi
        ? 'URL phải khớp dòng https://... mà BAT_DAU.bat in ra trên máy khách sạn. Cấu hình trên web sẽ tự đồng bộ sang app.'
        : 'URL must match BAT_DAU.bat output on the hotel PC. Web config syncs to this app.',
      agentHostPlaceholder: vi ? 'IP máy chạy agent (VD: 192.168.1.50)' : 'Agent host IP',
      createUrl: vi ? 'Tạo URL' : 'Build URL',
      useLocalhost: vi ? 'localhost' : 'localhost',
      openHealth: vi ? 'Mở /health' : 'Open /health',
      applySavedUrl: vi ? 'Dùng URL đã lưu' : 'Use saved URL',
      privateIpHint: vi
        ? 'IP camera là LAN. Chế độ Agent proxy snapshot qua máy khách sạn — khuyến nghị dùng Agent.'
        : 'Camera IP is on LAN. Agent mode proxies via hotel PC.',
      next: vi ? 'Tiếp tục' : 'Next',
      back: vi ? 'Quay lại' : 'Back',
      finish: vi ? 'Hoàn tất' : 'Finish',
      selectProvider: vi ? 'Chọn nhà cung cấp camera' : 'Select camera provider',
      rtspTemplate: vi ? 'Dùng mẫu RTSP' : 'Use RTSP template',
      labelZone: vi ? 'Vùng camera' : 'Camera zone',
      zoneReception: vi ? 'Quầy lễ tân' : 'Reception',
      zoneHousekeeping: vi ? 'Buồng phòng' : 'Housekeeping',
      zoneGeneral: vi ? 'Chung' : 'General',
      guestLabels: vi ? 'Nhãn dán nhận diện' : 'Guest labels',
      stayEstimate: vi ? 'Ước tính lưu trú' : 'Stay estimate',
      assignStaff: vi ? 'Gán nhân viên' : 'Assign staff',
      assignAdd: vi ? 'Gán nhãn' : 'Assign label',
      assignEmpty: vi ? 'Chưa gán nhân viên' : 'No staff assigned',
      roleReceptionist: vi ? 'Lễ tân' : 'Receptionist',
      roleHousekeeper: vi ? 'Buồng phòng' : 'Housekeeper',
      kpiStays: vi ? 'Lượt lưu trú' : 'Stays',
      kpiRooms: vi ? 'Phòng phát sinh' : 'Rooms used',
      kpiGuests: vi ? 'Khách' : 'Guests',
      kpiReturningStays: vi ? 'Lượt khách quen' : 'Returning stays',
      kpiReturningGuests: vi ? 'Khách quen' : 'Returning guests',
      statsEmpty: vi ? 'Chưa có dữ liệu thống kê' : 'No stats yet',
      lastLabel: vi ? 'Nhãn gần nhất' : 'Last label',
      syncedFromWeb: vi ? 'Đã tải cấu hình từ backend (đồng bộ web)' : 'Loaded from backend (web sync)',
      providerRequired: vi ? 'Chọn nhà cung cấp trước' : 'Select a provider first',
      fillConnection: vi ? 'Nhập đủ thông tin kết nối' : 'Fill connection details',
      videoStream: vi ? 'Kiểm tra luồng Video' : 'Check video stream',
      previewPlaceholder: vi ? 'Luồng camera sẽ hiển thị tại đây' : 'Camera stream will appear here',
      testConnection: vi ? 'Test kết nối' : 'Test connection',
      liveView: vi ? 'Xem trực tuyến' : 'Live view',
      stopPreview: vi ? 'Dừng' : 'Stop',
      enlargeView: vi ? 'Phóng to' : 'Enlarge',
      enlargeHint: vi ? 'Bấm khung hình để phóng to xem rõ hơn.' : 'Tap the frame to enlarge.',
      enlargeTitle: vi ? 'Khung camera AI' : 'AI camera frame',
      closeEnlarge: vi ? 'Đóng' : 'Close',
      selectCameraFirst: vi ? 'Vui lòng lưu / chọn camera trước' : 'Save or select a camera first',
      snapshotOk: vi ? 'Đã lấy khung hình camera' : 'Camera snapshot loaded',
      snapshotFail: vi ? 'Không lấy được khung hình camera' : 'Failed to load camera snapshot',
      labelsOn: vi ? 'Nhãn dán ON' : 'Labels ON',
    };
  }, [language]);

  const setField = <K extends keyof CameraFormState>(key: K, value: CameraFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const applyCameraSelection = useCallback((camera: CameraConfig | null) => {
    setForm(camera ? mapCameraToForm(camera) : createEmptyForm());
    setStaffAssignments(mapStaffAssignments(camera));
    setAssignRole(defaultRoleFromZone(camera?.aiConfig?.labelZone));
    setAssignStaffId(null);
    setAgentOnline(null);
    setAgentError('');
  }, []);

  const loadCameras = useCallback(async () => {
    if (!selectedHotelId) return;
    setIsLoading(true);
    try {
      const nextCameras = await cameraApi.getAll(selectedHotelId);
      setCameras(nextCameras);
      const keepId = selectedCameraIdRef.current ? String(selectedCameraIdRef.current) : null;
      const kept = keepId ? nextCameras.find((item) => String(item._id) === keepId) : null;
      const activeCamera = kept || nextCameras.find((item) => item.status === 'active') || nextCameras[0] || null;
      setSelectedCameraId(activeCamera?._id || null);
      applyCameraSelection(activeCamera);
    } finally {
      setIsLoading(false);
    }
  }, [selectedHotelId, applyCameraSelection]);

  const loadHotelStaff = useCallback(async () => {
    if (!selectedHotelId) {
      setHotelStaff([]);
      return;
    }
    const rows = await staffsApi.getAll(selectedHotelId);
    setHotelStaff(rows.filter((staff) => staff.employmentInfo?.status !== 'terminated'));
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
    loadHotelStaff();
  }, [loadCameras, loadHotelStaff]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    setAssignRole(defaultRoleFromZone(form.labelZone));
  }, [form.labelZone]);

  const stopPreview = useCallback(() => {
    setIsPreviewRunning(false);
    setFrameOverlays([]);
    setPreviewError('');
  }, []);

  useEffect(() => {
    stopPreview();
    setPreviewImageUrl(null);
    setIsPreviewEnlarged(false);
  }, [selectedCameraId, stopPreview]);

  useEffect(() => {
    if (!isPreviewRunning || !selectedCameraId) return;

    let cancelled = false;
    const tick = async () => {
      if (cancelled || previewBusyRef.current || !isPreviewRunningRef.current) return;
      previewBusyRef.current = true;
      try {
        const dataUrl = await cameraApi.getSnapshotDataUrl(selectedCameraId);
        if (cancelled || !dataUrl) return;
        setPreviewImageUrl(dataUrl);
        setPreviewError('');
        if (form.enableGuestLabels) {
          const processed = await cameraApi.processFrameLive(selectedCameraId, dataUrl);
          if (!cancelled) {
            setFrameOverlays(buildOverlaysFromProcessResult(processed));
          }
        } else if (!cancelled) {
          setFrameOverlays([]);
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewError(error instanceof Error ? error.message : t.snapshotFail);
        }
      } finally {
        previewBusyRef.current = false;
      }
    };

    void tick();
    const timer = setInterval(() => {
      void tick();
    }, form.enableGuestLabels ? 2500 : 900);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [form.enableGuestLabels, isPreviewRunning, selectedCameraId, t.snapshotFail]);

  const fetchSnapshotOnce = useCallback(
    async (showToast: boolean) => {
      if (!selectedCameraId) {
        Alert.alert(t.title, t.selectCameraFirst);
        return;
      }
      setIsTestingConnection(true);
      setPreviewError('');
      try {
        const dataUrl = await cameraApi.getSnapshotDataUrl(selectedCameraId);
        if (!dataUrl) throw new Error(t.snapshotFail);
        setPreviewImageUrl(dataUrl);
        if (showToast) Alert.alert(t.title, t.snapshotOk);
      } catch (error) {
        const message = error instanceof Error ? error.message : t.snapshotFail;
        setPreviewError(message);
        if (showToast) Alert.alert(t.title, message);
      } finally {
        setIsTestingConnection(false);
      }
    },
    [selectedCameraId, t.selectCameraFirst, t.snapshotFail, t.snapshotOk, t.title]
  );

  const startPreview = useCallback(async () => {
    if (!selectedCameraId) {
      Alert.alert(t.title, t.selectCameraFirst);
      return;
    }
    setIsPreviewRunning(true);
    setPreviewError('');
    try {
      const dataUrl = await cameraApi.getSnapshotDataUrl(selectedCameraId);
      if (dataUrl) {
        setPreviewImageUrl(dataUrl);
      }
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : t.snapshotFail);
    }
  }, [selectedCameraId, t.selectCameraFirst, t.snapshotFail, t.title]);

  const openPreviewEnlarge = useCallback(() => {
    if (!previewImageUrl) return;
    setIsPreviewEnlarged(true);
  }, [previewImageUrl]);

  const renderPreviewFrame = (enlarged: boolean) => (
    <Pressable
      style={[styles.previewBox, enlarged && styles.previewBoxEnlarge]}
      onPress={enlarged ? undefined : openPreviewEnlarge}
      disabled={!previewImageUrl || enlarged}
    >
      {!previewImageUrl && !isTestingConnection ? (
        <View style={styles.previewPlaceholder}>
          <Text style={styles.previewPlaceholderText}>{t.previewPlaceholder}</Text>
        </View>
      ) : null}
      {isTestingConnection ? <ActivityIndicator size="large" color="#0f766e" /> : null}
      {previewImageUrl ? (
        <Image
          source={{ uri: previewImageUrl }}
          style={[styles.previewImage, enlarged && styles.previewImageEnlarge]}
          resizeMode="contain"
        />
      ) : null}
      {frameOverlays.map((overlay) => (
        <View
          key={overlay.id}
          style={[
            styles.frameSticker,
            {
              left: `${overlay.leftPct}%`,
              top: `${overlay.topPct}%`,
              width: `${overlay.widthPct}%`,
              height: `${overlay.heightPct}%`,
              borderColor: overlay.color,
            },
          ]}
        >
          <Text style={[styles.frameStickerTag, { backgroundColor: overlay.color }]} numberOfLines={1}>
            {overlay.label}
          </Text>
        </View>
      ))}
      {previewImageUrl && !enlarged ? (
        <TouchableOpacity style={styles.enlargeBtn} onPress={openPreviewEnlarge}>
          <Text style={styles.enlargeBtnText}>{t.enlargeView}</Text>
        </TouchableOpacity>
      ) : null}
    </Pressable>
  );

  const currentCamera = useMemo(
    () => cameras.find((item) => String(item._id) === String(selectedCameraId)) || null,
    [cameras, selectedCameraId]
  );

  const latestStatsPoint = useMemo(() => {
    const points = stats?.points;
    if (Array.isArray(points) && points.length > 0) {
      return points[points.length - 1];
    }
    return null;
  }, [stats]);

  const buildPayload = useCallback(
    (includePassword = true): CameraConfig =>
      buildCameraPayload(
        {
          hotelId: selectedHotelId || undefined,
          name: form.name,
          provider: form.provider || undefined,
          accessMode: form.accessMode,
          agentBaseUrl: form.agentBaseUrl,
          agentToken: form.agentToken,
          ipAddress: form.ipAddress,
          port: Number(form.port || 554),
          username: form.username,
          password: form.password,
          rtspPath: form.rtspPath,
          status: form.status,
          aiConfig: {
            enableOcr: form.enableOcr,
            enableFaceRecognition: form.enableFaceRecognition,
            enableGuestLabels: form.enableGuestLabels,
            enableStayEstimate: form.enableStayEstimate,
            autoCheckin: form.autoCheckin,
            labelZone: form.labelZone,
            staffAssignments,
          },
        },
        { includePassword }
      ),
    [form, selectedHotelId, staffAssignments]
  );

  const validateStep = (step: number): boolean => {
    if (step === 0 && !form.provider) {
      Alert.alert(t.title, t.providerRequired);
      return false;
    }
    if (step === 1) {
      if (!form.ipAddress.trim() || !form.username.trim() || !form.rtspPath.trim()) {
        Alert.alert(t.title, t.fillConnection);
        return false;
      }
      if (form.accessMode === 'agent' && !form.agentBaseUrl.trim()) {
        Alert.alert(t.title, t.agentUrlRequired);
        return false;
      }
    }
    return true;
  };

  const saveConfig = async (showAlert = true) => {
    if (!selectedHotelId || !form.provider) return false;
    if (form.accessMode === 'agent') {
      const normalized = normalizeAgentBaseUrl(form.agentBaseUrl);
      if (!normalized) {
        Alert.alert(t.title, t.agentUrlRequired);
        return false;
      }
      if (isBlockedAgentApiUrl(normalized)) {
        Alert.alert(t.title, t.agentUrlBlocked);
        return false;
      }
    }

    setIsSaving(true);
    try {
      const includePassword = !!form.password.trim();
      const payload = buildPayload(includePassword);
      const saved = selectedCameraId
        ? await cameraApi.update(selectedCameraId, payload)
        : await cameraApi.save(payload);
      if (!saved?._id && !selectedCameraId) {
        throw new Error('SAVE_FAILED');
      }
      if (saved?._id) {
        setSelectedCameraId(String(saved._id));
      }
      if (showAlert) {
        Alert.alert(t.title, t.saved);
      }
      await loadCameras();
      return true;
    } catch {
      Alert.alert(t.title, t.saveFailed);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const applyAgentHost = () => {
    const baseUrl = buildAgentBaseUrlFromHost(form.agentHostInput);
    if (!baseUrl) {
      Alert.alert(t.title, t.agentUrlRequired);
      return;
    }
    setField('agentBaseUrl', baseUrl);
    setAgentOnline(null);
    setAgentError('');
  };

  const useLocalhostAgent = () => {
    setField('agentHostInput', 'localhost');
    const baseUrl = buildAgentBaseUrlFromHost('localhost');
    setField('agentBaseUrl', baseUrl);
    setAgentOnline(null);
    setAgentError('');
  };

  const useSavedAgentUrl = () => {
    const saved = currentCamera?.agentBaseUrl || form.agentBaseUrl;
    if (!saved) {
      Alert.alert(t.title, t.agentUrlRequired);
      return;
    }
    setField('agentBaseUrl', saved);
    setAgentOnline(null);
    setAgentError('');
  };

  const openAgentHealth = async () => {
    const baseUrl = form.agentBaseUrl.trim() || buildAgentBaseUrlFromHost('localhost');
    const url = getAgentHealthUrl(baseUrl);
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t.title, url);
    }
  };

  const testAgent = async () => {
    const baseUrl = normalizeAgentBaseUrl(form.agentBaseUrl.trim());
    if (!baseUrl) {
      Alert.alert(t.title, t.agentUrlRequired);
      return;
    }
    if (isBlockedAgentApiUrl(baseUrl)) {
      setAgentOnline(false);
      setAgentError(t.agentUrlBlocked);
      return;
    }

    setIsTestingAgent(true);
    setAgentOnline(null);
    setAgentError('');
    try {
      const result = await cameraApi.testAgent(baseUrl, form.agentToken.trim());
      const ok = !!result?.ok;
      setAgentOnline(ok);
      setAgentError(ok ? '' : (result?.message || t.agentFailed));
      if (ok) {
        setField('agentBaseUrl', baseUrl);
      }
    } catch (error: any) {
      setAgentOnline(false);
      setAgentError(error?.message || t.agentFailed);
    } finally {
      setIsTestingAgent(false);
    }
  };

  const assignStaffToCamera = async () => {
    if (!assignStaffId) return;
    const staff = hotelStaff.find((row) => row.id === assignStaffId);
    const row: StaffAssignment = {
      staffId: assignStaffId,
      name: staff ? staffDisplayName(staff) : '',
      role: assignRole,
    };

    if (!selectedCameraId) {
      const next = staffAssignments.some((item) => item.staffId === row.staffId)
        ? staffAssignments.map((item) => (item.staffId === row.staffId ? row : item))
        : [...staffAssignments, row];
      setStaffAssignments(next);
      setAssignStaffId(null);
      return;
    }

    setIsAssigningStaff(true);
    try {
      const saved = await cameraApi.assignStaffLabel(selectedCameraId, {
        staffId: row.staffId,
        role: row.role,
      });
      if (saved) {
        setStaffAssignments(mapStaffAssignments(saved));
        if (saved.aiConfig?.labelZone) {
          setField('labelZone', saved.aiConfig.labelZone as LabelZone);
        }
      } else {
        setStaffAssignments((prev) => {
          const idx = prev.findIndex((item) => item.staffId === row.staffId);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = row;
            return copy;
          }
          return [...prev, row];
        });
      }
      setAssignStaffId(null);
    } catch {
      Alert.alert(t.title, t.saveFailed);
    } finally {
      setIsAssigningStaff(false);
    }
  };

  const removeStaffAssignment = async (row: StaffAssignment) => {
    if (!selectedCameraId) {
      setStaffAssignments((prev) => prev.filter((item) => item.staffId !== row.staffId));
      return;
    }
    try {
      const saved = await cameraApi.assignStaffLabel(selectedCameraId, {
        staffId: row.staffId,
        role: row.role,
        remove: true,
      });
      if (saved) {
        setStaffAssignments(mapStaffAssignments(saved));
      } else {
        setStaffAssignments((prev) => prev.filter((item) => item.staffId !== row.staffId));
      }
    } catch {
      setStaffAssignments((prev) => prev.filter((item) => item.staffId !== row.staffId));
    }
  };

  const goNext = async () => {
    if (!validateStep(currentStep)) return;
    if (currentStep === 1) {
      const ok = await saveConfig(false);
      if (!ok) return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 2));
  };

  const statsEntries = useMemo(() => {
    if (latestStatsPoint) {
      return [
        { key: 'totalStays', label: t.kpiStays, value: latestStatsPoint.totalStays ?? 0 },
        { key: 'roomsUsed', label: t.kpiRooms, value: latestStatsPoint.roomsUsed ?? 0 },
        { key: 'uniqueGuests', label: t.kpiGuests, value: latestStatsPoint.uniqueGuests ?? 0 },
        { key: 'returningStays', label: t.kpiReturningStays, value: latestStatsPoint.returningStays ?? 0 },
        { key: 'uniqueReturningGuests', label: t.kpiReturningGuests, value: latestStatsPoint.uniqueReturningGuests ?? 0 },
      ];
    }
    const source = stats || {};
    return [
      { key: 'totalGuestsToday', label: t.kpiGuests, value: source.totalGuestsToday ?? source.totalGuests ?? 0 },
      { key: 'checkedInToday', label: t.kpiStays, value: source.checkedInToday ?? 0 },
      { key: 'matchedFaceToday', label: t.kpiReturningGuests, value: source.matchedFaceToday ?? source.recognizedToday ?? 0 },
      { key: 'occupancyRate', label: t.kpiRooms, value: source.occupancyRate ?? 0 },
    ];
  }, [latestStatsPoint, stats, t]);

  const renderStepIndicator = () => (
    <View style={styles.stepRow}>
      {[t.stepProvider, t.stepConnection, t.stepAi].map((label, index) => (
        <View key={label} style={styles.stepItem}>
          <View style={[styles.stepDot, currentStep >= index && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, currentStep >= index && styles.stepDotTextActive]}>{index + 1}</Text>
          </View>
          <Text style={[styles.stepLabel, currentStep === index && styles.stepLabelActive]}>{label}</Text>
        </View>
      ))}
    </View>
  );

  const renderProviderStep = () => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t.selectProvider}</Text>
      {currentCamera?.agentBaseUrl ? (
        <Text style={styles.syncHint}>{t.syncedFromWeb}</Text>
      ) : null}
      {cameras.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {cameras.map((camera) => (
            <TouchableOpacity
              key={camera._id || camera.name}
              style={[styles.chip, String(camera._id) === String(selectedCameraId) && styles.chipActive]}
              onPress={() => {
                setSelectedCameraId(camera._id || null);
                applyCameraSelection(camera);
              }}
            >
              <Text style={[styles.chipText, String(camera._id) === String(selectedCameraId) && styles.chipTextActive]}>
                {camera.name} · {camera.provider}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.mutedText}>{t.noCameras}</Text>
      )}
      <TextInput style={styles.input} value={form.name} onChangeText={(value) => setField('name', value)} placeholder="Camera name" />
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
    </View>
  );

  const renderConnectionStep = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t.accessMode}</Text>
        <View style={styles.chipRowWrap}>
          {(['cloud', 'agent'] as CameraAccessMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.chip, form.accessMode === mode && styles.chipActive]}
              onPress={() => setField('accessMode', mode)}
            >
              <Text style={[styles.chipText, form.accessMode === mode && styles.chipTextActive]}>
                {mode === 'cloud' ? t.cloud : t.agent}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {form.accessMode === 'agent' ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Camera Agent</Text>
          <Text style={styles.warningText}>{t.agentUrlWarning}</Text>
          <TextInput
            style={styles.input}
            value={form.agentBaseUrl}
            onChangeText={(value) => {
              setField('agentBaseUrl', value);
              setAgentOnline(null);
              setAgentError('');
            }}
            placeholder="https://xxxx.tunnel.phgrouptechs.com"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            value={form.agentHostInput}
            onChangeText={(value) => setField('agentHostInput', value)}
            placeholder={t.agentHostPlaceholder}
            autoCapitalize="none"
          />
          <View style={styles.chipRowWrap}>
            <TouchableOpacity style={styles.smallButton} onPress={applyAgentHost}>
              <Text style={styles.smallButtonText}>{t.createUrl}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallButton} onPress={useLocalhostAgent}>
              <Text style={styles.smallButtonText}>{t.useLocalhost}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallButton} onPress={useSavedAgentUrl}>
              <Text style={styles.smallButtonText}>{t.applySavedUrl}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallButton} onPress={openAgentHealth}>
              <Text style={styles.smallButtonText}>{t.openHealth}</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={form.agentToken}
            onChangeText={(value) => setField('agentToken', value)}
            placeholder="Agent Token (optional)"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton, isTestingAgent && styles.disabledButton]}
            onPress={testAgent}
            disabled={isTestingAgent}
          >
            {isTestingAgent ? (
              <ActivityIndicator size="small" color="#0f766e" />
            ) : (
              <Text style={styles.secondaryButtonText}>{t.testAgent}</Text>
            )}
          </TouchableOpacity>
          {agentOnline === true ? <Text style={styles.successText}>{t.agentOk}</Text> : null}
          {agentOnline === false ? <Text style={styles.errorText}>{agentError || t.agentFailed}</Text> : null}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>RTSP</Text>
        <TextInput style={styles.input} value={form.ipAddress} onChangeText={(value) => setField('ipAddress', value)} placeholder="IP Address" autoCapitalize="none" />
        <TextInput style={styles.input} value={form.port} onChangeText={(value) => setField('port', value)} placeholder="554" keyboardType="number-pad" />
        <TextInput style={styles.input} value={form.username} onChangeText={(value) => setField('username', value)} placeholder="Username" autoCapitalize="none" />
        <TextInput style={styles.input} value={form.password} onChangeText={(value) => setField('password', value)} placeholder="Password" secureTextEntry />
        <TextInput style={styles.input} value={form.rtspPath} onChangeText={(value) => setField('rtspPath', value)} placeholder="RTSP Path" autoCapitalize="none" />
        <TouchableOpacity
          style={styles.smallButton}
          onPress={() => setField('rtspPath', getDefaultRtspPath(form.provider || 'hikvision'))}
        >
          <Text style={styles.smallButtonText}>{t.rtspTemplate}</Text>
        </TouchableOpacity>
        {isPrivateCameraIp(form.ipAddress) ? <Text style={styles.warningText}>{t.privateIpHint}</Text> : null}
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
        <Text style={styles.sectionTitle}>{t.videoStream}</Text>
        {renderPreviewFrame(false)}
        {previewImageUrl ? <Text style={styles.syncHint}>{t.enlargeHint}</Text> : null}
        {previewError ? <Text style={styles.errorText}>{previewError}</Text> : null}
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton, isTestingConnection && styles.disabledButton]}
          onPress={() => fetchSnapshotOnce(true)}
          disabled={isTestingConnection || !selectedCameraId}
        >
          {isTestingConnection ? (
            <ActivityIndicator size="small" color="#0f766e" />
          ) : (
            <Text style={styles.secondaryButtonText}>{t.testConnection}</Text>
          )}
        </TouchableOpacity>
        <View style={styles.previewActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton, (isPreviewRunning || !selectedCameraId) && styles.disabledButton]}
            onPress={startPreview}
            disabled={isPreviewRunning || !selectedCameraId}
          >
            <Text style={styles.primaryButtonText}>{t.liveView}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton, !isPreviewRunning && styles.disabledButton]}
            onPress={stopPreview}
            disabled={!isPreviewRunning}
          >
            <Text style={styles.secondaryButtonText}>{t.stopPreview}</Text>
          </TouchableOpacity>
        </View>
        {isPreviewRunning && form.enableGuestLabels ? (
          <Text style={styles.syncHint}>{t.labelsOn}</Text>
        ) : null}
      </View>
    </>
  );

  const renderAiStep = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>AI Config</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>OCR</Text>
          <Switch value={form.enableOcr} onValueChange={(value) => setField('enableOcr', value)} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t.guestLabels}</Text>
          <Switch value={form.enableGuestLabels} onValueChange={(value) => setField('enableGuestLabels', value)} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t.stayEstimate}</Text>
          <Switch value={form.enableStayEstimate} onValueChange={(value) => setField('enableStayEstimate', value)} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Face Recognition</Text>
          <Switch value={form.enableFaceRecognition} onValueChange={(value) => setField('enableFaceRecognition', value)} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Auto Check-in</Text>
          <Switch value={form.autoCheckin} onValueChange={(value) => setField('autoCheckin', value)} />
        </View>

        {form.enableGuestLabels ? (
          <View style={styles.assignBlock}>
            <Text style={styles.label}>{t.labelZone}</Text>
            <View style={styles.chipRowWrap}>
              {([
                ['reception_desk', t.zoneReception],
                ['housekeeping', t.zoneHousekeeping],
                ['general', t.zoneGeneral],
              ] as const).map(([zone, label]) => (
                <TouchableOpacity
                  key={zone}
                  style={[styles.chip, form.labelZone === zone && styles.chipActive]}
                  onPress={() => setField('labelZone', zone)}
                >
                  <Text style={[styles.chipText, form.labelZone === zone && styles.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{t.assignStaff}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {hotelStaff.map((staff) => (
                <TouchableOpacity
                  key={staff.id}
                  style={[styles.chip, assignStaffId === staff.id && styles.chipActive]}
                  onPress={() => setAssignStaffId(staff.id)}
                >
                  <Text style={[styles.chipText, assignStaffId === staff.id && styles.chipTextActive]}>
                    {staffDisplayName(staff)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.chipRowWrap}>
              {(['receptionist', 'housekeeper'] as StaffLabelRole[]).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[styles.chip, assignRole === role && styles.chipActive]}
                  onPress={() => setAssignRole(role)}
                >
                  <Text style={[styles.chipText, assignRole === role && styles.chipTextActive]}>
                    {role === 'receptionist' ? t.roleReceptionist : t.roleHousekeeper}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.smallButton, isAssigningStaff && styles.disabledButton]}
                onPress={assignStaffToCamera}
                disabled={isAssigningStaff || !assignStaffId}
              >
                {isAssigningStaff ? (
                  <ActivityIndicator size="small" color="#0f766e" />
                ) : (
                  <Text style={styles.smallButtonText}>{t.assignAdd}</Text>
                )}
              </TouchableOpacity>
            </View>
            {staffAssignments.length ? (
              <View style={styles.chipRowWrap}>
                {staffAssignments.map((row) => (
                  <TouchableOpacity key={row.staffId} style={styles.assignmentChip} onPress={() => removeStaffAssignment(row)}>
                    <Text style={styles.assignmentChipText}>
                      {row.name || row.staffId} · {row.role === 'receptionist' ? t.roleReceptionist : t.roleHousekeeper} ×
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.mutedText}>{t.assignEmpty}</Text>
            )}
          </View>
        ) : null}
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
        {!latestStatsPoint && !statsEntries.some((item) => item.value) && !isLoadingStats ? (
          <Text style={styles.mutedText}>{t.statsEmpty}</Text>
        ) : null}
        {stats?.lastPipeline?.label ? (
          <Text style={styles.syncHint}>
            {t.lastLabel}: {String((stats.lastPipeline.label as any)?.labelVi || (stats.lastPipeline.label as any)?.label || '-')}
          </Text>
        ) : null}
      </View>
    </>
  );

  return (
    <AccessGuard features={['hotel_management']}>
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

        {renderStepIndicator()}

        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>{t.camera}</Text>
          {isLoading ? <ActivityIndicator size="small" color="#0f766e" /> : null}
        </View>

        {currentStep === 0 ? renderProviderStep() : null}
        {currentStep === 1 ? renderConnectionStep() : null}
        {currentStep === 2 ? renderAiStep() : null}

        <View style={styles.card}>
          <View style={styles.navRow}>
            {currentStep > 0 ? (
              <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={() => setCurrentStep((prev) => prev - 1)}>
                <Text style={styles.secondaryButtonText}>{t.back}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.navSpacer} />
            )}
            {currentStep < 2 ? (
              <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={goNext}>
                <Text style={styles.primaryButtonText}>{t.next}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton, (isSaving || !selectedHotelId || !form.provider) && styles.disabledButton]}
                onPress={() => saveConfig(true)}
                disabled={isSaving || !selectedHotelId || !form.provider}
              >
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>{t.finish}</Text>}
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton, (isSaving || !selectedHotelId || !form.provider) && styles.disabledButton]}
            onPress={() => saveConfig(true)}
            disabled={isSaving || !selectedHotelId || !form.provider}
          >
            {isSaving ? <ActivityIndicator size="small" color="#0f766e" /> : <Text style={styles.secondaryButtonText}>{t.save}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={loadStats}>
            <Text style={styles.secondaryButtonText}>{t.refreshStats}</Text>
          </TouchableOpacity>
          {currentCamera?._id ? <Text style={styles.cameraMeta}>ID: {currentCamera._id}</Text> : null}
          {currentCamera?.agentBaseUrl ? (
            <Text style={styles.cameraMeta}>Agent: {currentCamera.agentBaseUrl}</Text>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        visible={isPreviewEnlarged}
        animationType="fade"
        transparent
        onRequestClose={() => setIsPreviewEnlarged(false)}
      >
        <View style={styles.enlargeModalBackdrop}>
          <View style={styles.enlargeModalHeader}>
            <Text style={styles.enlargeModalTitle}>{t.enlargeTitle}</Text>
            <TouchableOpacity onPress={() => setIsPreviewEnlarged(false)}>
              <Text style={styles.enlargeModalClose}>{t.closeEnlarge}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.enlargeScroll}
            maximumZoomScale={4}
            minimumZoomScale={1}
            contentContainerStyle={styles.enlargeScrollContent}
            centerContent
          >
            {renderPreviewFrame(true)}
          </ScrollView>
        </View>
      </Modal>
    </AccessGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
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
  syncHint: { color: '#0f766e', fontSize: 13, lineHeight: 18 },
  warningText: { color: '#b45309', fontSize: 13, lineHeight: 18 },
  successText: { color: '#15803d', fontSize: 13 },
  errorText: { color: '#b91c1c', fontSize: 13 },
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
  assignmentChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  assignmentChipText: { color: '#5b21b6', fontWeight: '600', fontSize: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  switchLabel: { fontSize: 15, color: '#0f172a', flex: 1, paddingRight: 12 },
  assignBlock: { gap: 10, marginTop: 4 },
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
    flex: 1,
  },
  primaryButton: { backgroundColor: '#0f766e' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  secondaryButtonText: { color: '#0f766e', fontWeight: '700' },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  smallButtonText: { color: '#0f766e', fontWeight: '600', fontSize: 13 },
  disabledButton: { opacity: 0.5 },
  cameraMeta: { color: '#94a3b8', fontSize: 12 },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepItem: { alignItems: 'center', flex: 1, gap: 6 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#0f766e' },
  stepDotText: { color: '#64748b', fontWeight: '700', fontSize: 12 },
  stepDotTextActive: { color: '#fff' },
  stepLabel: { fontSize: 11, color: '#64748b', textAlign: 'center' },
  stepLabelActive: { color: '#0f766e', fontWeight: '700' },
  navRow: { flexDirection: 'row', gap: 10 },
  navSpacer: { flex: 1 },
  previewBox: {
    position: 'relative',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBoxEnlarge: {
    height: undefined,
    minHeight: 420,
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 0,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewImageEnlarge: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  previewPlaceholderText: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 13,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
  },
  enlargeBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(15, 118, 110, 0.92)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  enlargeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  frameSticker: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
  },
  frameStickerTag: {
    position: 'absolute',
    left: 0,
    top: -18,
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    overflow: 'hidden',
    maxWidth: 160,
  },
  enlargeModalBackdrop: {
    flex: 1,
    backgroundColor: '#000',
  },
  enlargeModalHeader: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  enlargeModalTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  enlargeModalClose: {
    color: '#5eead4',
    fontWeight: '700',
    fontSize: 15,
  },
  enlargeScroll: {
    flex: 1,
  },
  enlargeScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});

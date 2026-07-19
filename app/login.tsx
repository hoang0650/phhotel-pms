import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  InteractionManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, ChevronDown } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Colors from '@/constants/colors';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, loginLoading } = useAuth();
  const { language, setLanguage } = useLanguage();

  const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';
  const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';
  const isVi = language === 'vi';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [languageDropdownVisible, setLanguageDropdownVisible] = useState(false);

  const text = useMemo(
    () => ({
      appTagline: isVi ? 'Hệ thống quản lý khách sạn' : 'Hotel management system',
      formTitle: isVi ? 'Đăng nhập' : 'Login',
      formSubtitle: isVi ? 'Chào mừng bạn quay trở lại' : 'Welcome back',
      email: isVi ? 'Email' : 'Email',
      emailPlaceholder: isVi ? 'Nhập email hoặc tên đăng nhập' : 'Enter email or username',
      password: isVi ? 'Mật khẩu' : 'Password',
      passwordPlaceholder: isVi ? 'Nhập mật khẩu' : 'Enter password',
      forgotPassword: isVi ? 'Quên mật khẩu?' : 'Forgot password?',
      login: isVi ? 'Đăng nhập' : 'Login',
      biometricLogin: isVi ? 'Đăng nhập bằng Face ID' : 'Login with Face ID',
      invalidCredential: isVi ? 'Email hoặc mật khẩu không đúng' : 'Incorrect email or password',
      reviewLoginInfo: isVi ? 'Vui lòng kiểm tra lại thông tin đăng nhập' : 'Please check your login information',
      loginFailed: isVi ? 'Đăng nhập thất bại' : 'Login failed',
      notice: isVi ? 'Thông báo' : 'Notice',
      noBiometricSupport: isVi ? 'Thiết bị chưa hỗ trợ sinh trắc học' : 'This device does not support biometrics',
      noBiometricCredentials: isVi ? 'Chưa có thông tin đăng nhập sinh trắc học' : 'No biometric login credentials found',
      invalidBiometricCredentials: isVi ? 'Thông tin sinh trắc học không hợp lệ' : 'Biometric credentials are invalid',
      setupBiometricFirst: isVi ? 'Vui lòng cài đặt Face ID hoặc vân tay trước' : 'Please set up Face ID or fingerprint first',
      biometricPrompt: isVi ? 'Xác thực sinh trắc học' : 'Biometric authentication',
      cancel: isVi ? 'Hủy' : 'Cancel',
      biometricLoginFailed: isVi ? 'Không thể đăng nhập bằng sinh trắc học' : 'Unable to log in with biometrics',
      emailRequired: isVi ? 'Vui lòng nhập email hoặc tên đăng nhập' : 'Please enter email or username',
      emailInvalid: isVi ? 'Email không hợp lệ' : 'Invalid email address',
      passwordRequired: isVi ? 'Vui lòng nhập mật khẩu' : 'Please enter password',
      passwordLength: isVi ? 'Mật khẩu phải có ít nhất 6 ký tự' : 'Password must be at least 6 characters',
      languageLabel: isVi ? 'Ngôn ngữ' : 'Language',
      vietnamese: 'Tiếng Việt',
      english: 'English',
    }),
    [isVi]
  );

  useEffect(() => {
    if (!isMobile) return;

    let isMounted = true;
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      const checkBiometrics = async () => {
        try {
          const [hasHardware, isEnrolled] = await Promise.all([
            LocalAuthentication.hasHardwareAsync(),
            LocalAuthentication.isEnrolledAsync(),
          ]);

          if (!isMounted || !hasHardware || !isEnrolled) {
            if (isMounted) {
              setBiometricReady(false);
            }
            return;
          }

          setBiometricReady(true);

          const savedCredentials = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
          if (!isMounted || !savedCredentials) return;

          const { email: savedEmail } = JSON.parse(savedCredentials) as { email?: string };
          if (savedEmail) {
            setEmail((currentEmail) => currentEmail || savedEmail);
          }
        } catch (error) {
          if (isMounted) {
            console.warn('[Login] Lỗi khởi tạo sinh trắc học:', error);
            setBiometricReady(false);
          }
        }
      };

      checkBiometrics();
    });

    return () => {
      isMounted = false;
      interactionTask.cancel();
    };
  }, [isMobile]);

  const validate = useCallback(() => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email.trim()) {
      newErrors.email = text.emailRequired;
    } else if (email.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = text.emailInvalid;
    }
    
    if (!password) {
      newErrors.password = text.passwordRequired;
    } else if (password.length < 6) {
      newErrors.password = text.passwordLength;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email, password, text.emailInvalid, text.emailRequired, text.passwordLength, text.passwordRequired]);

  const buildLoginPayload = useCallback(
    (rawValue: string, rawPassword: string) => {
      const normalizedValue = rawValue.trim();
      return normalizedValue.includes('@')
        ? { email: normalizedValue, password: rawPassword }
        : { username: normalizedValue, password: rawPassword };
    },
    []
  );

  const handleLogin = useCallback(async () => {
    if (!validate()) return;

    try {
      await login(buildLoginPayload(email, password));
      router.replace('/(tabs)/(dashboard)');
    } catch (error) {
      const message =
        error instanceof Error && (error.message === 'UNAUTHORIZED' || /invalid|credentials/i.test(error.message))
          ? text.invalidCredential
          : error instanceof Error
            ? error.message
            : text.reviewLoginInfo;
      Alert.alert(text.loginFailed, message);
    }
  }, [buildLoginPayload, email, login, password, router, text.invalidCredential, text.loginFailed, text.reviewLoginInfo, validate]);

  const handleBiometricLogin = useCallback(async () => {
    if (!isMobile) {
      Alert.alert(text.notice, text.noBiometricSupport);
      return;
    }
    setBiometricLoading(true);
    try {
      const stored = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      if (!stored) {
        Alert.alert(text.notice, text.noBiometricCredentials);
        setBiometricLoading(false);
        return;
      }
      const credentials = JSON.parse(stored) as { email: string; password: string };
      if (!credentials?.email || !credentials?.password) {
        Alert.alert(text.notice, text.invalidBiometricCredentials);
        setBiometricLoading(false);
        return;
      }
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert(text.notice, text.noBiometricSupport);
        setBiometricLoading(false);
        return;
      }
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert(text.notice, text.setupBiometricFirst);
        setBiometricLoading(false);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: text.biometricPrompt,
        cancelLabel: text.cancel,
      });
      if (!result.success) {
        setBiometricLoading(false);
        return;
      }
      await login(buildLoginPayload(credentials.email, credentials.password));
      router.replace('/(tabs)/(dashboard)');
    } catch (error) {
      Alert.alert(text.loginFailed, text.biometricLoginFailed);
    } finally {
      setBiometricLoading(false);
    }
  }, [
    BIOMETRIC_CREDENTIALS_KEY,
    buildLoginPayload,
    isMobile,
    login,
    router,
    text.biometricLoginFailed,
    text.biometricPrompt,
    text.cancel,
    text.invalidBiometricCredentials,
    text.loginFailed,
    text.noBiometricCredentials,
    text.noBiometricSupport,
    text.notice,
    text.setupBiometricFirst,
  ]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f766e', '#14b8a6', '#2dd4bf']}
        style={StyleSheet.absoluteFill}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.languageRow}>
            <View style={styles.languageDropdownWrapper}>
              <TouchableOpacity
                style={styles.languageButton}
                onPress={() => setLanguageDropdownVisible((prev) => !prev)}
                activeOpacity={0.85}
              >
                <Text style={styles.languageButtonText}>
                  {text.languageLabel}: {isVi ? text.vietnamese : text.english}
                </Text>
                <ChevronDown size={16} color="#0f766e" />
              </TouchableOpacity>

              {languageDropdownVisible && (
                <View style={styles.languageDropdownMenu}>
                  <Pressable
                    style={styles.languageOption}
                    onPress={() => {
                      setLanguage('vi');
                      setLanguageDropdownVisible(false);
                    }}
                  >
                    <Text style={[styles.languageOptionText, language === 'vi' && styles.languageOptionTextActive]}>
                      {text.vietnamese}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.languageOption}
                    onPress={() => {
                      setLanguage('en');
                      setLanguageDropdownVisible(false);
                    }}
                  >
                    <Text style={[styles.languageOptionText, language === 'en' && styles.languageOptionTextActive]}>
                      {text.english}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Image
                source={require('../assets/images/icon.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>PHHotel PMS</Text>
            <Text style={styles.appTagline}>{text.appTagline}</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>{text.formTitle}</Text>
            <Text style={styles.formSubtitle}>{text.formSubtitle}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{text.email}</Text>
              <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                <Mail size={20} color={Colors.light.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder={text.emailPlaceholder}
                  placeholderTextColor={Colors.light.textSecondary}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{text.password}</Text>
              <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                <Lock size={20} color={Colors.light.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder={text.passwordPlaceholder}
                  placeholderTextColor={Colors.light.textSecondary}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={20} color={Colors.light.textSecondary} />
                  ) : (
                    <Eye size={20} color={Colors.light.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => router.push('/forgot-password')}
            >
              <Text style={styles.forgotPasswordText}>{text.forgotPassword}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loginLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loginLoading}
            >
              {loginLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>{text.login}</Text>
              )}
            </TouchableOpacity>

            {biometricReady && (
              <TouchableOpacity
                style={[styles.biometricButton, biometricLoading && styles.biometricButtonDisabled]}
                onPress={handleBiometricLogin}
                disabled={biometricLoading}
              >
                {biometricLoading ? (
                  <ActivityIndicator color="#0f766e" />
                ) : (
                  <Text style={styles.biometricButtonText}>{text.biometricLogin}</Text>
                )}
              </TouchableOpacity>
            )}
{/* 
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Chưa có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.registerLink}>Đăng ký ngay</Text>
              </TouchableOpacity>
            </View> */}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  languageRow: {
    alignItems: 'flex-end',
    marginBottom: 18,
    zIndex: 20,
  },
  languageDropdownWrapper: {
    position: 'relative',
    width: 170,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0f766e',
  },
  languageDropdownMenu: {
    position: 'absolute',
    top: 48,
    right: 0,
    left: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  languageOption: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  languageOptionText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  languageOptionTextActive: {
    color: '#0f766e',
    fontWeight: '700' as const,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  logoImage: {
    width: 68,
    height: 68,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    marginTop: 16,
  },
  appTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.light.text,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 10,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: '500' as const,
  },
  loginButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  biometricButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0f766e',
    marginTop: 14,
    backgroundColor: '#fff',
  },
  biometricButtonDisabled: {
    opacity: 0.7,
  },
  biometricButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0f766e',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: '600' as const,
  },
});

/**
 * Activation Screen (iPad-011)
 * デバイスアクティベーション画面
 *
 * 設計仕様: docs/詳細設計書/08-画面項目詳細定義.md 8.4.2
 * 項目: A001-A030
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useDeviceStore } from '@/stores';

const { width: screenWidth } = Dimensions.get('window');

export default function ActivationScreen() {
  // State
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Refs for input fields
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Device store
  const {
    is_activating,
    activation_error,
    activate_device,
  } = useDeviceStore();

  // Focus first input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  /**
   * Check if all 6 digits are entered
   */
  const isComplete = code.every((digit) => digit !== '');

  /**
   * Handle input change for each field
   */
  const handleInputChange = useCallback((text: string, index: number) => {
    // Only allow single digit
    const digit = text.replace(/[^0-9]/g, '').slice(-1);

    setCode((prev) => {
      const newCode = [...prev];
      newCode[index] = digit;
      return newCode;
    });

    // Auto-focus next field if digit entered
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  /**
   * Handle key press for backspace navigation
   */
  const handleKeyPress = useCallback((e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && code[index] === '' && index > 0) {
      // Move focus to previous field and clear it
      inputRefs.current[index - 1]?.focus();
      setCode((prev) => {
        const newCode = [...prev];
        newCode[index - 1] = '';
        return newCode;
      });
    }
  }, [code]);

  /**
   * Handle paste event - distribute 6 digits across fields
   */
  const handlePaste = useCallback((text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 6);
    if (digits.length === 6) {
      const newCode = digits.split('');
      setCode(newCode);
      // Focus last field after paste
      inputRefs.current[5]?.focus();
    }
  }, []);

  /**
   * Handle activation button press
   */
  const handleActivate = useCallback(async () => {
    if (!isComplete) return;

    Keyboard.dismiss();

    try {
      const fullCode = code.join('');
      await activate_device(fullCode);
      // On success, navigate to main app
      router.replace('/(main)/home');
    } catch {
      // Error is handled by store
    }
  }, [code, isComplete, activate_device]);

  return (
    <View style={styles.container}>
      {/* Loading Overlay (A030) */}
      {is_activating && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>アクティベーション中...</Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Logo (A001) */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>SalonTalk AI</Text>
        </View>

        {/* Title (A002) */}
        <Text style={styles.title}>iPadを登録してください</Text>

        {/* Subtitle (A003) */}
        <Text style={styles.subtitle}>
          管理者から受け取った6桁のコードを入力してください
        </Text>

        {/* Code Input Area (A010-A016) */}
        <View style={styles.codeContainer}>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.codeInput,
                focusedIndex === index && styles.codeInputFocused,
                activation_error && styles.codeInputError,
              ]}
              value={code[index]}
              onChangeText={(text) => handleInputChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(-1)}
              onChange={(e) => {
                // Handle paste
                const text = e.nativeEvent.text;
                if (text.length > 1) {
                  handlePaste(text);
                }
              }}
              keyboardType="number-pad"
              maxLength={6}
              selectTextOnFocus
              editable={!is_activating}
              testID={`code-input-${index}`}
            />
          ))}
        </View>

        {/* Error Message (A021) */}
        {activation_error && (
          <Text style={styles.errorText}>{activation_error}</Text>
        )}

        {/* Activate Button (A020) */}
        <Pressable
          style={[
            styles.activateButton,
            !isComplete && styles.activateButtonDisabled,
            is_activating && styles.activateButtonLoading,
          ]}
          onPress={handleActivate}
          disabled={!isComplete || is_activating}
          testID="activate-button"
        >
          {is_activating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.activateButtonText}>アクティベート</Text>
          )}
        </Pressable>

        {/* Help Text (A022) */}
        <Text style={styles.helpText}>
          コードがわからない場合は、管理者にお問い合わせください
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 48,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#4F46E5',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 48,
  },
  codeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  codeInput: {
    width: screenWidth > 600 ? 72 : 56,
    height: screenWidth > 600 ? 88 : 72,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    color: '#111827',
  },
  codeInputFocused: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  codeInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 24,
  },
  activateButton: {
    width: '100%',
    maxWidth: 320,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activateButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  activateButtonLoading: {
    backgroundColor: '#6366F1',
  },
  activateButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  helpText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 24,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#4F46E5',
    marginTop: 16,
  },
});

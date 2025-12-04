/**
 * Modal Component
 * モーダルダイアログコンポーネント
 */
import { Modal as RNModal, View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { ReactNode } from 'react';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  showCloseButton?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'full';
  footer?: ReactNode;
}

const sizeStyles = {
  sm: 'w-4/5 max-w-sm',
  md: 'w-11/12 max-w-md',
  lg: 'w-11/12 max-w-lg',
  full: 'w-full h-full',
};

export function Modal({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  size = 'md',
  footer,
}: ModalProps) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center p-4"
          onPress={onClose}
        >
          <Pressable
            className={`
              bg-white
              rounded-xl
              ${sizeStyles[size]}
              ${size === 'full' ? '' : 'max-h-[90%]'}
            `}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                {title && (
                  <Text className="text-gray-900 font-bold text-lg flex-1">
                    {title}
                  </Text>
                )}
                {showCloseButton && (
                  <Pressable
                    onPress={onClose}
                    className="p-2 -mr-2"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text className="text-gray-400 text-xl">✕</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Content */}
            <View className="p-4">{children}</View>

            {/* Footer */}
            {footer && (
              <View className="p-4 border-t border-gray-100">{footer}</View>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

export function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '確認',
  cancelText = 'キャンセル',
  confirmVariant = 'primary',
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
}) {
  const confirmBg = confirmVariant === 'danger' ? 'bg-red-600' : 'bg-indigo-600';

  return (
    <Modal visible={visible} onClose={onClose} title={title} showCloseButton={false}>
      <Text className="text-gray-600 mb-4">{message}</Text>
      <View className="flex-row justify-end space-x-3">
        <Pressable onPress={onClose} className="px-4 py-2 rounded-lg border border-gray-300">
          <Text className="text-gray-700">{cancelText}</Text>
        </Pressable>
        <Pressable onPress={onConfirm} className={`px-4 py-2 rounded-lg ${confirmBg}`}>
          <Text className="text-white font-medium">{confirmText}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

export default Modal;

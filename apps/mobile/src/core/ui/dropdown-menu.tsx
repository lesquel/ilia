import { type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';

/**
 * A small menu anchored to the top-right of the chrome.
 *
 * Built here, not pulled from a kit: Paper and Tamagui would fight the
 * institute mark. The overlay is a Modal so the menu is not clipped by the bar.
 */
export function DropdownMenu({
  isOpen,
  onClose,
  trigger,
  children,
  width = 260,
}: {
  isOpen: boolean;
  onClose: () => void;
  trigger: ReactNode;
  children: ReactNode;
  width?: number;
}) {
  const theme = useTheme();

  return (
    <View>
      {trigger}
      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.layer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar menú"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              styles.panel,
              {
                width,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.divider,
                borderRadius: theme.radius.md,
              },
            ]}
          >
            {children}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    flex: 1,
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  panel: {
    paddingVertical: 8,
    borderWidth: 1,
    boxShadow: '0 8px 16px rgba(17, 17, 17, 0.1)',
  },
});

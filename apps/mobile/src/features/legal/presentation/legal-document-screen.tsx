import { Link, useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import type { LegalDocument } from '@/features/legal/domain/legal-content';

interface Props {
  document: LegalDocument;
  /** The sibling document, linked at the end so both are one tap apart. */
  related: { label: string; href: Href };
}

/**
 * A long, plain reading page. Public on purpose: the person has to be able to
 * read what they accept before they have an account.
 */
export function LegalDocumentScreen({ document, related }: Props) {
  const theme = useTheme();
  const router = useRouter();

  // Opened from the register form it goes back there; opened from a shared
  // link there is no history, so it lands on the home page instead.
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.scroll}
    >
      <View style={styles.page}>
        <Pressable
          onPress={goBack}
          accessibilityRole="link"
          accessibilityLabel="Volver"
          hitSlop={8}
          style={styles.back}
        >
          <Text style={[styles.backLabel, { color: theme.colors.accent }]}>← Volver</Text>
        </Pressable>

        <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.text }]}>
          {document.title}
        </Text>
        <Text style={[styles.updated, { color: theme.colors.neutral[600] }]}>
          Última actualización: {document.lastUpdated}
        </Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>{document.intro}</Text>

        {document.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text
              accessibilityRole="header"
              style={[styles.heading, { color: theme.colors.text }]}
            >
              {section.heading}
            </Text>
            {section.paragraphs.map((paragraph, index) => (
              <Text key={index} style={[styles.paragraph, { color: theme.colors.text }]}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}

        <View style={[styles.footer, { borderTopColor: theme.colors.divider }]}>
          <Link href={related.href} style={[styles.footerLink, { color: theme.colors.accent }]}>
            {related.label}
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 20.4, paddingVertical: 24 },
  // A reading measure, not the full window, so lines stay short on desktop.
  page: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  back: { alignSelf: 'flex-start', paddingVertical: 6.8, marginBottom: 13.6 },
  backLabel: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '600', marginBottom: 6.8 },
  updated: { fontSize: 13, marginBottom: 20.4 },
  section: { marginTop: 13.6 },
  heading: { fontSize: 18, fontWeight: '600', marginBottom: 6.8 },
  paragraph: { fontSize: 15, lineHeight: 23, marginBottom: 10.2 },
  footer: { borderTopWidth: 1, marginTop: 20.4, paddingTop: 16 },
  footerLink: { fontSize: 15, fontWeight: '600' },
});

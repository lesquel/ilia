import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * The last line of defence against a white screen.
 *
 * Without one, a render error anywhere below unmounts the whole tree and the
 * teacher gets a blank page: no message, no way back, and nothing to tell us
 * about. This turns that into something they can read and act on.
 *
 * A class component because React has no hook for this — `componentDidCatch` is
 * the only way to catch a render error, and it exists only on classes.
 */

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Console, because there is no error-reporting service yet. When one is
    // chosen this is the single place it plugs into.
    console.error('ErrorBoundary caught a render error', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return <ErrorFallback onRetry={() => this.setState({ error: null })} />;
  }
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  // Deliberately plain: no theme hook, no tokens, no context. Whatever broke
  // may be exactly those things, and a fallback that can itself crash is not a
  // fallback.
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Algo se rompió de nuestro lado</Text>
      <Text style={styles.body}>
        No es algo que hayas hecho mal. Probá de nuevo; si vuelve a pasar, escribinos y contanos
        qué estabas haciendo.
      </Text>

      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.button}>
        <Text style={styles.buttonLabel}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20.4,
    gap: 10.2,
    backgroundColor: '#f2f2f3',
  },
  title: { fontSize: 22, fontWeight: '600', color: '#1d1f20', textAlign: 'center' },
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: '#4a4d50',
    textAlign: 'center',
    maxWidth: 420,
  },
  button: {
    backgroundColor: '#5980a6',
    borderRadius: 7,
    paddingVertical: 13.6,
    paddingHorizontal: 27.2,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 6.8,
  },
  buttonLabel: { color: '#f2f2f3', fontSize: 16, fontWeight: '600' },
});

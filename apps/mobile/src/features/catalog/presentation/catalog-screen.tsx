import { Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import { breakpoint, useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { useCourses } from '@/features/catalog/application/use-catalog';
import {
  LEVELS,
  LEVEL_LABELS,
  sortCoursesAlongLearningPath,
  emptyCatalogMessage,
  type Level,
} from '@/features/catalog/domain/entities';

import { CourseCard } from './course-card';

export function CatalogScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const [level, setLevel] = useState<Level | undefined>();
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const filters = useMemo(
    () => ({ level, query: submittedSearch || undefined }),
    [level, submittedSearch],
  );

  const { courses, isLoading, error, hasMore, isLoadingMore, loadMore, refetch } =
    useCourses(filters);
  const coursesAlongPath = useMemo(() => sortCoursesAlongLearningPath(courses), [courses]);

  // Same breakpoints as the mockup's container queries: one column on a phone,
  // two on a tablet, three on a desktop.
  const columns = width >= breakpoint.medium ? 3 : width >= breakpoint.compact ? 2 : 1;
  // A short last row would otherwise stretch its cards across the whole list:
  // one course on a desktop became a single full-width card.
  const contentWidth = Math.min(width, CONTENT_MAX_WIDTH) - CONTENT_PADDING * 2;
  const cardMaxWidth = (contentWidth - GRID_GAP * (columns - 1)) / columns;

  const header = (
    <View style={styles.header}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Explorar cursos</Text>
      <Text style={[styles.subtitle, { color: theme.colors.neutral[600] }]}>
        Aprende haciendo. Cada módulo termina en una actividad, no en un cuestionario.
      </Text>

      <View
        style={[
          styles.searchField,
          {
            backgroundColor: theme.colors.surface,
            borderColor: searchFocused ? theme.colors.accent : theme.colors.divider,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        <Icon glyph={Search} size={18} color={theme.colors.neutral[500]} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          // Search on submit, not on every keystroke: a request per character is
          // a request per character of someone else's mobile data.
          onSubmitEditing={() => setSubmittedSearch(search.trim())}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          returnKeyType="search"
          placeholder="Buscar un curso"
          placeholderTextColor={theme.colors.neutral[500]}
          accessibilityLabel="Buscar un curso"
          style={[styles.search, { color: theme.colors.text }]}
        />
      </View>

      {/* Category chips from mockup #4 are not wired: the API exposes level, query
          and cursor only — no category field in ORM or catalog router. */}
      <View style={styles.filters}>
        <LevelChip label="Todos" active={level === undefined} onPress={() => setLevel(undefined)} />
        {LEVELS.map((option) => (
          <LevelChip
            key={option}
            label={LEVEL_LABELS[option]}
            active={level === option}
            onPress={() => setLevel(level === option ? undefined : option)}
          />
        ))}
        {isLoading ? null : (
          <Text style={[styles.count, { color: theme.colors.neutral[600] }]}>
            {courses.length} {courses.length === 1 ? 'curso' : 'cursos'}
            {hasMore ? ' o más' : ''}
          </Text>
        )}
      </View>
    </View>
  );

  if (error && courses.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        {header}
        <ErrorState error={error} onRetry={() => void refetch()} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
      data={coursesAlongPath}
      // `columns` changes with the window, and FlatList cannot change numColumns
      // on the fly — the key forces a fresh list instead of an invariant error.
      key={`columns-${columns}`}
      numColumns={columns}
      columnWrapperStyle={columns > 1 ? styles.column : undefined}
      keyExtractor={(course) => course.id}
      renderItem={({ item }) => (
        <View style={columns > 1 ? [styles.gridItem, { maxWidth: cardMaxWidth }] : undefined}>
          <CourseCard course={item} />
        </View>
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={
        isLoading ? (
          <LoadingState label="Buscando cursos…" />
        ) : (
          <EmptyState {...emptyCatalogMessage(filters)} />
        )
      }
      ListFooterComponent={
        isLoadingMore ? (
          <ActivityIndicator style={styles.footer} color={theme.colors.accent} />
        ) : null
      }
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (hasMore && !isLoadingMore) void loadMore();
      }}
    />
  );
}

function LevelChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? theme.colors.accent : 'transparent',
          borderColor: active ? theme.colors.accent : theme.colors.divider,
          borderRadius: theme.radius.sm,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text
        style={[styles.chipText, { color: active ? '#f2f2f3' : theme.colors.neutral[700] }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const CONTENT_MAX_WIDTH = 1280;
const CONTENT_PADDING = 20.4;
const GRID_GAP = 13.6;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: CONTENT_PADDING,
    maxWidth: CONTENT_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
    gap: GRID_GAP,
  },
  header: {
    gap: 10.2,
    marginBottom: 13.6,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10.2,
    borderWidth: 1,
    paddingHorizontal: 13.6,
    marginTop: 6.8,
    maxWidth: 560,
  },
  search: {
    flex: 1,
    paddingVertical: 10.2,
    fontSize: 16,
    // The field draws the frame and its focus colour; the browser's own ring
    // would double it.
    outlineWidth: 0,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6.8,
  },
  count: {
    fontSize: 13,
    marginLeft: 6.8,
  },
  chip: {
    borderWidth: 1,
    paddingVertical: 6.8,
    paddingHorizontal: 13.6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  column: {
    gap: GRID_GAP,
  },
  gridItem: {
    flex: 1,
  },
  footer: {
    paddingVertical: 20.4,
  },
});

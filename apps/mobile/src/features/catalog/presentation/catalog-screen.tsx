import { Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { EmptyState, ErrorState } from '@/core/ui/state-view';
import { breakpoint, useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { useCourses } from '@/features/catalog/application/use-catalog';
import {
  coursesInProgress,
  type CatalogProgress,
  type EnrolledCourseLike,
} from '@/features/catalog/domain/catalog-progress';
import {
  LEVELS,
  LEVEL_LABELS,
  sortCoursesAlongLearningPath,
  startingCourseId,
  emptyCatalogMessage,
  type Level,
} from '@/features/catalog/domain/entities';

import { CatalogScreenSkeleton } from './catalog-screen-skeleton';
import { CourseCard } from './course-card';

/**
 * The catalog does not import enrollment: the route reads the enrolments and
 * hands them in, so a visitor's catalog is the same screen with nothing passed.
 */
export interface CatalogScreenProps {
  /** Progress per course slug, for the cards of enrolled courses. */
  progressBySlug?: Readonly<Record<string, CatalogProgress>>;
  /** The teacher's enrolments, behind the "En curso" filter. */
  enrolments?: readonly EnrolledCourseLike[];
}

export function CatalogScreen({ progressBySlug, enrolments }: CatalogScreenProps = {}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const [level, setLevel] = useState<Level | undefined>();
  const [onlyInProgress, setOnlyInProgress] = useState(false);
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
  const startHereId = useMemo(() => startingCourseId(courses), [courses]);
  // From the enrolments, not the loaded pages: a course on a page not fetched
  // yet is still one the teacher is in.
  const inProgress = useMemo(() => coursesInProgress(enrolments ?? []), [enrolments]);
  const inProgressMatches = useMemo(
    () => coursesInProgress(enrolments ?? [], submittedSearch),
    [enrolments, submittedSearch],
  );
  const showInProgress = onlyInProgress && inProgress.length > 0;
  const listed = showInProgress ? inProgressMatches : coursesAlongPath;

  // Same breakpoints as the mockup's container queries: one column on a phone,
  // two on a tablet, three on a desktop.
  const columns =
    width >= WIDE_SCREEN ? 4 : width >= breakpoint.medium ? 3 : width >= breakpoint.compact ? 2 : 1;
  // A wide monitor gets a fourth column, not two bands of empty background.
  const maxContentWidth = columns === 4 ? WIDE_CONTENT_MAX_WIDTH : CONTENT_MAX_WIDTH;
  // A short last row would otherwise stretch its cards across the whole list:
  // one course on a desktop became a single full-width card.
  const contentWidth = Math.min(width, maxContentWidth) - CONTENT_PADDING * 2;
  const cardMaxWidth = (contentWidth - GRID_GAP * (columns - 1)) / columns;

  const header = (
    <View style={styles.header}>
      <Text
        style={[styles.title, { color: theme.colors.ink, fontFamily: theme.typography.display.family }]}
        accessibilityRole="header"
      >
        Explorar cursos
      </Text>
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
        <FilterChip
          label="Todos"
          active={level === undefined && !showInProgress}
          onPress={() => {
            setLevel(undefined);
            setOnlyInProgress(false);
          }}
        />
        {inProgress.length > 0 ? (
          <FilterChip
            label={`En curso · ${inProgress.length}`}
            active={showInProgress}
            onPress={() => {
              setLevel(undefined);
              setOnlyInProgress(!showInProgress);
            }}
          />
        ) : null}
        <View style={[styles.chipRule, { backgroundColor: theme.colors.divider }]} />
        {LEVELS.map((option) => (
          <FilterChip
            key={option}
            label={LEVEL_LABELS[option]}
            active={!showInProgress && level === option}
            onPress={() => {
              setOnlyInProgress(false);
              setLevel(level === option && !showInProgress ? undefined : option);
            }}
          />
        ))}
        {showInProgress ? (
          <Text style={[styles.count, { color: theme.colors.neutral[600] }]}>
            {listed.length} {listed.length === 1 ? 'curso' : 'cursos'}
          </Text>
        ) : isLoading ? null : (
          <Text style={[styles.count, { color: theme.colors.neutral[600] }]}>
            {courses.length} {courses.length === 1 ? 'curso' : 'cursos'}
            {hasMore ? ' o más' : ''}
          </Text>
        )}
      </View>
    </View>
  );

  if (error && courses.length === 0 && !showInProgress) {
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
      contentContainerStyle={[styles.content, { maxWidth: maxContentWidth }]}
      data={listed}
      // `columns` changes with the window, and FlatList cannot change numColumns
      // on the fly — the key forces a fresh list instead of an invariant error.
      key={`columns-${columns}`}
      numColumns={columns}
      columnWrapperStyle={columns > 1 ? styles.column : undefined}
      keyExtractor={(course) => course.id}
      renderItem={({ item }) => (
        <View style={columns > 1 ? [styles.gridItem, { maxWidth: cardMaxWidth }] : undefined}>
          <CourseCard
            course={item}
            isStartHere={item.id === startHereId && !progressBySlug?.[item.slug]}
            progress={progressBySlug?.[item.slug]}
          />
        </View>
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={
        showInProgress ? (
          <EmptyState
            title="Ningún curso en curso coincide"
            hint="Prueba con otra búsqueda o vuelve a Todos."
          />
        ) : isLoading ? (
          <CatalogScreenSkeleton columns={columns} cardMaxWidth={cardMaxWidth} gap={GRID_GAP} />
        ) : (
          <EmptyState {...emptyCatalogMessage(filters)} />
        )
      }
      ListFooterComponent={
        isLoadingMore && !showInProgress ? (
          // The next page draws as the cards it brings, one row of them.
          <CatalogScreenSkeleton
            columns={columns}
            cardMaxWidth={cardMaxWidth}
            gap={GRID_GAP}
            rows={1}
            label="Cargando más cursos"
          />
        ) : null
      }
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (hasMore && !isLoadingMore && !showInProgress) void loadMore();
      }}
    />
  );
}

/** A pill: the active one is dark, like the active section in the nav. */
function FilterChip({
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
      aria-pressed={active}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? theme.colors.ink : theme.colors.surface,
          borderColor: active ? theme.colors.ink : theme.colors.divider,
          borderRadius: PILL_RADIUS,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text
        style={[styles.chipText, { color: active ? theme.colors.bg : theme.colors.ink }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const PILL_RADIUS = 999;
const CONTENT_MAX_WIDTH = 1280;
const WIDE_SCREEN = 1600;
const WIDE_CONTENT_MAX_WIDTH = 1720;
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
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.6,
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
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipRule: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 4,
    marginHorizontal: 4,
  },
  column: {
    gap: GRID_GAP,
  },
  gridItem: {
    flex: 1,
  },
});

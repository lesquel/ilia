import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import { useChangeRole, useManagedUsers } from '@/features/admin/application/use-admin';
import { ROLE_LABELS, type ManagedUser } from '@/features/admin/domain/entities';
import {
  Card,
  HeaderCell,
  ListHeader,
  ListRow,
  OutlineButton,
  SearchField,
  Tag,
  useIsWide,
} from '@/features/admin/presentation/ui';
import { ROLES, type Role } from '@/features/auth/domain/entities';

/** Must match the API's DEFAULT_PAGE_SIZE. */
const PAGE_SIZE = 50;

export function UsersPanel() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [userOffset, setUserOffset] = useState(0);
  const { users, total, isLoading, error, refetch } = useManagedUsers(submitted, userOffset);

  return (
    <Card
      title="Usuarios y roles"
      hint="Los roles se otorgan, nunca se reclaman: no hay forma de autoasignárselos."
    >
      <SearchField
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={() => {
          setUserOffset(0);
          setSubmitted(search);
        }}
        returnKeyType="search"
        placeholder="Buscar por nombre o correo"
        accessibilityLabel="Buscar usuario"
      />

      {isLoading ? <LoadingState label="Cargando usuarios…" /> : null}
      {error ? <ErrorState error={error} onRetry={() => void refetch()} /> : null}
      {!isLoading && !error && users.length === 0 ? (
        <EmptyState title="No encontramos usuarios" hint="Probá con otro nombre o correo." />
      ) : null}

      {users.length > 0 ? (
        <View>
          <ListHeader>
            <HeaderCell label="Persona" style={styles.whoCell} />
            <HeaderCell label="Rol y estado" style={styles.tagsCell} />
            <HeaderCell label="Cambiar rol" style={styles.rolesCell} />
          </ListHeader>
          {users.map((user) => (
            <UserRow key={user.id} user={user} query={submitted} />
          ))}
        </View>
      ) : null}

      {!isLoading && !error && users.length > 0 ? (
        <View style={styles.pager}>
          <Text style={[styles.meta, { color: theme.colors.neutral[800] }]}>
            {`Mostrando ${userOffset + 1}–${userOffset + users.length} de ${total}`}
          </Text>
          <View style={styles.pagerActions}>
            <OutlineButton
              label="Anteriores"
              disabled={userOffset === 0}
              onPress={() => setUserOffset(Math.max(0, userOffset - PAGE_SIZE))}
            />
            <OutlineButton
              label="Siguientes"
              disabled={userOffset + users.length >= total}
              onPress={() => setUserOffset(userOffset + PAGE_SIZE)}
            />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

function UserRow({ user, query }: { user: ManagedUser; query: string }) {
  const theme = useTheme();
  const isWide = useIsWide();
  const change = useChangeRole(query);

  const message =
    change.error instanceof ApiError
      ? change.error.code === 'cannot_demote_yourself'
        ? 'No puedes cambiar tu propio rol.'
        : change.error.code === 'last_admin'
          ? 'Tiene que quedar al menos un administrador.'
          : 'No pudimos cambiar el rol.'
      : null;

  return (
    <ListRow>
      <View style={[styles.who, isWide ? styles.whoCell : undefined]}>
        <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
          {user.fullName}
        </Text>
        <Text style={[styles.meta, { color: theme.colors.neutral[800] }]} numberOfLines={1}>
          {user.email}
        </Text>
        {message ? (
          <Text style={[styles.meta, { color: theme.colors.accentRamp[700] }]}>{message}</Text>
        ) : null}
      </View>

      <View style={[styles.tags, isWide ? styles.tagsCell : undefined]}>
        <Tag
          label={ROLE_LABELS[user.role]}
          tone={user.role === 'student' ? 'neutral' : 'accent'}
          filled={user.role === 'admin'}
        />
        <Tag
          label={user.isActive ? 'Activa' : 'Inactiva'}
          tone={user.isActive ? 'accent' : 'neutral'}
          filled={user.isActive}
        />
      </View>

      <View style={[styles.roles, isWide ? styles.rolesCell : undefined]}>
        {ROLES.map((role: Role) => {
          const active = user.role === role;

          return (
            <Pressable
              key={role}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              disabled={active || change.isPending}
              onPress={() => change.mutate({ userId: user.id, role })}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active ? theme.colors.accent : 'transparent',
                  borderColor: active ? theme.colors.accent : theme.colors.divider,
                  borderRadius: theme.radius.sm,
                  opacity: change.isPending ? 0.5 : pressed ? 0.7 : 1,
                },
              ]}
            >
              {change.isPending && !active ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? '#f2f2f3' : theme.colors.neutral[800] },
                  ]}
                >
                  {ROLE_LABELS[role]}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </ListRow>
  );
}

const styles = StyleSheet.create({
  meta: { fontSize: 13, lineHeight: 19 },
  who: { gap: 3.4, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '600' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6.8 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 6.8 },
  // The header cells and the row cells share these, so the names sit over
  // their columns.
  whoCell: { flex: 1, minWidth: 0 },
  tagsCell: { width: 200 },
  rolesCell: { width: 330 },
  chip: {
    borderWidth: 1,
    paddingVertical: 6.8,
    paddingHorizontal: 10.2,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  pager: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6.8,
  },
  pagerActions: { flexDirection: 'row', gap: 6.8 },
});

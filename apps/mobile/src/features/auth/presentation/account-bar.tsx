import { Link, usePathname, type Href } from 'expo-router';
import {
  Award,
  BookOpen,
  UsersRound,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  LogOut,
  Presentation,
  Shield,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { BrandMark } from '@/core/ui/brand-mark';
import { DropdownMenu } from '@/core/ui/dropdown-menu';
import { Icon } from '@/core/ui/icon';
import { ProfileAvatar } from '@/core/ui/profile-avatar';
import { useLogout, useSession } from '@/features/auth/application/use-auth';
import {
  SESSION_ROLE_LABELS,
  appNavItemsForRole,
  courseSlugInPath,
  firstGivenName,
  resolveAppLocation,
  type AppLocationCrumb,
  type AppNavItem,
  type AppSectionId,
} from '@/features/auth/domain/app-location';
import type { User } from '@/features/auth/domain/entities';
import { useCourse } from '@/features/catalog';

const SECTION_ICONS: Partial<Record<AppSectionId, LucideIcon>> = {
  catalog: BookOpen,
  'my-courses': GraduationCap,
  certificates: Award,
  community: UsersRound,
  instructor: Presentation,
  admin: Shield,
};

/**
 * Who is signed in, where they are, and the way out.
 *
 * The bar says the place. The person is a first name on a chip; role, correo
 * and logout live in the menu so the chrome does not shout.
 */
export function AccountBar() {
  const theme = useTheme();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { user, isAuthenticated, isLoading } = useSession();
  const courseTitle = useCourseTitle(courseSlugInPath(pathname));

  if (isLoading || !isAuthenticated || !user) return null;

  const location = resolveAppLocation(pathname, { courseTitle });
  const navItems = appNavItemsForRole(user.role);
  const isWide = width >= breakpoint.compact;

  return (
    <View
      style={[
        styles.bar,
        isWide ? styles.barWide : styles.barStacked,
        { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.divider },
      ]}
    >
      <View style={[styles.place, isWide ? styles.placeWide : undefined]}>
        <Link href="/" asChild>
          <Pressable accessibilityRole="link" accessibilityLabel="ILIA, inicio">
            <BrandMark variant="monogram" height={28} />
          </Pressable>
        </Link>
        <View style={styles.placeCopy} accessibilityRole="header">
          <Text style={[styles.hereKicker, { color: theme.colors.neutral[500] }]}>Estás en</Text>
          <LocationTrail crumbs={location.crumbs} />
        </View>
      </View>

      <View style={[styles.nav, isWide ? undefined : styles.navFull]} accessibilityLabel="Secciones de ILIA">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} isCurrent={item.sectionId === location.sectionId} />
        ))}
      </View>

      <SessionMenu key={pathname} user={user} />
    </View>
  );
}

/**
 * The title of the course the path is inside, or undefined while it loads.
 *
 * Same query, same key and same five-minute freshness as the course page, so
 * arriving from there costs nothing. Landing straight on a lesson or the forum
 * pays one request, once; until it answers, the trail shows the readable slug.
 */
function useCourseTitle(slug: string | undefined): string | undefined {
  return useCourse(slug ?? '').course?.title;
}

function SessionMenu({ user }: { user: User }) {
  const theme = useTheme();
  const logout = useLogout();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const givenName = firstGivenName(user.fullName);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <View style={styles.session}>
      <DropdownMenu
        isOpen={isMenuOpen}
        onClose={closeMenu}
        trigger={
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: isMenuOpen }}
            accessibilityLabel={`Cuenta de ${givenName}`}
            onPress={() => setIsMenuOpen((open) => !open)}
            style={({ pressed }) => [
              styles.sessionTrigger,
              {
                backgroundColor: theme.colors.neutral[100],
                borderColor: theme.colors.divider,
                borderRadius: theme.radius.sm,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <ProfileAvatar name={user.fullName} avatarKey={user.avatarKey} avatarUrl={user.avatarUrl} size={26} />
            <Text style={[styles.sessionName, { color: theme.colors.text }]}>{givenName}</Text>
            <Icon glyph={ChevronDown} size={14} color={theme.colors.neutral[500]} />
          </Pressable>
        }
      >
        <View style={styles.menuIdentity}>
          <ProfileAvatar name={user.fullName} avatarKey={user.avatarKey} avatarUrl={user.avatarUrl} size={36} />
          <View style={styles.menuIdentityCopy}>
            <Text style={[styles.menuFullName, { color: theme.colors.text }]}>{user.fullName}</Text>
            <Text style={[styles.menuMeta, { color: theme.colors.neutral[600] }]}>
              {SESSION_ROLE_LABELS[user.role]}
            </Text>
            <Text style={[styles.menuMeta, { color: theme.colors.neutral[500] }]} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
        </View>

        <View style={[styles.menuRule, { backgroundColor: theme.colors.divider }]} />

        <Link href="/account" asChild>
          <Pressable
            accessibilityRole="link"
            onPress={closeMenu}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={styles.menuRow}>
              <Icon glyph={UserRound} color={theme.colors.text} />
              <Text style={[styles.menuRowLabel, { color: theme.colors.text }]}>Tu cuenta</Text>
            </View>
          </Pressable>
        </Link>

        <Pressable
          accessibilityRole="button"
          disabled={logout.isPending}
          onPress={() => logout.mutate()}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={styles.menuRow}>
            {logout.isPending ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <>
                <Icon glyph={LogOut} color={theme.colors.accent} />
                <Text style={[styles.menuRowLabel, { color: theme.colors.accentAlt }]}>Cerrar sesión</Text>
              </>
            )}
          </View>
        </Pressable>
      </DropdownMenu>
    </View>
  );
}

function LocationTrail({ crumbs }: { crumbs: AppLocationCrumb[] }) {
  const theme = useTheme();

  return (
    <View style={styles.trail}>
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <View key={`${crumb.href}-${crumb.label}`} style={styles.trailItem}>
            {index > 0 ? (
              <Icon glyph={ChevronRight} size={12} color={theme.colors.neutral[400]} />
            ) : null}
            {isLast ? (
              <Text style={[styles.hereNow, { color: theme.colors.text }]} numberOfLines={1}>
                {crumb.label}
              </Text>
            ) : (
              <Link href={crumb.href as Href} style={[styles.trailLink, { color: theme.colors.neutral[600] }]}>
                {crumb.label}
              </Link>
            )}
          </View>
        );
      })}
    </View>
  );
}

function NavLink({ item, isCurrent }: { item: AppNavItem; isCurrent: boolean }) {
  const theme = useTheme();
  const glyph = SECTION_ICONS[item.sectionId];
  const color = isCurrent ? theme.colors.text : theme.colors.neutral[600];

  return (
    <Link href={item.href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityState={{ selected: isCurrent }}
        accessibilityLabel={isCurrent ? `${item.label}, sección actual` : item.label}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.navItem,
              {
                borderBottomColor: isCurrent ? theme.colors.text : 'transparent',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            {glyph ? <Icon glyph={glyph} size={15} color={color} /> : null}
            <Text
              style={[
                styles.navLabel,
                { color, fontWeight: isCurrent ? '700' : '600' },
              ]}
            >
              {item.label}
            </Text>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 20.4,
    paddingVertical: 10.2,
    borderBottomWidth: 1,
    gap: 10.2,
    zIndex: 20,
  },
  barWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10.2,
    flexShrink: 1,
    minWidth: 0,
  },
  placeWide: {
    flex: 1,
  },
  placeCopy: {
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  hereKicker: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  trail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
  },
  trailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trailLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  hereNow: {
    fontSize: 15,
    fontWeight: '700',
  },
  nav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  navFull: {
    width: '100%',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 2,
  },
  navLabel: {
    fontSize: 13,
  },
  session: {
    alignSelf: 'flex-end',
  },
  sessionTrigger: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 36,
    paddingLeft: 5,
    paddingRight: 10,
    borderWidth: 1,
  },
  sessionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  menuIdentity: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuIdentityCopy: {
    flexShrink: 1,
    minWidth: 0,
  },
  menuFullName: {
    fontSize: 15,
    fontWeight: '700',
  },
  menuMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  menuRule: {
    height: 1,
    marginVertical: 6,
  },
  menuRow: {
    display: 'flex',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  menuRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});

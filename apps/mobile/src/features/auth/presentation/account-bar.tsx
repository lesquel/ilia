import { Link, usePathname, type Href } from 'expo-router';
import {
  Award,
  BookOpen,
  UsersRound,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  House,
  LogOut,
  Presentation,
  Shield,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { BrandMark } from '@/core/ui/brand-mark';
import { DropdownMenu } from '@/core/ui/dropdown-menu';
import { Icon } from '@/core/ui/icon';
import { ProfileAvatar } from '@/core/ui/profile-avatar';
import { CodeModuleButton } from '@/features/auth/presentation/code-module-button';
import { useLogout, useSession } from '@/features/auth/application/use-auth';
import {
  SESSION_ROLE_LABELS,
  appNavItemsForRole,
  compactCrumbs,
  courseSlugInPath,
  firstGivenName,
  isImmersivePath,
  resolveAppLocation,
  tabItemsForRole,
  type AppLocationCrumb,
  type AppNavItem,
  type AppSectionId,
} from '@/features/auth/domain/app-location';
import type { User } from '@/features/auth/domain/entities';
import { useCourse } from '@/features/catalog';

const SECTION_ICONS: Partial<Record<AppSectionId, LucideIcon>> = {
  home: House,
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
  // Instructors and admins carry six or seven sections; on one row below the
  // medium width they squeezed the trail down to "C…". They get the phone bar
  // there, with the sections in the bottom tab bar.
  const isWide = width >= (navItems.length > 5 ? breakpoint.medium : breakpoint.compact);

  const place = (
    <View style={[styles.place, styles.placeGrow]}>
      <Link href="/" asChild>
        <Pressable accessibilityRole="link" accessibilityLabel="ILIA, inicio">
          <BrandMark variant="monogram" height={isWide ? 28 : 24} />
        </Pressable>
      </Link>
      <View
        style={styles.placeCopy}
        accessibilityRole="header"
        accessibilityLabel={`Estás en ${location.crumbs.map((crumb) => crumb.label).join(', ')}`}
      >
        <LocationTrail crumbs={isWide ? location.crumbs : compactCrumbs(location.crumbs)} />
      </View>
    </View>
  );
  const links = navItems.map((item) => (
    <NavLink key={item.href} item={item} isCurrent={item.sectionId === location.sectionId} />
  ));
  const barColors = { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.divider };

  if (isWide) {
    return (
      <View style={[styles.bar, styles.barWide, barColors]}>
        {place}
        <View style={styles.nav} accessibilityLabel="Secciones de ILIA">
          {links}
        </View>
        <CodeModuleButton />
        <SessionMenu key={pathname} user={user} />
      </View>
    );
  }

  // Phone width: one row with the place and the account. The sections live in
  // the bottom tab bar (`SectionTabBar`), where the thumb reaches them.
  return (
    <View style={[styles.bar, styles.barCompact, barColors]}>
      <View style={styles.compactTop}>
        {place}
        <CodeModuleButton />
        <SessionMenu key={pathname} user={user} compact />
      </View>
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

function SessionMenu({ user, compact = false }: { user: User; compact?: boolean }) {
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
            {compact ? null : (
              <Text style={[styles.sessionName, { color: theme.colors.text }]}>{givenName}</Text>
            )}
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

/**
 * The trail: parents as quiet links, the current place in bold, on one line.
 *
 * It never wraps. A second line made the bar change height from page to page;
 * long titles are cut with an ellipsis instead, and the full trail is read out
 * by the header's accessibility label.
 */
function LocationTrail({ crumbs }: { crumbs: AppLocationCrumb[] }) {
  const theme = useTheme();

  return (
    <View style={styles.trail}>
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <View
            key={`${crumb.href}-${crumb.label}`}
            style={[styles.trailItem, isLast ? styles.trailItemNow : null]}
          >
            {index > 0 ? (
              <Icon glyph={ChevronRight} size={14} color={theme.colors.neutral[400]} />
            ) : null}
            {isLast ? (
              <Text
                style={[styles.hereNow, { color: theme.colors.text }]}
                numberOfLines={1}
                accessibilityRole="text"
              >
                {crumb.label}
              </Text>
            ) : (
              <Link href={crumb.href as Href} asChild>
                <Pressable accessibilityRole="link" style={styles.trailPress}>
                  {({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => (
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.trailLink,
                        {
                          color: hovered || pressed ? theme.colors.accent : theme.colors.neutral[600],
                          textDecorationLine: hovered ? 'underline' : 'none',
                        },
                      ]}
                    >
                      {crumb.label}
                    </Text>
                  )}
                </Pressable>
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
  const color = isCurrent ? '#ffffff' : theme.colors.neutral[700];

  return (
    <Link href={item.href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityState={{ selected: isCurrent }}
        accessibilityLabel={isCurrent ? `${item.label}, sección actual` : item.label}
      >
        {({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => (
          // Proposal A: the current section is a dark pill, the rest are quiet
          // until hovered.
          <View
            style={[
              styles.navItem,
              {
                backgroundColor: isCurrent
                  ? theme.colors.ink
                  : hovered
                    ? theme.colors.neutral[100]
                    : 'transparent',
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            {glyph ? <Icon glyph={glyph} size={15} color={color} /> : null}
            <Text style={[styles.navLabel, { color }]}>{item.label}</Text>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

/**
 * The phone's sections, at the bottom where the thumb reaches them. Hidden on
 * wide screens (the bar on top carries them) and inside a lesson or the lab,
 * which have their own bottom controls.
 */
export function SectionTabBar() {
  const theme = useTheme();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { user, isAuthenticated } = useSession();

  if (!isAuthenticated || !user || isImmersivePath(pathname)) return null;
  const navItems = appNavItemsForRole(user.role);
  const isWide = width >= (navItems.length > 5 ? breakpoint.medium : breakpoint.compact);
  if (isWide) return null;

  const current = resolveAppLocation(pathname).sectionId;

  return (
    <View
      accessibilityLabel="Secciones de ILIA"
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
          // The root SafeAreaView already keeps it above the home indicator.
          paddingBottom: 6,
        },
      ]}
    >
      {tabItemsForRole(user.role).map((item) => {
        const isCurrent = item.sectionId === current;
        const glyph = SECTION_ICONS[item.sectionId];
        const color = isCurrent ? theme.colors.accentButton : theme.colors.neutral[600];
        return (
          <Link key={item.href} href={item.href} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityState={{ selected: isCurrent }}
              accessibilityLabel={isCurrent ? `${item.label}, sección actual` : item.label}
              style={styles.tabItem}
            >
              {glyph ? <Icon glyph={glyph} size={22} color={color} /> : null}
              <Text
                numberOfLines={1}
                style={[styles.tabLabel, { color, fontWeight: isCurrent ? '700' : '600' }]}
              >
                {item.label}
              </Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
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
  barCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
  },
  compactTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10.2,
    flexShrink: 1,
    minWidth: 0,
  },
  placeGrow: {
    flex: 1,
  },
  // Takes the free width beside the logo, so the trail's percentages have a
  // real width to resolve against; without it the trail collapsed to "Cat…".
  placeCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  trail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  trailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  // The current place gives up width last: it is the one the person reads.
  trailItemNow: {
    flexShrink: 0,
    maxWidth: '70%',
  },
  trailPress: {
    flexShrink: 1,
    minWidth: 0,
    paddingVertical: 4,
  },
  trailLink: {
    fontSize: 14,
    fontWeight: '500',
  },
  hereNow: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  nav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
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

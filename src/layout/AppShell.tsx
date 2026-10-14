import {
  AvatarV2,
  AvatarV2Shape,
  AvatarV2Size,
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  FOUNDATION_THEME,
  SidebarV2,
  SidebarV2StateChange,
  type SidebarV2StateChangeType,
} from '@juspay/blend-design-system'
import { ChevronDown } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import avatarImage from '../assets/avatar.png'
import starsIcon from '../assets/icons/stars-02.svg'
import tenantIcon1 from '../assets/icons/tenant-icon-1.svg'
import tenantIcon2 from '../assets/icons/tenant-icon-2.svg'
import tenantLogo from '../assets/icons/tenant-logo.svg'
import merchantOrb from '../assets/merchant-hyper-recon.png'
import MaskIcon from '../components/MaskIcon'
import { font } from '../primitives'
import { CHROME_HOVER } from './chrome'
import { PACB_ROUTES } from '../pages/pacb/routes'
import { PLAYGROUND_ROUTES } from '../pages/playground/routes'
import {
  ALERTS_PATH,
  CONFIGURATOR_PATH,
  HOME_PATH,
  LEDGER_V1_PATH,
  LEDGER_V2_PATH,
  buildNavigationData,
  expandableItemLabels,
} from './navigation'
import { TopbarStatusIcons } from './topbar'
import { useOpenNestedMenus } from './use-open-nested-menus'

const { colors } = FOUNDATION_THEME

/**
 * The rail starts collapsed — the app opens on the Configurator (src/router.tsx) and the
 * page, not the nav, is what you came for.
 *
 * Seeded into `isRailCollapsed` as well as handed to SidebarV2, because the footer rows
 * below are ours to draw and SidebarV2 only reports its state from an effect
 * (SidebarV2.tsx:171-173) — i.e. after the first paint. Initialising from `false` would
 * paint one frame of full-width footer rows inside a 52px rail before the effect corrected
 * it.
 */
const RAIL_STARTS_EXPANDED = false

/**
 * `/`, Blend's own default, chosen on purpose despite AGENTS.md rule 8.6: SidebarV2 listens
 * for it anywhere outside a form field, so a stray slash toggles the rail. Typing into an
 * input is safe.
 */
const SIDEBAR_COLLAPSE_KEY = '/'

/**
 * The sidebar rows this file draws — the footer's menu items and the profile.
 *
 * 500, matching the nav rows Blend draws above them (src/theme.ts). They are the same kind
 * of row in the same column, so they move together; `font()` already emits 500, which is
 * why no weight is restated here.
 */
const MENU_ROW = font(FOUNDATION_THEME.font.size.body.md)

const tenants = [
  { label: 'Juspay', value: 'juspay', icon: tenantLogo },
  { label: 'Breeze', value: 'breeze', icon: tenantIcon1 },
  { label: 'Hyperswitch', value: 'hyperswitch', icon: tenantIcon2 },
]

/** The signed-in user, as the design names them — the row shows a name, not an address. */
const PROFILE_NAME = 'Waqar Khan'

/**
 * The merchant the rail is scoped to — node 4405:10766. The orb is the design's own export,
 * downscaled to 64px: it renders at 14, and the 1024px original was 1.25MB for an icon.
 *
 * Sized outright rather than `size-full`: the sidebar's slot is 14px, but the mobile
 * topbar's merchant switcher gives it no box of its own, and filling that drew the orb at
 * its full 64px.
 */
const merchants = [
  {
    label: 'Hyper Recon',
    value: 'hyper-recon',
    icon: <img src={merchantOrb} alt="" className="block size-3.5 rounded object-cover" />,
  },
]

/**
 * The topbar's left side names the page you are on — the nav item's own label, so the two
 * cannot disagree. Pages the nav does not route (there is no label to show) leave it empty.
 */
function TopbarContent({ title }: { title?: string }) {
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-4">
      <span
        className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
        style={{
          ...MENU_ROW,
          fontWeight: FOUNDATION_THEME.font.weight[600],
          color: colors.gray[700],
        }}
      >
        {title}
      </span>
      <TopbarActions />
    </div>
  )
}

function TopbarActions() {
  return (
    <div className="flex items-center gap-1.5">
      <TopbarStatusIcons />
      <div className="h-6 w-px self-stretch" style={{ backgroundColor: colors.gray[200] }} />
      <span className="inline-flex">
        <ButtonV2
          buttonType={ButtonV2Type.SECONDARY}
          size={ButtonV2Size.SMALL}
          text="Ask Genius"
          // The design's sparkle, drawn in the label's ink rather than its old gradient.
          leftSlot={{ slot: <MaskIcon src={starsIcon} size={16} color={colors.gray[700]} /> }}
        />
      </span>
    </div>
  )
}

/**
 * The signed-in user, and the whole of the sidebar footer: a round avatar, the name, and a
 * chevron at the far end.
 *
 * Blend's footer draws the rule above it (`footer.borderTop`), so the row needs no divider
 * of its own. SidebarV2 passes `footer` straight through without saying the rail has
 * collapsed, so this drops the name and chevron itself at 52px — left alone they would be
 * clipped to a sliver by the panel's `overflow: hidden` — and takes its accessible name from
 * aria-label instead.
 */
function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  return (
    <button
      type="button"
      aria-label={collapsed ? PROFILE_NAME : undefined}
      title={collapsed ? PROFILE_NAME : undefined}
      style={{ ...CHROME_HOVER, borderRadius: FOUNDATION_THEME.border.radius[8] }}
      // py-3.5 (14px) around the 24px avatar makes the row 52px — the rail's own width, so the
      // footer is as tall as the collapsed rail is wide.
      className={`flex w-full cursor-pointer items-center border-none bg-transparent py-3.5 hover:bg-[var(--chrome-hover)] ${
        collapsed ? 'justify-center px-0' : 'gap-2 px-2'
      }`}
    >
      <AvatarV2
        src={avatarImage}
        alt={PROFILE_NAME}
        size={AvatarV2Size.SM}
        shape={AvatarV2Shape.CIRCULAR}
      />
      {!collapsed && (
        <>
          <span
            className="flex-1 overflow-hidden text-left text-ellipsis whitespace-nowrap"
            style={{ ...MENU_ROW, color: colors.gray[700] }}
          >
            {PROFILE_NAME}
          </span>
          <ChevronDown size={16} color={colors.gray[400]} aria-hidden />
        </>
      )}
    </button>
  )
}

function AppShell({ children }: { children?: ReactNode }) {
  const [tenant, setTenant] = useState(tenants[0].value)
  const [merchant, setMerchant] = useState(merchants[0].value)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  /**
   * Only the boolean is stored, never the enum. Compared against COLLAPSED specifically,
   * not `!isExpanded`: the third state, INTERMEDIATE, is the hover-peek where the rail is
   * visually wide again, and Blend's own SidebarV2Footer makes exactly this comparison for
   * its justifyContent. Storing the enum would re-render the whole chrome on the first
   * mouse-enter of an already-expanded rail — a new value, an unchanged answer.
   */
  const [isRailCollapsed, setIsRailCollapsed] = useState(!RAIL_STARTS_EXPANDED)

  /**
   * Stable by necessity, not tidiness: SidebarV2.tsx:171-173 keys an effect on this
   * callback, so an inline arrow would re-fire it on every SidebarV2 render.
   */
  const handleSidebarState = useCallback(
    (state: SidebarV2StateChangeType) =>
      setIsRailCollapsed(state === SidebarV2StateChange.COLLAPSED),
    [],
  )

  const isHomeActive = pathname === HOME_PATH
  const isConfiguratorActive = pathname === CONFIGURATOR_PATH
  const isAlertsActive = pathname === ALERTS_PATH
  const moduleRoute = [...PACB_ROUTES, ...PLAYGROUND_ROUTES].find(({ path }) => path === pathname)
  const activeModulePath = moduleRoute ? pathname : null
  const pageTitle = isHomeActive
    ? 'Home'
    : isConfiguratorActive
      ? 'Configurator'
      : isAlertsActive
        ? 'Alerts'
        : moduleRoute?.label
  const isLedgerV1Active = pathname === LEDGER_V1_PATH
  const isLedgerV2Active = pathname === LEDGER_V2_PATH
  const navigationData = useMemo(
    () =>
      buildNavigationData({
        isHomeActive,
        isConfiguratorActive,
        isAlertsActive,
        isLedgerV1Active,
        isLedgerV2Active,
        activeModulePath,
        navigate,
      }),
    [
      isHomeActive,
      isConfiguratorActive,
      isAlertsActive,
      isLedgerV1Active,
      isLedgerV2Active,
      activeModulePath,
      navigate,
    ],
  )
  // Every nested menu starts open on this branch — see use-open-nested-menus.ts.
  useOpenNestedMenus(expandableItemLabels(navigationData))

  return (
    <SidebarV2
      data={navigationData}
      showHierarchyLines
      secondarySidebar={{
        items: tenants.map(({ label, value, icon }) => ({
          label,
          value,
          icon: <img src={icon} alt="" className="block size-4 object-contain" />,
        })),
        selected: tenant,
        onSelect: setTenant,
      }}
      merchantInfo={{
        items: merchants,
        selected: merchant,
        onSelect: setMerchant,
      }}
      topbar={<TopbarContent title={pageTitle} />}
      rightActions={<TopbarActions />}
      defaultIsExpanded={RAIL_STARTS_EXPANDED}
      sidebarCollapseKey={SIDEBAR_COLLAPSE_KEY}
      onSidebarStateChange={handleSidebarState}
      footer={<SidebarFooter collapsed={isRailCollapsed} />}
    >
      {children}
    </SidebarV2>
  )
}

export default AppShell

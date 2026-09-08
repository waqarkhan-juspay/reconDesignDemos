import {
  AvatarV2,
  AvatarV2Shape,
  AvatarV2Size,
  FOUNDATION_THEME,
  SidebarV2,
  SidebarV2StateChange,
  type SidebarV2StateChangeType,
} from '@juspay/blend-design-system'
import { CaretDown, Gear } from '@phosphor-icons/react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import avatarImage from '../assets/avatar.png'
import codeSnippetIcon from '../assets/icons/code-snippet-01.svg'
import searchIcon from '../assets/icons/search-md.svg'
import starsIcon from '../assets/icons/stars-02.svg'
import tenantIcon1 from '../assets/icons/tenant-icon-1.svg'
import tenantIcon2 from '../assets/icons/tenant-icon-2.svg'
import tenantLogo from '../assets/icons/tenant-logo.svg'
import MaskIcon from '../components/MaskIcon'
import { font } from '../primitives'
import { CHROME_HOVER } from './chrome'
import { CONFIGURATOR_PATH, HOME_PATH, buildNavigationData } from './navigation'
import { TopbarStatusIcons } from './topbar'

const { colors } = FOUNDATION_THEME

/** The one type used by every label in the chrome: body/md, semibold. */
const LABEL = { ...font(FOUNDATION_THEME.font.size.body.md), fontWeight: FOUNDATION_THEME.font.weight[600] }

const tenants = [
  { label: 'Juspay', value: 'juspay', icon: tenantLogo },
  { label: 'Breeze', value: 'breeze', icon: tenantIcon1 },
  { label: 'Hyperswitch', value: 'hyperswitch', icon: tenantIcon2 },
]

const merchants = [{ label: 'Recon Demos', value: 'recon-demos' }]

function TopbarSearch() {
  return (
    <button
      type="button"
      className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent py-1.5"
    >
      <MaskIcon src={searchIcon} size={16} color={colors.gray[400]} />
      <span className="whitespace-pre" style={{ ...LABEL, color: colors.gray[400] }}>
        {'Search  (⌘K)'}
      </span>
    </button>
  )
}

function TopbarContent() {
  return (
    <div className="flex w-full items-center justify-between">
      <TopbarSearch />
      <TopbarActions />
    </div>
  )
}

function TopbarActions() {
  return (
    <div className="flex items-center gap-1.5">
      <TopbarStatusIcons />
      <div className="h-6 w-px self-stretch" style={{ backgroundColor: colors.gray[200] }} />
      <button
        type="button"
        className="flex cursor-pointer items-center gap-[5px] border-none bg-transparent px-1"
      >
        <img src={starsIcon} alt="" className="block size-3" />
        <span className="bg-gradient-to-r from-[#6461ff] to-[#3877ff] bg-clip-text text-[14px] leading-[20px] font-bold text-transparent">
          Ask Genius
        </span>
      </button>
    </div>
  )
}

/**
 * Footer rows drop their labels when the rail collapses.
 *
 * SidebarV2 passes the `footer` node straight through — `SidebarV2Footer` only flips its
 * own justifyContent — so the footer has no idea the rail narrowed to ~52px. Left alone,
 * these full-width rows keep their `px-3` and their text and are simply clipped by the
 * panel's `overflow: hidden`, which is what showed as "Set" / "F" / "D" slivers.
 */
function FooterMenuItem({
  icon,
  label,
  collapsed,
}: {
  icon: ReactNode
  label: string
  collapsed: boolean
}) {
  return (
    <button
      type="button"
      // The label is dropped rather than clipped when collapsed, so the accessible name
      // has to come from aria-label — otherwise the button becomes an unnamed icon.
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      className={`flex w-full cursor-pointer items-center rounded border-none bg-transparent py-1.5 hover:bg-[var(--chrome-hover)] ${
        collapsed ? 'justify-center px-0' : 'gap-2 px-3 text-left'
      }`}
      style={{ ...CHROME_HOVER, color: colors.gray[600] }}
    >
      {icon}
      {!collapsed && <span style={LABEL}>{label}</span>}
    </button>
  )
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-2">
        <FooterMenuItem icon={<Gear size={12} />} label="Settings" collapsed={collapsed} />
        <FooterMenuItem
          icon={<MaskIcon src={codeSnippetIcon} size={12} />}
          label="For Developers"
          collapsed={collapsed}
        />
      </div>
      <div
        className="-mx-2 border-t px-2 pt-3"
        style={{ borderColor: colors.gray[200] }}
      >
        <button
          type="button"
          aria-label={collapsed ? 'waqar@juspay.in' : undefined}
          title={collapsed ? 'waqar@juspay.in' : undefined}
          style={CHROME_HOVER}
          className={`flex w-full cursor-pointer items-center rounded-[10px] border-none bg-transparent py-2.5 hover:bg-[var(--chrome-hover)] ${
            collapsed ? 'justify-center px-0' : 'gap-1.5 px-3'
          }`}
        >
          <AvatarV2
            src={avatarImage}
            alt="waqar@juspay.in"
            size={AvatarV2Size.SM}
            shape={AvatarV2Shape.ROUNDED}
          />
          {!collapsed && (
            <>
              <span
                className="flex-1 overflow-hidden text-left text-ellipsis whitespace-nowrap"
                style={{ ...LABEL, color: colors.gray[400] }}
              >
                waqar@juspay.in
              </span>
              <CaretDown size={16} color={colors.gray[400]} />
            </>
          )}
        </button>
      </div>
    </div>
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
  const [isRailCollapsed, setIsRailCollapsed] = useState(false)

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
  const navigationData = useMemo(
    () => buildNavigationData({ isHomeActive, isConfiguratorActive, navigate }),
    [isHomeActive, isConfiguratorActive, navigate],
  )

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
      topbar={<TopbarContent />}
      rightActions={<TopbarActions />}
      onSidebarStateChange={handleSidebarState}
      footer={<SidebarFooter collapsed={isRailCollapsed} />}
    >
      {children}
    </SidebarV2>
  )
}

export default AppShell

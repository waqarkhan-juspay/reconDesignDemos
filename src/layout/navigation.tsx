import type { DirectoryData } from '@juspay/blend-design-system'
import {
  Airplay,
  ArrowSquareIn,
  Bell,
  Cardholder,
  CaretRight,
  Faders,
  Headphones,
  House,
} from '@phosphor-icons/react'
import announcementIcon from '../assets/icons/announcement-01.svg'
import coinsStackedIcon from '../assets/icons/coins-stacked-04.svg'
import globeIcon from '../assets/icons/globe-01.svg'
import switchVerticalIcon from '../assets/icons/switch-vertical-01.svg'
import trendUpIcon from '../assets/icons/trend-up-01.svg'
import MaskIcon from '../components/MaskIcon'

const ICON_SIZE = 12
const CHEVRON_SIZE = 14

export const CONFIGURATOR_PATH = '/configurator'

const analyticsSubItems = [
  'Refund Analytics',
  'Transaction Analytics',
  'SDK Analytics',
  'Routing Analytics',
  'Offer Analytics',
].map((label) => ({ label }))

export type NavigationOptions = {
  /**
   * Whether the Configurator item is the active route. A boolean rather than the pathname,
   * so that navigating between two routes that are both "not Configurator" does not rebuild
   * a byte-identical tree — SidebarV2 re-binds scroll and resize listeners on a new `data`
   * identity (SidebarV2.tsx:230-274).
   */
  isConfiguratorActive: boolean
  /** Router push. Blend's NavItem does no routing of its own — see below. */
  navigate: (to: string) => void
}

/**
 * Built per render rather than exported as a constant, because nav items need the router:
 * `NavItem.tsx:352` calls `preventDefault()` on every plain left click and does not route,
 * so `href` alone goes nowhere and an `onClick` is required. `href` still earns its place —
 * cmd/ctrl-click bails out before that handler and opens the real URL in a new tab.
 */
export function buildNavigationData({
  isConfiguratorActive,
  navigate,
}: NavigationOptions): DirectoryData[] {
  return [
    {
      items: [
        { label: 'Home', leftSlot: <House size={ICON_SIZE} /> },
        { label: 'Marketplace', leftSlot: <MaskIcon src={globeIcon} size={ICON_SIZE} /> },
        { label: 'What’s New', leftSlot: <MaskIcon src={announcementIcon} size={ICON_SIZE} /> },
      ],
    },
    {
      label: 'Onboarding',
      isCollapsible: true,
      defaultOpen: false,
      items: [],
    },
    {
      label: 'Operations',
      isCollapsible: true,
      defaultOpen: true,
      items: [
        {
          label: 'Auto Diagnostics',
          leftSlot: <MaskIcon src={coinsStackedIcon} size={ICON_SIZE} />,
        },
        {
          label: 'User Management',
          leftSlot: <MaskIcon src={switchVerticalIcon} size={ICON_SIZE} />,
        },
        {
          label: 'Analytics',
          leftSlot: <MaskIcon src={trendUpIcon} size={ICON_SIZE} />,
          items: analyticsSubItems,
        },
        { label: 'Support Analytics', leftSlot: <Headphones size={ICON_SIZE} /> },
        {
          label: 'Payment Page',
          leftSlot: <Cardholder size={ICON_SIZE} />,
          rightSlot: <CaretRight size={CHEVRON_SIZE} />,
        },
        {
          label: 'Mandate Management',
          leftSlot: <Airplay size={ICON_SIZE} />,
          rightSlot: <CaretRight size={CHEVRON_SIZE} />,
        },
        {
          label: 'Payout Management',
          leftSlot: <ArrowSquareIn size={ICON_SIZE} />,
          rightSlot: <CaretRight size={CHEVRON_SIZE} />,
        },
        { label: 'Notification Center', leftSlot: <Bell size={ICON_SIZE} /> },
      ],
    },
    {
      label: 'Reconciliation',
      isCollapsible: true,
      defaultOpen: true,
      items: [
        {
          label: 'Configurator',
          leftSlot: <Faders size={ICON_SIZE} />,
          href: CONFIGURATOR_PATH,
          onClick: () => navigate(CONFIGURATOR_PATH),
          // `isSelected` is what actually drives the highlight — it wins unconditionally
          // over Directory's `activeItem` prop, and the mobile nav reads only this.
          isSelected: isConfiguratorActive,
          // Without this the item is absent from the mobile drawer, where the desktop
          // nav is display:none — i.e. unreachable between 320px and 1024px.
          showOnMobile: true,
        },
      ],
    },
    { label: 'Configuration', isCollapsible: true, defaultOpen: false, items: [] },
    { label: 'Offers', isCollapsible: true, defaultOpen: false, items: [] },
    { label: 'Admin', isCollapsible: true, defaultOpen: false, items: [] },
  ]
}

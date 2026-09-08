import type { DirectoryData } from '@juspay/blend-design-system'
import { Faders, House } from '@phosphor-icons/react'

const ICON_SIZE = 12

export const HOME_PATH = '/'
export const CONFIGURATOR_PATH = '/configurator'

export type NavigationOptions = {
  /**
   * Which nav item is the active route, as booleans rather than the pathname, so that
   * navigating between two routes that are both "not this item" does not rebuild a
   * byte-identical tree — SidebarV2 re-binds scroll and resize listeners on a new `data`
   * identity (SidebarV2.tsx:230-274).
   */
  isHomeActive: boolean
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
  isHomeActive,
  isConfiguratorActive,
  navigate,
}: NavigationOptions): DirectoryData[] {
  return [
    {
      items: [
        {
          label: 'Home',
          leftSlot: <House size={ICON_SIZE} />,
          href: HOME_PATH,
          onClick: () => navigate(HOME_PATH),
          isSelected: isHomeActive,
          showOnMobile: true,
        },
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
  ]
}

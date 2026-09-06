import type { DirectoryData } from '@juspay/blend-design-system'
import {
  Airplay,
  ArrowSquareIn,
  Bell,
  Cardholder,
  CaretRight,
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

const analyticsSubItems = [
  'Refund Analytics',
  'Transaction Analytics',
  'SDK Analytics',
  'Routing Analytics',
  'Offer Analytics',
].map((label) => ({ label }))

export const navigationData: DirectoryData[] = [
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
  { label: 'Configuration', isCollapsible: true, defaultOpen: false, items: [] },
  { label: 'Offers', isCollapsible: true, defaultOpen: false, items: [] },
  { label: 'Admin', isCollapsible: true, defaultOpen: false, items: [] },
]

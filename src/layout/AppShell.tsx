import {
  AvatarV2,
  AvatarV2Shape,
  AvatarV2Size,
  FOUNDATION_THEME,
  SidebarV2,
} from '@juspay/blend-design-system'
import { CaretDown, Gear } from '@phosphor-icons/react'
import { Activity } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import avatarImage from '../assets/avatar.png'
import bellIcon from '../assets/icons/bell.svg'
import codeSnippetIcon from '../assets/icons/code-snippet-01.svg'
import questionIcon from '../assets/icons/question.svg'
import searchIcon from '../assets/icons/search-md.svg'
import starsIcon from '../assets/icons/stars-02.svg'
import tenantIcon1 from '../assets/icons/tenant-icon-1.svg'
import tenantIcon2 from '../assets/icons/tenant-icon-2.svg'
import tenantLogo from '../assets/icons/tenant-logo.svg'
import MaskIcon from '../components/MaskIcon'
import { navigationData } from './navigation'

const { colors } = FOUNDATION_THEME

const tenants = [
  { label: 'Juspay', value: 'juspay', icon: tenantLogo },
  { label: 'Breeze', value: 'breeze', icon: tenantIcon1 },
  { label: 'Hyperswitch', value: 'hyperswitch', icon: tenantIcon2 },
]

const merchants = [{ label: 'Recon Demos', value: 'recon-demos' }]

function TopbarIconButton({ children, label }: { children: ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex cursor-pointer items-center justify-center rounded-[10px] border-none bg-transparent p-2 hover:bg-[#f5f7fa]"
    >
      {children}
    </button>
  )
}

function TopbarSearch() {
  return (
    <button
      type="button"
      className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent py-1.5"
    >
      <MaskIcon src={searchIcon} size={16} color={colors.gray[400]} />
      <span
        className="text-[14px] leading-[20px] font-semibold whitespace-pre"
        style={{ color: colors.gray[400] }}
      >
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
      <div className="flex items-center">
        <TopbarIconButton label="System status">
          <Activity size={16} color={colors.green[600]} />
        </TopbarIconButton>
        <TopbarIconButton label="Notifications">
          <MaskIcon src={bellIcon} size={16} color={colors.gray[600]} />
        </TopbarIconButton>
        <TopbarIconButton label="Help">
          <MaskIcon src={questionIcon} size={16} color={colors.gray[600]} />
        </TopbarIconButton>
      </div>
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

function FooterMenuItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="flex w-full cursor-pointer items-center gap-2 rounded border-none bg-transparent px-3 py-1.5 text-left hover:bg-[#f5f7fa]"
      style={{ color: colors.gray[600] }}
    >
      {icon}
      <span className="text-[14px] leading-[20px] font-semibold">{label}</span>
    </button>
  )
}

function SidebarFooter() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-2">
        <FooterMenuItem icon={<Gear size={12} />} label="Settings" />
        <FooterMenuItem
          icon={<MaskIcon src={codeSnippetIcon} size={12} />}
          label="For Developers"
        />
      </div>
      <div
        className="-mx-2 border-t px-2 pt-3"
        style={{ borderColor: colors.gray[200] }}
      >
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-1.5 rounded-[10px] border-none bg-transparent px-3 py-2.5 hover:bg-[#f5f7fa]"
        >
          <AvatarV2
            src={avatarImage}
            alt="waqar@juspay.in"
            size={AvatarV2Size.SM}
            shape={AvatarV2Shape.ROUNDED}
          />
          <span
            className="flex-1 overflow-hidden text-left text-[14px] leading-[20px] font-semibold text-ellipsis whitespace-nowrap"
            style={{ color: colors.gray[400] }}
          >
            waqar@juspay.in
          </span>
          <CaretDown size={16} color={colors.gray[400]} />
        </button>
      </div>
    </div>
  )
}

function AppShell({ children }: { children?: ReactNode }) {
  const [tenant, setTenant] = useState(tenants[0].value)
  const [merchant, setMerchant] = useState(merchants[0].value)

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
      footer={<SidebarFooter />}
    >
      {children}
    </SidebarV2>
  )
}

export default AppShell

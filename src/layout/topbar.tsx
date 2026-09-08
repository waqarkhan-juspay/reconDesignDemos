import { FOUNDATION_THEME } from '@juspay/blend-design-system'
import { Activity } from 'lucide-react'
import type { ReactNode } from 'react'
import bellIcon from '../assets/icons/bell.svg'
import questionIcon from '../assets/icons/question.svg'
import MaskIcon from '../components/MaskIcon'
import { CHROME_HOVER } from './chrome'

const { colors } = FOUNDATION_THEME

export function TopbarIconButton({ children, label }: { children: ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      style={CHROME_HOVER}
      className="flex cursor-pointer items-center justify-center rounded-[10px] border-none bg-transparent p-2 hover:bg-[var(--chrome-hover)]"
    >
      {children}
    </button>
  )
}

/**
 * Status / notifications / help. Identical in the app shell and in the create-flow
 * takeover, which is the whole reason it lives here rather than in either of them.
 */
export function TopbarStatusIcons() {
  return (
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
  )
}

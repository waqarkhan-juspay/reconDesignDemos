import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  ChatInputV2,
  FOUNDATION_THEME,
} from '@juspay/blend-design-system'
import { ArrowUp, Sparkles } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { FEEDBACK_EASING, FEEDBACK_MS } from '../../motion'
import { PrimitiveText, font } from '../../primitives'
import type { Card, ChatMessage } from './assistant'

const { colors } = FOUNDATION_THEME

const BODY = font(FOUNDATION_THEME.font.size.body.md)

const PANEL_MOTION = {
  '--chat-feedback': `${FEEDBACK_MS}ms`,
  '--chat-feedback-ease': FEEDBACK_EASING,
} as CSSProperties

type ChatPanelProps = {
  messages: ChatMessage[]
  isReplying: boolean
  /** The chips over the input. The page picks them from where things stand. */
  suggestions: string[]
  onSend: (text: string) => void
  /** Files from the input's paperclip. The page decides where they go. */
  onAttach: (files: File[]) => void
  /** Draws a card the assistant attached to a message. The page owns what cards do. */
  renderCard: (card: Card) => ReactNode
}

/** The assistant's mark, beside each of its messages — all that names the assistant. */
function AssistantMark() {
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: colors.primary[50], color: colors.primary[600] }}
    >
      <Sparkles size={13} />
    </span>
  )
}

/**
 * The right-hand 30% of AI Recon: the conversation and Blend's ChatInputV2. No header —
 * the bubbles and the input say what the panel is, and the aside carries its name.
 *
 * An assistant message can carry cards under its text — the forms it fills in from what
 * was asked (cards.tsx) — so a request in words comes back as something to check and apply.
 *
 * blend-gap: Blend 0.0.37 ships the chat input but nothing to draw a conversation with — no
 * message or bubble component — so messages are composed here from PrimitiveText and tokens.
 */
function ChatPanel({
  messages,
  isReplying,
  suggestions,
  onSend,
  onAttach,
  renderCard,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  // Keep the newest message in view. The list is its own scroll container, so this moves it
  // and leaves the page where it is.
  useLayoutEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages.length, isReplying])

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isReplying) return
    onSend(trimmed)
    setDraft('')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={PANEL_MOTION}>
      {/* `aria-live` so a screen reader hears each reply arrive without moving focus. */}
      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4"
      >
        {messages.map((message) =>
          message.role === 'assistant' ? (
            <div key={message.id} className="chat-message flex gap-2">
              <AssistantMark />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {/* pre-wrap keeps any line breaks; overflow-wrap stops a long file name
                    from pushing the panel sideways. */}
                <div className="whitespace-pre-wrap break-words pt-0.5">
                  <PrimitiveText {...BODY} color={colors.gray[900]}>
                    {message.text}
                  </PrimitiveText>
                </div>
                {message.cards?.map((card) => (
                  <div key={card.id}>{renderCard(card)}</div>
                ))}
              </div>
            </div>
          ) : (
            <div key={message.id} className="chat-message flex justify-end">
              <div
                className="max-w-[85%] whitespace-pre-wrap break-words px-3 py-2"
                style={{
                  backgroundColor: colors.gray[100],
                  borderRadius: FOUNDATION_THEME.border.radius[12],
                }}
              >
                <PrimitiveText {...BODY} color={colors.gray[900]}>
                  {message.text}
                </PrimitiveText>
              </div>
            </div>
          ),
        )}

        {isReplying && (
          <div className="chat-message flex items-center gap-2">
            <AssistantMark />
            <span className="flex gap-1" role="status" aria-label="Assistant is typing">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="chat-typing-dot size-1.5 rounded-full"
                  style={{ backgroundColor: colors.gray[400] }}
                />
              ))}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4 pt-0">
        {/* Above the input and in view from the start — not ChatInputV2's `topQueries`,
            which open inside the input's border and only while it has focus. */}
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 [&_button]:cursor-pointer">
            {suggestions.map((text) => (
              <ButtonV2
                key={text}
                buttonType={ButtonV2Type.SECONDARY}
                size={ButtonV2Size.SMALL}
                text={text}
                onClick={() => send(text)}
              />
            ))}
          </div>
        )}
        {/* blend-gap: ChatInputV2 labels its send button "Secondary action" and takes no
            aria-label for it, so that is what a screen reader announces. Enter sends too. */}
        <ChatInputV2
          value={draft}
          onChange={setDraft}
          onEnter={() => send(draft)}
          placeholder="Ask, or say what to change…"
          secondaryAction={<ArrowUp size={16} />}
          onSecondaryActionClick={() => send(draft)}
          onAttachFiles={onAttach}
        />
      </div>
    </div>
  )
}

export default ChatPanel

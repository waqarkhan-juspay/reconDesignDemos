import {
  ButtonV2Size,
  ButtonV2Type,
  InputSizeV2,
  ModalV2,
  TextInputV2,
} from '@juspay/blend-design-system'
import { useState, type FormEvent } from 'react'

/**
 * "Add custom column" — names the column and, optionally, the value every row carries in it.
 *
 * The name is the only required answer, so Add Column stays disabled until there is one. The
 * fields are wrapped in a <form> so Enter in either input adds the column too.
 */
export function AddCustomColumnModal({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean
  onClose: () => void
  onAdd: (column: { title: string; defaultValue: string }) => void
}) {
  const [name, setName] = useState('')
  const [defaultValue, setDefaultValue] = useState('')
  const canAdd = name.trim() !== ''

  // Cleared on the way out, so the next open starts blank whichever way this one closed.
  const close = () => {
    setName('')
    setDefaultValue('')
    onClose()
  }

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (!canAdd) return
    onAdd({ title: name.trim(), defaultValue: defaultValue.trim() })
    close()
  }

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={close}
      title="Add custom column"
      showCloseButton
      closeOnBackdropClick
      dimensions={{ width: 520 }}
      primaryAction={{
        buttonType: ButtonV2Type.PRIMARY,
        size: ButtonV2Size.MEDIUM,
        text: 'Add Column',
        disabled: !canAdd,
        onClick: () => submit(),
      }}
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <TextInputV2
          label="Column name"
          placeholder="ex: Approved by"
          size={InputSizeV2.MD}
          value={name}
          autoFocus
          onChange={(event) => setName(event.target.value)}
        />
        <TextInputV2
          label="Default value"
          placeholder="ex: John Doe"
          size={InputSizeV2.MD}
          value={defaultValue}
          onChange={(event) => setDefaultValue(event.target.value)}
        />
        {/* Lets Enter submit — a form with no submit control ignores Enter in some browsers. */}
        <button type="submit" hidden />
      </form>
    </ModalV2>
  )
}

import { Alert, AlertVariant, Button, ButtonSize, ButtonType } from '@juspay/blend-design-system'
import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 text-neutral-100">
      <h1 className="text-4xl font-bold">Vite + React + Tailwind v4</h1>
      <Alert heading="Blend Design System" description="Installed and working!" variant={AlertVariant.SUCCESS} />
      <Button
        buttonType={ButtonType.PRIMARY}
        size={ButtonSize.MEDIUM}
        text={`Count is ${count}`}
        onClick={() => setCount((count) => count + 1)}
      />
    </div>
  )
}

export default App

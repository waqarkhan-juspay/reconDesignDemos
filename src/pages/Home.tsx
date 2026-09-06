import { Alert, AlertVariant, Button, ButtonSize, ButtonType } from '@juspay/blend-design-system'
import { useState } from 'react'

function Home() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1 className="text-4xl font-bold">Vite + React + Tailwind v4</h1>
      <Alert heading="Blend Design System" description="Installed and working!" variant={AlertVariant.SUCCESS} />
      <Button
        buttonType={ButtonType.PRIMARY}
        size={ButtonSize.MEDIUM}
        text={`Count is ${count}`}
        onClick={() => setCount((count) => count + 1)}
      />
    </>
  )
}

export default Home

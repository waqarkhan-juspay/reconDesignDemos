import {
  Alert,
  AlertVariant,
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
} from '@juspay/blend-design-system'
import { useState } from 'react'

function Home() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1 className="text-4xl font-bold">Vite + React + Tailwind v4</h1>
      <Alert heading="Blend Design System" description="Installed and working!" variant={AlertVariant.SUCCESS} />
      <ButtonV2
        buttonType={ButtonV2Type.SUCCESS}
        size={ButtonV2Size.MEDIUM}
        text={`Count is ${count}`}
        onClick={() => setCount((count) => count + 1)}
      />
    </>
  )
}

export default Home

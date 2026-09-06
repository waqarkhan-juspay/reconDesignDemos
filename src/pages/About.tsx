import { Alert, AlertVariant } from '@juspay/blend-design-system'

function About() {
  return (
    <>
      <h1 className="text-4xl font-bold">About</h1>
      <Alert
        heading="React Router v7"
        description="Routing is wired up with createBrowserRouter."
        variant={AlertVariant.PRIMARY}
      />
    </>
  )
}

export default About

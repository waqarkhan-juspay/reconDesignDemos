import { Link, isRouteErrorResponse, useRouteError } from 'react-router'

function NotFound() {
  const error = useRouteError()
  const status = isRouteErrorResponse(error) ? error.status : 500
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : 'Something went wrong.'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 text-neutral-100">
      <h1 className="text-4xl font-bold">{status}</h1>
      <p className="text-neutral-400">{message}</p>
      <Link to="/" className="text-neutral-100 underline underline-offset-4">
        Back home
      </Link>
    </div>
  )
}

export default NotFound

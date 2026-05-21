const AUTH_HEADER_ALLOWLIST = ['content-type', 'cookie']

function getNeonAuthBaseUrl() {
  const authUrl = process.env.VITE_NEON_AUTH_URL ?? import.meta.env.VITE_NEON_AUTH_URL

  if (!authUrl) {
    throw new Error('VITE_NEON_AUTH_URL is required')
  }

  return authUrl
}

function buildHeaders(requestHeaders: Headers) {
  const headers = new Headers()

  for (const headerName of AUTH_HEADER_ALLOWLIST) {
    const value = requestHeaders.get(headerName)
    if (value) {
      headers.set(headerName, value)
    }
  }

  return headers
}

export async function proxyNeonAuth(request: Request, path: string) {
  const upstreamUrl = new URL(path, getNeonAuthBaseUrl())

  const body = request.method === 'GET' ? undefined : await request.text()
  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers: buildHeaders(request.headers),
    body,
  })

  const headers = new Headers()
  const contentType = upstreamResponse.headers.get('content-type')
  const setCookie = upstreamResponse.headers.get('set-cookie')

  if (contentType) {
    headers.set('content-type', contentType)
  }

  if (setCookie) {
    headers.set('set-cookie', setCookie)
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers,
  })
}

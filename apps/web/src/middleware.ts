import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  if (request.nextUrl.searchParams.get('cache') === '0') {
    const reqHeaders = new Headers(request.headers)
    reqHeaders.set('x-bypass-cache', '1')
    return NextResponse.next({ request: { headers: reqHeaders } })
  }
  return NextResponse.next()
}

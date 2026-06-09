import { createApiClient } from '@larpdb/shared'
import { getToken, getGameId } from './auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL
if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is not set')

export const api = createApiClient(API_URL, getToken, getGameId)

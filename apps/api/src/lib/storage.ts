import type { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { env } from '../env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const LOCAL_UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads')

export interface StorageProvider {
  upload(stream: Readable, filename: string, mimetype: string): Promise<string>
  delete(url: string): Promise<void>
}

export class LocalStorage implements StorageProvider {
  constructor(private readonly dir: string = LOCAL_UPLOADS_DIR) {
    fs.mkdirSync(this.dir, { recursive: true })
  }

  async upload(stream: Readable, filename: string, _mimetype: string): Promise<string> {
    const filepath = path.join(this.dir, path.basename(filename))
    await pipeline(stream, fs.createWriteStream(filepath))
    return `/uploads/${filename}`
  }

  async delete(url: string): Promise<void> {
    if (!url.startsWith('/uploads/')) return
    const filename = path.basename(url)
    await fs.promises.unlink(path.join(this.dir, filename)).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'ENOENT') throw err
    })
  }
}

export class R2Storage implements StorageProvider {
  private readonly client: S3Client

  constructor(
    private readonly bucket: string,
    private readonly publicUrl: string,
    accountId: string,
    accessKeyId: string,
    secretAccessKey: string,
  ) {
    this.publicUrl = publicUrl.replace(/\/$/, '')
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    })
  }

  async upload(stream: Readable, filename: string, mimetype: string): Promise<string> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: filename,
        Body: stream,
        ContentType: mimetype,
      },
    })
    await upload.done()
    return `${this.publicUrl}/${filename}`
  }

  async delete(url: string): Promise<void> {
    if (!url.startsWith(this.publicUrl)) return
    const key = url.slice(this.publicUrl.length + 1)
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }
}

type StorageEnv = {
  STORAGE_PROVIDER: 'local' | 'r2'
  R2_ACCOUNT_ID?: string | undefined
  R2_ACCESS_KEY_ID?: string | undefined
  R2_SECRET_ACCESS_KEY?: string | undefined
  R2_BUCKET_NAME?: string | undefined
  R2_PUBLIC_URL?: string | undefined
}

export function createStorage(e: StorageEnv): StorageProvider {
  if (e.STORAGE_PROVIDER === 'r2') {
    const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = e
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
      throw new Error(
        'R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL are all required when STORAGE_PROVIDER=r2'
      )
    }
    return new R2Storage(R2_BUCKET_NAME, R2_PUBLIC_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)
  }
  return new LocalStorage()
}

export const storage: StorageProvider = createStorage(env)

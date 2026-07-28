import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { Readable } from 'stream'

vi.mock('@aws-sdk/lib-storage', () => ({
  Upload: vi.fn().mockImplementation(() => ({
    done: vi.fn().mockResolvedValue({}),
  })),
}))

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  DeleteObjectCommand: vi.fn(),
}))

describe('LocalStorage', () => {
  const dir = path.join(tmpdir(), `test-storage-${Date.now()}`)

  afterEach(() => {
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f))
      fs.rmdirSync(dir)
    }
  })

  it('upload writes file to disk and returns /uploads/{filename}', async () => {
    const { LocalStorage } = await import('../storage.js')
    const s = new LocalStorage(dir)
    const stream = Readable.from(Buffer.from('hello'))
    const url = await s.upload(stream, 'test.png', 'image/png')
    expect(url).toBe('/uploads/test.png')
    expect(fs.existsSync(path.join(dir, 'test.png'))).toBe(true)
  })

  it('delete removes file from disk', async () => {
    const { LocalStorage } = await import('../storage.js')
    const s = new LocalStorage(dir)
    const stream = Readable.from(Buffer.from('hello'))
    await s.upload(stream, 'todelete.png', 'image/png')
    await s.delete('/uploads/todelete.png')
    expect(fs.existsSync(path.join(dir, 'todelete.png'))).toBe(false)
  })

  it('delete is a no-op for unrecognized URLs', async () => {
    const { LocalStorage } = await import('../storage.js')
    const s = new LocalStorage(dir)
    await expect(s.delete('https://example.com/other.png')).resolves.toBeUndefined()
  })
})

describe('R2Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('upload calls Upload.done and returns publicUrl/filename', async () => {
    const { R2Storage } = await import('../storage.js')
    const { Upload } = await import('@aws-sdk/lib-storage')
    const s = new R2Storage('my-bucket', 'https://pub.r2.dev', 'acc123', 'key', 'secret')
    const stream = Readable.from(Buffer.from('data'))
    const url = await s.upload(stream, 'photo.jpg', 'image/jpeg')
    expect(url).toBe('https://pub.r2.dev/photo.jpg')
    expect(Upload).toHaveBeenCalledOnce()
  })

  it('delete calls DeleteObjectCommand with the correct key', async () => {
    const { R2Storage } = await import('../storage.js')
    const { DeleteObjectCommand, S3Client } = await import('@aws-sdk/client-s3')
    const s = new R2Storage('my-bucket', 'https://pub.r2.dev', 'acc123', 'key', 'secret')
    await s.delete('https://pub.r2.dev/photo.jpg')
    expect(DeleteObjectCommand).toHaveBeenCalledWith({ Bucket: 'my-bucket', Key: 'photo.jpg' })
    const mockInstance = vi.mocked(S3Client).mock.results[0]!.value
    expect(mockInstance.send).toHaveBeenCalledOnce()
  })

  it('delete is a no-op for unrecognized URLs', async () => {
    const { R2Storage } = await import('../storage.js')
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3')
    vi.clearAllMocks()
    const s = new R2Storage('my-bucket', 'https://pub.r2.dev', 'acc123', 'key', 'secret')
    await s.delete('/uploads/local-file.png')
    expect(DeleteObjectCommand).not.toHaveBeenCalled()
  })
})

describe('createStorage', () => {
  it('returns LocalStorage when STORAGE_PROVIDER is local', async () => {
    const { createStorage, LocalStorage } = await import('../storage.js')
    const s = createStorage({ STORAGE_PROVIDER: 'local' })
    expect(s).toBeInstanceOf(LocalStorage)
  })

  it('throws when STORAGE_PROVIDER is r2 but vars are missing', async () => {
    const { createStorage } = await import('../storage.js')
    expect(() => createStorage({ STORAGE_PROVIDER: 'r2' })).toThrow(
      'R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL are all required when STORAGE_PROVIDER=r2'
    )
  })

  it('returns R2Storage when STORAGE_PROVIDER is r2 and all vars present', async () => {
    const { createStorage, R2Storage } = await import('../storage.js')
    const s = createStorage({
      STORAGE_PROVIDER: 'r2',
      R2_ACCOUNT_ID: 'acc',
      R2_ACCESS_KEY_ID: 'key',
      R2_SECRET_ACCESS_KEY: 'secret',
      R2_BUCKET_NAME: 'bucket',
      R2_PUBLIC_URL: 'https://pub.r2.dev',
    })
    expect(s).toBeInstanceOf(R2Storage)
  })
})

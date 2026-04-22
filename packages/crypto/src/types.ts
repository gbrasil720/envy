export type EncryptedPayload = {
  ciphertext: string
  iv: string
  tag: string
  keyVersion: number
}

export type RawKey = {
  key: CryptoKey
  version: number
}

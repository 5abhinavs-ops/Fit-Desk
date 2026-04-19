const MIN_HEADER_BYTES = 12

export function isAllowedImageBuffer(buffer: Buffer): boolean {
  if (buffer.length < MIN_HEADER_BYTES) return false

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return true
  }

  const riff = buffer.subarray(0, 4).toString("ascii")
  const format = buffer.subarray(8, 12).toString("ascii")
  if (riff === "RIFF" && format === "WEBP") {
    return true
  }

  const gifHeader = buffer.subarray(0, 6).toString("ascii")
  if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
    return true
  }

  return false
}

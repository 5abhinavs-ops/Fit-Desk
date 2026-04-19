import { describe, it, expect } from "vitest"
import { isAllowedImageBuffer } from "../file-validation"

function buf(bytes: number[]): Buffer {
  return Buffer.from(bytes)
}

describe("isAllowedImageBuffer", () => {
  it("accepts JPEG magic bytes (FF D8 FF)", () => {
    expect(isAllowedImageBuffer(buf([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(true)
  })

  it("accepts PNG magic bytes (89 50 4E 47)", () => {
    expect(isAllowedImageBuffer(buf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))).toBe(true)
  })

  it("accepts WEBP magic bytes (RIFF....WEBP)", () => {
    const riff = [0x52, 0x49, 0x46, 0x46]
    const size = [0x00, 0x00, 0x00, 0x00]
    const webp = [0x57, 0x45, 0x42, 0x50]
    expect(isAllowedImageBuffer(buf([...riff, ...size, ...webp]))).toBe(true)
  })

  it("accepts GIF87a magic bytes", () => {
    expect(isAllowedImageBuffer(buf([0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0, 0, 0, 0, 0, 0]))).toBe(true)
  })

  it("accepts GIF89a magic bytes", () => {
    expect(isAllowedImageBuffer(buf([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0]))).toBe(true)
  })

  it("rejects HTML content disguised as JPEG", () => {
    const html = Buffer.from("<html><script>alert(1)</script></html>", "utf8")
    expect(isAllowedImageBuffer(html)).toBe(false)
  })

  it("rejects SVG content (text-based image format)", () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', "utf8")
    expect(isAllowedImageBuffer(svg)).toBe(false)
  })

  it("rejects a PDF (%PDF)", () => {
    expect(isAllowedImageBuffer(buf([0x25, 0x50, 0x44, 0x46, 0x2d, 0, 0, 0, 0, 0, 0, 0]))).toBe(false)
  })

  it("rejects an empty buffer", () => {
    expect(isAllowedImageBuffer(Buffer.alloc(0))).toBe(false)
  })

  it("rejects a buffer shorter than 12 bytes", () => {
    expect(isAllowedImageBuffer(buf([0xff, 0xd8]))).toBe(false)
  })

  it("rejects RIFF without WEBP identifier (e.g. WAV)", () => {
    const riff = [0x52, 0x49, 0x46, 0x46]
    const size = [0x00, 0x00, 0x00, 0x00]
    const wave = [0x57, 0x41, 0x56, 0x45]
    expect(isAllowedImageBuffer(buf([...riff, ...size, ...wave]))).toBe(false)
  })
})

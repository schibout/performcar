import { describe, it, expect } from "vitest";

import {
  DEFAULT_IMAGE_TYPES,
  DEFAULT_MAX_UPLOAD_SIZE,
  formatBytes,
  validateFile,
} from "../file-upload-utils";

const makeFile = (type: string, size: number): File => {
  const file = new File(["x"], "sample", { type });
  // jsdom derives size from content; override so we can probe the limit cheaply.
  Object.defineProperty(file, "size", { value: size });
  return file;
};

describe("validateFile", () => {
  it("returns null for an allowed type within the size limit", () => {
    const file = makeFile("image/png", 1024);
    expect(validateFile(file, DEFAULT_IMAGE_TYPES, DEFAULT_MAX_UPLOAD_SIZE)).toBeNull();
  });

  it("rejects an unsupported MIME type", () => {
    const file = makeFile("application/pdf", 1024);
    expect(validateFile(file, DEFAULT_IMAGE_TYPES, DEFAULT_MAX_UPLOAD_SIZE)).toBe("invalid_type");
  });

  it("rejects a file over the size limit", () => {
    const file = makeFile("image/png", DEFAULT_MAX_UPLOAD_SIZE + 1);
    expect(validateFile(file, DEFAULT_IMAGE_TYPES, DEFAULT_MAX_UPLOAD_SIZE)).toBe("too_large");
  });

  it("checks type before size", () => {
    const file = makeFile("text/plain", DEFAULT_MAX_UPLOAD_SIZE + 1);
    expect(validateFile(file, DEFAULT_IMAGE_TYPES, DEFAULT_MAX_UPLOAD_SIZE)).toBe("invalid_type");
  });
});

describe("formatBytes", () => {
  it("formats bytes under 1 KB", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats kilobytes with one decimal", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats megabytes with one decimal", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

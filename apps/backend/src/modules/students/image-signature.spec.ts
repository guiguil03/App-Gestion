import { detectImageExtension } from '@/modules/students/image-signature';

describe('detectImageExtension', () => {
  it('detects a PNG from its signature', () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    expect(detectImageExtension(buffer)).toBe('.png');
  });

  it('detects a JPEG from its signature', () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectImageExtension(buffer)).toBe('.jpg');
  });

  it('rejects a text file renamed with an image extension', () => {
    const buffer = Buffer.from('<script>alert(1)</script>', 'utf-8');
    expect(detectImageExtension(buffer)).toBeNull();
  });

  it('rejects an empty buffer', () => {
    expect(detectImageExtension(Buffer.alloc(0))).toBeNull();
  });

  it('rejects a buffer shorter than any known signature', () => {
    expect(detectImageExtension(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});

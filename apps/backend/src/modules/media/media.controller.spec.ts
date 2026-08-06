import { BadRequestException } from '@nestjs/common';

import { S3StorageService } from '@/common/storage/s3-storage.service';
import { MediaController } from '@/modules/media/media.controller';

function buildStorage(overrides: Record<string, any> = {}) {
  return { presignedGetUrl: jest.fn().mockResolvedValue('https://signed.example.com/x'), ...overrides } as unknown as S3StorageService;
}

describe('MediaController.serve', () => {
  it('redirects to a freshly presigned URL for an allowed namespace and a well-formed filename', async () => {
    const storage = buildStorage();
    const controller = new MediaController(storage);

    const result = await controller.serve('student-photos', 'a1b2c3d4-1111-2222-3333-444455556666.jpg');

    expect(storage.presignedGetUrl).toHaveBeenCalledWith('student-photos/a1b2c3d4-1111-2222-3333-444455556666.jpg');
    expect(result).toEqual({ url: 'https://signed.example.com/x', statusCode: 302 });
  });

  it('rejects a namespace outside the allowlist', async () => {
    const storage = buildStorage();
    const controller = new MediaController(storage);

    await expect(controller.serve('secrets', 'a1b2c3d4-1111-2222-3333-444455556666.jpg')).rejects.toThrow(BadRequestException);
    expect(storage.presignedGetUrl).not.toHaveBeenCalled();
  });

  it('rejects a filename that does not match the uuid.ext pattern (path traversal guard)', async () => {
    const storage = buildStorage();
    const controller = new MediaController(storage);

    await expect(controller.serve('student-photos', '../../etc/passwd')).rejects.toThrow(BadRequestException);
    expect(storage.presignedGetUrl).not.toHaveBeenCalled();
  });

  it('rejects an unsupported file extension', async () => {
    const storage = buildStorage();
    const controller = new MediaController(storage);

    await expect(controller.serve('student-photos', 'a1b2c3d4-1111-2222-3333-444455556666.svg')).rejects.toThrow(BadRequestException);
  });
});

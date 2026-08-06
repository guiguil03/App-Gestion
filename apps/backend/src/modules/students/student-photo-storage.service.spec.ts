jest.mock('@/common/storage/media-url', () => ({
  publicMediaUrl: jest.fn((namespace: string, filename: string) => `https://cdn.example.com/media/${namespace}/${filename}`),
}));

import { publicMediaUrl } from '@/common/storage/media-url';
import { S3StorageService } from '@/common/storage/s3-storage.service';
import { StudentPhotoStorageService } from '@/modules/students/student-photo-storage.service';

function buildStorage(overrides: Record<string, any> = {}) {
  return { put: jest.fn(), ...overrides } as unknown as S3StorageService;
}

describe('StudentPhotoStorageService.upload', () => {
  it('uploads under the student-photos namespace with the matching content-type and returns the public URL', async () => {
    const storage = buildStorage();
    const service = new StudentPhotoStorageService(storage);

    const url = await service.upload(Buffer.from('img'), 'abc-123.jpg', '.jpg');

    expect(storage.put).toHaveBeenCalledWith('student-photos/abc-123.jpg', Buffer.from('img'), 'image/jpeg');
    expect(publicMediaUrl).toHaveBeenCalledWith('student-photos', 'abc-123.jpg');
    expect(url).toBe('https://cdn.example.com/media/student-photos/abc-123.jpg');
  });

  it('resolves .png to image/png', async () => {
    const storage = buildStorage();
    const service = new StudentPhotoStorageService(storage);

    await service.upload(Buffer.from('img'), 'abc-123.png', '.png');

    expect(storage.put).toHaveBeenCalledWith('student-photos/abc-123.png', Buffer.from('img'), 'image/png');
  });

  it('rejects an unsupported extension without calling storage', async () => {
    const storage = buildStorage();
    const service = new StudentPhotoStorageService(storage);

    await expect(service.upload(Buffer.from('img'), 'abc.gif', '.gif')).rejects.toThrow('Extension de photo non supportée (.gif)');
    expect(storage.put).not.toHaveBeenCalled();
  });
});

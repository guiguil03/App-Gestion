jest.mock('@/common/storage/media-url', () => ({
  publicMediaUrl: jest.fn((namespace: string, filename: string) => `https://cdn.example.com/media/${namespace}/${filename}`),
}));

import { publicMediaUrl } from '@/common/storage/media-url';
import { S3StorageService } from '@/common/storage/s3-storage.service';
import { SchoolLogoStorageService } from '@/modules/schools/school-logo-storage.service';

function buildStorage(overrides: Record<string, any> = {}) {
  return { put: jest.fn(), ...overrides } as unknown as S3StorageService;
}

describe('SchoolLogoStorageService.upload', () => {
  it('uploads under the school-logos namespace with the matching content-type and returns the public URL', async () => {
    const storage = buildStorage();
    const service = new SchoolLogoStorageService(storage);

    const url = await service.upload(Buffer.from('logo'), 'logo-1.png', '.png');

    expect(storage.put).toHaveBeenCalledWith('school-logos/logo-1.png', Buffer.from('logo'), 'image/png');
    expect(publicMediaUrl).toHaveBeenCalledWith('school-logos', 'logo-1.png');
    expect(url).toBe('https://cdn.example.com/media/school-logos/logo-1.png');
  });

  it('rejects an unsupported extension without calling storage', async () => {
    const storage = buildStorage();
    const service = new SchoolLogoStorageService(storage);

    await expect(service.upload(Buffer.from('logo'), 'logo.svg', '.svg')).rejects.toThrow('Extension de logo non supportée (.svg)');
    expect(storage.put).not.toHaveBeenCalled();
  });
});

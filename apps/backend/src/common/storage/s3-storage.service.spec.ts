const mockSend = jest.fn();
const mockGetSignedUrl = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

import { S3StorageService } from '@/common/storage/s3-storage.service';

describe('S3StorageService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      S3_ENDPOINT: 'https://s3.example.com',
      S3_ACCESS_KEY_ID: 'key',
      S3_SECRET_ACCESS_KEY: 'secret',
      S3_BUCKET: 'my-bucket',
    };
    mockSend.mockReset().mockResolvedValue({});
    mockGetSignedUrl.mockReset().mockResolvedValue('https://signed.example.com/file');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('put', () => {
    it('uploads the buffer to the configured bucket with the given key and content-type', async () => {
      const service = new S3StorageService();

      await service.put('student-photos/abc.jpg', Buffer.from('data'), 'image/jpeg');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input).toEqual({
        Bucket: 'my-bucket',
        Key: 'student-photos/abc.jpg',
        Body: Buffer.from('data'),
        ContentType: 'image/jpeg',
      });
    });

    it('throws when a required S3 env var is missing instead of sending an unconfigured request', async () => {
      delete process.env.S3_ENDPOINT;
      const service = new S3StorageService();

      await expect(service.put('k', Buffer.from('x'), 'image/jpeg')).rejects.toThrow(
        'Stockage non configuré (S3_ENDPOINT manquant)',
      );
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('presignedGetUrl', () => {
    it('returns a presigned URL valid for 1 hour', async () => {
      const service = new S3StorageService();

      const url = await service.presignedGetUrl('student-photos/abc.jpg');

      expect(url).toBe('https://signed.example.com/file');
      const [, command, options] = mockGetSignedUrl.mock.calls[0];
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input).toEqual({ Bucket: 'my-bucket', Key: 'student-photos/abc.jpg' });
      expect(options).toEqual({ expiresIn: 3600 });
    });
  });
});

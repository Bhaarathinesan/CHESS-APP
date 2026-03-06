import { Test, TestingModule } from '@nestjs/testing';
import { CloudinaryService } from './cloudinary.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

jest.mock('cloudinary');
jest.mock('streamifier');

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        CLOUDINARY_CLOUD_NAME: 'test-cloud',
        CLOUDINARY_API_KEY: 'test-key',
        CLOUDINARY_API_SECRET: 'test-secret',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadAvatar', () => {
    const mockFile = {
      buffer: Buffer.from('fake-image-data'),
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
      originalname: 'avatar.jpg',
    } as any;

    const userId = 'user-123';

    beforeEach(() => {
      const mockReadStream = {
        pipe: jest.fn(),
      };
      (streamifier.createReadStream as jest.Mock) = jest.fn().mockReturnValue(mockReadStream);
    });

    it('should reject files larger than 5MB', async () => {
      const largeFile = {
        ...mockFile,
        size: 6 * 1024 * 1024, // 6MB
      };

      await expect(service.uploadAvatar(largeFile, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadAvatar(largeFile, userId)).rejects.toThrow(
        'File size must not exceed 5MB',
      );
    });

    it('should accept files exactly 5MB', async () => {
      const exactFile = {
        ...mockFile,
        size: 5 * 1024 * 1024, // Exactly 5MB
      };

      const mockResult = {
        secure_url: 'https://cloudinary.com/avatar.jpg',
      };

      (cloudinary.uploader.upload_stream as jest.Mock) = jest.fn(
        (options, callback) => {
          callback(null, mockResult);
          return { on: jest.fn(), end: jest.fn() };
        },
      );

      const result = await service.uploadAvatar(exactFile, userId);
      expect(result).toBe(mockResult.secure_url);
    });

    it('should accept JPEG images', async () => {
      const jpegFile = { ...mockFile, mimetype: 'image/jpeg' };
      const mockResult = { secure_url: 'https://cloudinary.com/avatar.jpg' };

      (cloudinary.uploader.upload_stream as jest.Mock) = jest.fn(
        (options, callback) => {
          callback(null, mockResult);
          return { on: jest.fn(), end: jest.fn() };
        },
      );

      const result = await service.uploadAvatar(jpegFile, userId);
      expect(result).toBe(mockResult.secure_url);
    });

    it('should accept PNG images', async () => {
      const pngFile = { ...mockFile, mimetype: 'image/png' };
      const mockResult = { secure_url: 'https://cloudinary.com/avatar.jpg' };

      (cloudinary.uploader.upload_stream as jest.Mock) = jest.fn(
        (options, callback) => {
          callback(null, mockResult);
          return { on: jest.fn(), end: jest.fn() };
        },
      );

      const result = await service.uploadAvatar(pngFile, userId);
      expect(result).toBe(mockResult.secure_url);
    });

    it('should accept GIF images', async () => {
      const gifFile = { ...mockFile, mimetype: 'image/gif' };
      const mockResult = { secure_url: 'https://cloudinary.com/avatar.jpg' };

      (cloudinary.uploader.upload_stream as jest.Mock) = jest.fn(
        (options, callback) => {
          callback(null, mockResult);
          return { on: jest.fn(), end: jest.fn() };
        },
      );

      const result = await service.uploadAvatar(gifFile, userId);
      expect(result).toBe(mockResult.secure_url);
    });

    it('should accept WEBP images', async () => {
      const webpFile = { ...mockFile, mimetype: 'image/webp' };
      const mockResult = { secure_url: 'https://cloudinary.com/avatar.jpg' };

      (cloudinary.uploader.upload_stream as jest.Mock) = jest.fn(
        (options, callback) => {
          callback(null, mockResult);
          return { on: jest.fn(), end: jest.fn() };
        },
      );

      const result = await service.uploadAvatar(webpFile, userId);
      expect(result).toBe(mockResult.secure_url);
    });

    it('should reject non-image files', async () => {
      const pdfFile = {
        ...mockFile,
        mimetype: 'application/pdf',
      };

      await expect(service.uploadAvatar(pdfFile, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadAvatar(pdfFile, userId)).rejects.toThrow(
        'Only image files (JPEG, PNG, GIF, WEBP) are allowed',
      );
    });

    it('should configure transformation to resize to 400x400', async () => {
      const mockResult = {
        secure_url: 'https://cloudinary.com/avatar.jpg',
      };

      let capturedOptions: any;
      (cloudinary.uploader.upload_stream as jest.Mock) = jest.fn(
        (options, callback) => {
          capturedOptions = options;
          callback(null, mockResult);
          return { on: jest.fn(), end: jest.fn() };
        },
      );

      await service.uploadAvatar(mockFile, userId);

      expect(capturedOptions.transformation).toContainEqual(
        expect.objectContaining({
          width: 400,
          height: 400,
          crop: 'fill',
          gravity: 'face',
        }),
      );
    });

    it('should configure auto optimization', async () => {
      const mockResult = {
        secure_url: 'https://cloudinary.com/avatar.jpg',
      };

      let capturedOptions: any;
      (cloudinary.uploader.upload_stream as jest.Mock) = jest.fn(
        (options, callback) => {
          capturedOptions = options;
          callback(null, mockResult);
          return { on: jest.fn(), end: jest.fn() };
        },
      );

      await service.uploadAvatar(mockFile, userId);

      expect(capturedOptions.transformation).toContainEqual(
        expect.objectContaining({
          quality: 'auto',
          fetch_format: 'auto',
        }),
      );
    });

    it('should handle upload errors', async () => {
      (cloudinary.uploader.upload_stream as jest.Mock) = jest.fn(
        (options, callback) => {
          callback(new Error('Upload failed'), null);
          return { on: jest.fn(), end: jest.fn() };
        },
      );

      await expect(service.uploadAvatar(mockFile, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadAvatar(mockFile, userId)).rejects.toThrow(
        'Failed to upload avatar',
      );
    });
  });
});

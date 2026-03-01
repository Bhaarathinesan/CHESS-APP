import { Test, TestingModule } from '@nestjs/testing';
import { ProfanityFilterService } from './profanity-filter.service';

describe('ProfanityFilterService', () => {
  let service: ProfanityFilterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfanityFilterService],
    }).compile();

    service = module.get<ProfanityFilterService>(ProfanityFilterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('containsProfanity', () => {
    it('should detect profanity in messages', () => {
      expect(service.containsProfanity('This is a damn test')).toBe(true);
      expect(service.containsProfanity('What the hell')).toBe(true);
    });

    it('should not detect profanity in clean messages', () => {
      expect(service.containsProfanity('This is a clean message')).toBe(false);
      expect(service.containsProfanity('Good game!')).toBe(false);
    });

    it('should detect leetspeak profanity', () => {
      expect(service.containsProfanity('d4mn')).toBe(true);
      expect(service.containsProfanity('h3ll')).toBe(true);
    });
  });

  describe('filterProfanity', () => {
    it('should filter profanity by replacing with asterisks', () => {
      const filtered = service.filterProfanity('This is a damn test');
      expect(filtered).toContain('d**n');
      expect(filtered).not.toContain('damn');
    });

    it('should preserve clean words', () => {
      const filtered = service.filterProfanity('This is a clean message');
      expect(filtered).toBe('This is a clean message');
    });

    it('should filter multiple profanity words', () => {
      const filtered = service.filterProfanity('damn and hell');
      expect(filtered).toContain('d**n');
      expect(filtered).toContain('h**l');
    });

    it('should keep first and last character of profanity', () => {
      const filtered = service.filterProfanity('damn');
      expect(filtered).toBe('d**n');
    });

    it('should handle short profanity words', () => {
      const filtered = service.filterProfanity('as');
      // 'as' is not in profanity list, should remain unchanged
      expect(filtered).toBe('as');
    });
  });

  describe('getSeverity', () => {
    it('should return "none" for clean messages', () => {
      expect(service.getSeverity('This is clean')).toBe('none');
    });

    it('should return "mild" for mild profanity', () => {
      expect(service.getSeverity('This is crap')).toBe('mild');
    });

    it('should return "moderate" for moderate profanity', () => {
      expect(service.getSeverity('What the hell')).toBe('moderate');
    });

    it('should return "severe" for severe profanity', () => {
      expect(service.getSeverity('This is shit')).toBe('severe');
    });
  });
});

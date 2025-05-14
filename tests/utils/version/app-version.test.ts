import { describe, it, expect } from 'bun:test';
import { parseVersion, compareVersions, getAppVersion, formatVersion } from '@/utils/version/app-version';

describe('App Version Module', () => {
  describe('parseVersion', () => {
    it('should parse a simple version string', () => {
      const result = parseVersion('1.2.3');
      expect(result.major).toBe(1);
      expect(result.minor).toBe(2);
      expect(result.patch).toBe(3);
      expect(result.preRelease).toBeUndefined();
      expect(result.buildMetadata).toBeUndefined();
    });

    it('should parse a version with pre-release', () => {
      const result = parseVersion('1.2.3-beta.1');
      expect(result.major).toBe(1);
      expect(result.minor).toBe(2);
      expect(result.patch).toBe(3);
      expect(result.preRelease).toBe('beta.1');
      expect(result.buildMetadata).toBeUndefined();
    });

    it('should parse a version with build metadata', () => {
      const result = parseVersion('1.2.3+build.456');
      expect(result.major).toBe(1);
      expect(result.minor).toBe(2);
      expect(result.patch).toBe(3);
      expect(result.preRelease).toBeUndefined();
      expect(result.buildMetadata).toBe('build.456');
    });

    it('should parse a version with pre-release and build metadata', () => {
      const result = parseVersion('1.2.3-alpha.1+build.456');
      expect(result.major).toBe(1);
      expect(result.minor).toBe(2);
      expect(result.patch).toBe(3);
      expect(result.preRelease).toBe('alpha.1');
      expect(result.buildMetadata).toBe('build.456');
    });

    it('should handle invalid version strings', () => {
      const result = parseVersion('invalid');
      expect(result.major).toBe(0);
      expect(result.minor).toBe(0);
      expect(result.patch).toBe(0);
      expect(result.version).toBe('invalid');
    });
  });

  describe('compareVersions', () => {
    it('should compare major versions correctly', () => {
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
    });

    it('should compare minor versions correctly', () => {
      expect(compareVersions('1.2.0', '1.1.0')).toBe(1);
      expect(compareVersions('1.1.0', '1.2.0')).toBe(-1);
    });

    it('should compare patch versions correctly', () => {
      expect(compareVersions('1.0.2', '1.0.1')).toBe(1);
      expect(compareVersions('1.0.1', '1.0.2')).toBe(-1);
    });

    it('should consider equal versions', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    });

    it('should ignore pre-release and build metadata in comparison', () => {
      expect(compareVersions('1.0.0-alpha', '1.0.0')).toBe(0);
      expect(compareVersions('1.0.0+build.123', '1.0.0')).toBe(0);
    });
  });

  describe('getAppVersion', () => {
    it('should return a valid version object', () => {
      const version = getAppVersion();
      expect(version).toBeDefined();
      expect(version.version).toBeDefined();
      expect(typeof version.major).toBe('number');
      expect(typeof version.minor).toBe('number');
      expect(typeof version.patch).toBe('number');
    });
  });

  describe('formatVersion', () => {
    it('should format a simple version', () => {
      const versionInfo = {
        version: '1.2.3',
        major: 1,
        minor: 2,
        patch: 3
      };
      expect(formatVersion(versionInfo)).toBe('1.2.3');
    });

    it('should include git commit if available', () => {
      const versionInfo = {
        version: '1.2.3',
        major: 1,
        minor: 2,
        patch: 3,
        gitCommit: 'abc1234def5678'
      };
      expect(formatVersion(versionInfo)).toBe('1.2.3 (abc1234)');
    });

    it('should include build date if available', () => {
      const versionInfo = {
        version: '1.2.3',
        major: 1,
        minor: 2,
        patch: 3,
        buildDate: '2023-06-15'
      };
      expect(formatVersion(versionInfo)).toBe('1.2.3 built on 2023-06-15');
    });

    it('should include both git commit and build date if available', () => {
      const versionInfo = {
        version: '1.2.3',
        major: 1,
        minor: 2,
        patch: 3,
        gitCommit: 'abc1234def5678',
        buildDate: '2023-06-15'
      };
      expect(formatVersion(versionInfo)).toBe('1.2.3 (abc1234) built on 2023-06-15');
    });
  });
});

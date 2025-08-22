// src/Inventory/__tests__/fileTypes.test.js
// Lightweight tests for file type utilities

import { getFileType, getItemFileTypes, itemHasFileType, FILE_TYPES } from '../utils/fileTypes';

describe('File Type Utils', () => {
  describe('getFileType', () => {
    it('should detect image files by extension', () => {
      expect(getFileType('photo.jpg')).toBe(FILE_TYPES.IMAGE);
      expect(getFileType('image.png')).toBe(FILE_TYPES.IMAGE);
      expect(getFileType('icon.svg')).toBe(FILE_TYPES.IMAGE);
    });

    it('should detect PDF files', () => {
      expect(getFileType('document.pdf')).toBe(FILE_TYPES.PDF);
    });

    it('should detect video files', () => {
      expect(getFileType('video.mp4')).toBe(FILE_TYPES.VIDEO);
      expect(getFileType('movie.avi')).toBe(FILE_TYPES.VIDEO);
    });

    it('should detect audio files', () => {
      expect(getFileType('song.mp3')).toBe(FILE_TYPES.AUDIO);
      expect(getFileType('track.wav')).toBe(FILE_TYPES.AUDIO);
    });

    it('should detect document files', () => {
      expect(getFileType('letter.doc')).toBe(FILE_TYPES.DOCUMENT);
      expect(getFileType('report.txt')).toBe(FILE_TYPES.DOCUMENT);
    });

    it('should detect archive files', () => {
      expect(getFileType('backup.zip')).toBe(FILE_TYPES.ARCHIVE);
      expect(getFileType('data.tar')).toBe(FILE_TYPES.ARCHIVE);
    });

    it('should detect code files', () => {
      expect(getFileType('script.js')).toBe(FILE_TYPES.CODE);
      expect(getFileType('component.jsx')).toBe(FILE_TYPES.CODE);
      expect(getFileType('styles.css')).toBe(FILE_TYPES.CODE);
    });

    it('should fallback to mime type detection', () => {
      expect(getFileType('', 'image/jpeg')).toBe(FILE_TYPES.IMAGE);
      expect(getFileType('', 'application/pdf')).toBe(FILE_TYPES.PDF);
      expect(getFileType('', 'video/mp4')).toBe(FILE_TYPES.VIDEO);
    });

    it('should return OTHER for unknown files', () => {
      expect(getFileType('unknown.xyz')).toBe(FILE_TYPES.OTHER);
      expect(getFileType('', 'application/unknown')).toBe(FILE_TYPES.OTHER);
    });

    it('should handle missing inputs', () => {
      expect(getFileType()).toBe(FILE_TYPES.OTHER);
      expect(getFileType('')).toBe(FILE_TYPES.OTHER);
      expect(getFileType(null)).toBe(FILE_TYPES.OTHER);
    });
  });

  describe('getItemFileTypes', () => {
    it('should detect image types from item.images', () => {
      const item = {
        images: [{ thumbDataUrl: 'data:image/jpeg;base64,...' }]
      };
      const types = getItemFileTypes(item, []);
      expect(types).toContain(FILE_TYPES.IMAGE);
    });

    it('should detect types from file attachments', () => {
      const item = {};
      const files = [
        { name: 'doc.pdf', mime: 'application/pdf' },
        { name: 'song.mp3', mime: 'audio/mpeg' }
      ];
      const types = getItemFileTypes(item, files);
      expect(types).toContain(FILE_TYPES.PDF);
      expect(types).toContain(FILE_TYPES.AUDIO);
    });

    it('should combine types from images and files', () => {
      const item = {
        images: [{ thumbDataUrl: 'data:image/jpeg;base64,...' }]
      };
      const files = [
        { name: 'video.mp4', mime: 'video/mp4' }
      ];
      const types = getItemFileTypes(item, files);
      expect(types).toContain(FILE_TYPES.IMAGE);
      expect(types).toContain(FILE_TYPES.VIDEO);
    });

    it('should return empty array for items with no files', () => {
      const item = {};
      const types = getItemFileTypes(item, []);
      expect(types).toEqual([]);
    });
  });

  describe('itemHasFileType', () => {
    it('should return true if item has the specified type', () => {
      const item = {};
      const files = [{ name: 'doc.pdf', mime: 'application/pdf' }];
      expect(itemHasFileType(item, files, FILE_TYPES.PDF)).toBe(true);
    });

    it('should return false if item does not have the specified type', () => {
      const item = {};
      const files = [{ name: 'doc.pdf', mime: 'application/pdf' }];
      expect(itemHasFileType(item, files, FILE_TYPES.VIDEO)).toBe(false);
    });

    it('should handle items with images', () => {
      const item = {
        images: [{ thumbDataUrl: 'data:image/jpeg;base64,...' }]
      };
      expect(itemHasFileType(item, [], FILE_TYPES.IMAGE)).toBe(true);
    });
  });
});
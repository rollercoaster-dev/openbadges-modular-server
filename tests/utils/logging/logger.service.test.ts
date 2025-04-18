/**
 * Unit tests for the logger service
 */

import { describe, test, expect, spyOn, beforeEach, afterEach } from 'bun:test';
import { logger, neuroLog } from '../../../src/utils/logging/logger.service';
import { config } from '../../../src/config/config';

describe('Logger Service', () => {
  let originalConfig: any;
  let consoleSpy: any;

  beforeEach(() => {
    // Save original config
    originalConfig = { ...config.logging };
    
    // Set up console spy
    consoleSpy = spyOn(console, 'log');
  });

  afterEach(() => {
    // Restore original config
    config.logging = originalConfig;
    
    // Restore console.log
    consoleSpy.mockRestore();
  });

  test('should log messages with the correct level', () => {
    // Ensure logging is enabled for all levels
    config.logging.level = 'debug';
    
    // Call logger with different levels
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');
    
    // Verify console.log was called for each level
    expect(consoleSpy).toHaveBeenCalled();
    
    // Check for debug level
    expect(consoleSpy.mock.calls.some((call: any[]) => 
      call[0]?.includes && call[0].includes('DEBUG')
    )).toBe(true);
    
    // Check for info level
    expect(consoleSpy.mock.calls.some((call: any[]) => 
      call[0]?.includes && call[0].includes('INFO')
    )).toBe(true);
    
    // Check for warn level
    expect(consoleSpy.mock.calls.some((call: any[]) => 
      call[0]?.includes && call[0].includes('WARN')
    )).toBe(true);
    
    // Check for error level
    expect(consoleSpy.mock.calls.some((call: any[]) => 
      call[0]?.includes && call[0].includes('ERROR')
    )).toBe(true);
  });
  
  test('should respect log level configuration', () => {
    // Set log level to error (should filter out debug, info, warn)
    config.logging.level = 'error';
    
    // Call debug logger (should be filtered out)
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    
    // These calls should be filtered out based on level
    const debugCalls = consoleSpy.mock.calls.filter((call: any[]) => 
      call[0]?.includes && call[0].includes('DEBUG')
    );
    const infoCalls = consoleSpy.mock.calls.filter((call: any[]) => 
      call[0]?.includes && call[0].includes('INFO')
    );
    const warnCalls = consoleSpy.mock.calls.filter((call: any[]) => 
      call[0]?.includes && call[0].includes('WARN')
    );
    
    expect(debugCalls.length).toBe(0);
    expect(infoCalls.length).toBe(0);
    expect(warnCalls.length).toBe(0);
    
    // Call error logger (should be logged)
    logger.error('Error message');
    
    // Error should be logged
    const errorCalls = consoleSpy.mock.calls.filter((call: any[]) => 
      call[0]?.includes && call[0].includes('ERROR')
    );
    expect(errorCalls.length).toBeGreaterThan(0);
  });
  
  test('should include context in log messages', () => {
    // Ensure logging is enabled
    config.logging.level = 'debug';
    
    // Call logger with context
    const context = { userId: '123', action: 'login' };
    logger.info('User action', context);
    
    // Verify context is included in log
    expect(consoleSpy.mock.calls.some((call: any[]) => 
      call[0]?.includes && call[0].includes('userId')
    )).toBe(true);
    expect(consoleSpy.mock.calls.some((call: any[]) => 
      call[0]?.includes && call[0].includes('123')
    )).toBe(true);
    expect(consoleSpy.mock.calls.some((call: any[]) => 
      call[0]?.includes && call[0].includes('action')
    )).toBe(true);
    expect(consoleSpy.mock.calls.some((call: any[]) => 
      call[0]?.includes && call[0].includes('login')
    )).toBe(true);
  });
  
  test('should handle Error objects correctly', () => {
    // Ensure logging is enabled
    config.logging.level = 'debug';
    
    // Create an error
    const error = new Error('Test error');
    
    // Log the error using logError helper
    logger.logError('An error occurred', error);
    
    // Verify error message is included in log
    expect(consoleSpy.mock.calls.some((call: any[]) => 
      call[0]?.includes && call[0].includes('Test error')
    )).toBe(true);
  });
  
  test('should handle circular references in context objects', () => {
    // Ensure logging is enabled
    config.logging.level = 'debug';
    
    // Create an object with circular reference
    const obj: any = { name: 'test' };
    obj.self = obj; // Create circular reference
    
    // Log with circular reference
    logger.info('Object with circular reference', { obj });
    
    // Should not throw and should include [Circular] in the output
    expect(consoleSpy.mock.calls.some((call: any[]) => 
      call[0]?.includes && call[0].includes('[Circular]')
    )).toBe(true);
  });
  
  test('neuroLog function should respect log level configuration', () => {
    // Set log level to error
    config.logging.level = 'error';
    
    // Call neuroLog directly with info level (should be filtered)
    neuroLog('info', 'Direct info message');
    
    // Verify console.log was not called for info level
    const infoCalls = consoleSpy.mock.calls.filter((call: any[]) => 
      call[0]?.includes && call[0].includes('INFO')
    );
    expect(infoCalls.length).toBe(0);
    
    // Call neuroLog with error level (should be logged)
    neuroLog('error', 'Direct error message');
    
    // Verify console.log was called for error level
    const errorCalls = consoleSpy.mock.calls.filter((call: any[]) => 
      call[0]?.includes && call[0].includes('ERROR')
    );
    expect(errorCalls.length).toBeGreaterThan(0);
  });
});

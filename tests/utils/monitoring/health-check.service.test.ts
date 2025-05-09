import { describe, it, expect } from 'bun:test';
import { HealthCheckService } from '@/utils/monitoring/health-check.service';

describe('Health Check Service', () => {
  it('should return a valid health check result', async () => {
    const result = await HealthCheckService.check();
    
    // Check basic structure
    expect(result).toBeDefined();
    expect(result.status).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(result.uptime).toBeDefined();
    expect(result.database).toBeDefined();
    expect(result.memory).toBeDefined();
    expect(result.environment).toBeDefined();
    
    // Check database info
    expect(result.database.type).toBeDefined();
    expect(typeof result.database.connected).toBe('boolean');
    
    // Check memory info
    expect(result.memory.rss).toBeDefined();
    expect(result.memory.heapTotal).toBeDefined();
    expect(result.memory.heapUsed).toBeDefined();
  });
  
  it('should return a valid deep health check result', async () => {
    const result = await HealthCheckService.deepCheck();
    
    // Check basic structure
    expect(result).toBeDefined();
    expect(result.status).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(result.uptime).toBeDefined();
    expect(result.database).toBeDefined();
    expect(result.memory).toBeDefined();
    expect(result.environment).toBeDefined();
    
    // Check checks object
    expect(result.checks).toBeDefined();
  });
});

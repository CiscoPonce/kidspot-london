import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import axios from 'axios';
import { yelpService } from '../../services/yelpService.js';
import env from '../../config/env.js';

vi.mock('axios');
const mockedAxios = axios as Mocked<typeof axios>;

describe('YelpService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure API key is set for tests
    env.YELP_API_KEY = 'test_key';
  });

  it('should search businesses and return results', async () => {
    const mockBusinesses = [
      { id: '1', name: 'Test Business', coordinates: { latitude: 51.5, longitude: -0.1 }, location: { display_address: ['Addr'] } }
    ];
    
    mockedAxios.get.mockResolvedValueOnce({
      data: { businesses: mockBusinesses }
    });

    const results = await yelpService.searchBusinesses({ term: 'test', latitude: 51.5, longitude: -0.1 });
    
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Test Business');
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/businesses/search'), expect.any(Object));
  });

  it('should get business details by ID', async () => {
    const mockDetails = { id: '1', name: 'Test Business', location: { display_address: ['Addr'] } };
    
    mockedAxios.get.mockResolvedValueOnce({
      data: mockDetails
    });

    const details = await yelpService.getBusinessDetails('1');
    
    expect(details?.name).toBe('Test Business');
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/businesses/1'), expect.any(Object));
  });

  it('should return null if API key is missing', async () => {
    env.YELP_API_KEY = undefined;
    const details = await yelpService.getBusinessDetails('1');
    expect(details).toBeNull();
  });
});

import axios from 'axios';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

export interface CouncilHall {
  name: string;
  address: string;
  postcode: string;
  capacity?: number;
  source: string;
}

export async function fetchCouncilHalls(): Promise<CouncilHall[]> {
  // Placeholder URL for MVP. In production, this would be an array of Open Data CSV endpoints.
  // Example: 'https://data.london.gov.uk/download/community-halls/example.csv'
  const CSV_URL = 'https://raw.githubusercontent.com/joshua-data/sample/main/council_halls_mock.csv';
  
  try {
    const response = await axios.get(CSV_URL, { responseType: 'stream' });
    const results: CouncilHall[] = [];

    return new Promise((resolve, reject) => {
      response.data
        .pipe(csvParser())
        .on('data', (data: any) => {
          // Normalize columns based on common council data formats
          const name = data.Name || data.FacilityName || data.title;
          const postcode = data.Postcode || data.Zip;
          const address = data.Address || data.Location;

          if (name && postcode) {
            results.push({
              name: name.trim(),
              address: address?.trim() || '',
              postcode: postcode.trim().toUpperCase(),
              capacity: parseInt(data.Capacity, 10) || undefined,
              source: 'council_csv',
            });
          }
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (err: Error) => {
          reject(err);
        });
    });
  } catch (error) {
    console.warn('Could not fetch real council CSV, returning fallback test data', error);
    // Fallback mock data if the URL is unreachable (dry-run/dev safe)
    return [
      {
        name: 'Lambeth Community Hub',
        address: '123 Main St, London',
        postcode: 'SW2 1AA',
        capacity: 50,
        source: 'council_csv'
      }
    ];
  }
}

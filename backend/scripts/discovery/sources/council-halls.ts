import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CouncilHall {
  id?: string;
  name: string;
  address: string;
  postcode?: string;
  lat?: number;
  lon?: number;
  capacity?: number;
  website?: string;
  source: string;
}

export async function fetchCouncilHalls(): Promise<CouncilHall[]> {
  const CSV_PATH = path.join(__dirname, '../../../../backend/data/community-halls.csv');
  
  if (!fs.existsSync(CSV_PATH)) {
    console.warn(`Council CSV not found at ${CSV_PATH}. Returning fallback data.`);
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

  return new Promise((resolve, reject) => {
    const results: CouncilHall[] = [];

    fs.createReadStream(CSV_PATH)
      .pipe(csvParser())
      .on('data', (data: any) => {
        const name = data.name || data.Name;
        
        if (name) {
          const addressParts = [data.address1, data.address2, data.address3, data.borough_name].filter(Boolean);
          const address = addressParts.join(', ');
          
          results.push({
            id: data.os_addressbase_uprn,
            name: name.trim(),
            address: address.trim(),
            lat: data.latitude ? parseFloat(data.latitude) : undefined,
            lon: data.longitude ? parseFloat(data.longitude) : undefined,
            website: data.website || undefined,
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
}

import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  
  // Port
  API_PORT: z.coerce.number().default(4000),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // Redis
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  
  // API Keys
  OPENROUTER_API_KEY: z.string().optional(),
  BRAVE_API_KEY: z.string().optional(),
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  YELP_API_KEY: z.string().optional(),
  FOURSQUARE_API_KEY: z.string().optional(),
  GEOAPIFY_API_KEY: z.string().optional(),
  
  // Security
  ADMIN_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().default('super-secret-kidspot-london'),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:3005'),

  // Optional
  GEOCODING_API_KEY: z.string().optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('❌ Invalid environment variables:', result.error.format());
  process.exit(1);
}

export const env = result.data;
export default env;

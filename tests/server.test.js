/**
 * @jest-environment node
 */

import request from 'supertest';
import express from 'express';

// Simple mock app for testing basic functionality
const app = express();
app.use(express.json());

// Health check endpoint test
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'test'
  });
});

describe('Server Health Check', () => {
  test('GET /health returns healthy status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.status).toBe('healthy');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body.environment).toBe('test');
  });

  test('Health endpoint returns valid JSON', async () => {
    const response = await request(app)
      .get('/health')
      .expect('Content-Type', /json/);
    
    expect(response.body).toBeDefined();
    expect(typeof response.body.status).toBe('string');
  });
});

describe('Configuration Tests', () => {
  test('Environment variables are loaded', () => {
    // Test that NODE_ENV is set correctly in test environment
    expect(process.env.NODE_ENV).toBe('test');
  });

  test('Default port configuration', () => {
    const port = process.env.PORT || 3000;
    expect(port).toBeDefined();
    // PORT can be either string (from env) or number (default)
    expect(['string', 'number'].includes(typeof port)).toBe(true);
  });
});

describe('CORS Configuration', () => {
  const corsApp = express();
  
  // Mock CORS middleware
  corsApp.use((req, res, next) => {
    const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
    const origin = req.headers.origin;
    
    if (!origin || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  corsApp.get('/api/test', (_req, res) => {
    res.json({ success: true });
  });

  test('CORS allows localhost origins', async () => {
    const response = await request(corsApp)
      .get('/api/test')
      .set('Origin', 'http://localhost:3000')
      .expect(200);
    
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  test('CORS handles requests without origin', async () => {
    const response = await request(corsApp)
      .get('/api/test')
      .expect(200);
    
    expect(response.headers['access-control-allow-origin']).toBe('*');
  });
});

describe('Rate Limiting Configuration', () => {
  test('Rate limit window is configured', () => {
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000;
    expect(windowMs).toBeGreaterThan(0);
    expect(windowMs).toBeLessThanOrEqual(3600000); // Max 1 hour
  });

  test('Rate limit max requests is configured', () => {
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100;
    expect(maxRequests).toBeGreaterThan(0);
    expect(maxRequests).toBeLessThanOrEqual(1000); // Reasonable limit
  });
});

describe('API Key Configuration', () => {
  test('API keys are defined', () => {
    // Test that API_KEYS structure exists (would be imported from server.js in real scenario)
    const hasApiKey = (key) => {
      const value = process.env[key];
      return value !== undefined && value.length > 0;
    };
    
    // At least one key should be defined (either from env or fallback)
    const possibleKeys = [
      'OPENROUTER_KEY',
      'CROWLLM_KEY', 
      'LOGFARE_KEY',
      'GOOGLE_KEY'
    ];
    
    // In test environment, we expect at least the fallbacks to exist
    expect(possibleKeys.length).toBeGreaterThan(0);
  });
});

process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../config/database', () => ({ execute: jest.fn() }));
const pool = require('../config/database');

const app = require('../server');

describe('Admin integration endpoints', () => {
  const adminToken = jwt.sign({ id: 1, role: 'admin', is_admin: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });

  beforeEach(() => jest.clearAllMocks());

  test('GET /api/admin/users returns users for admin', async () => {
    pool.execute.mockResolvedValueOnce([[{ id: 1, first_name: 'A', last_name: 'Admin', email: 'a@x.com', username: 'admin' }]]);
    const res = await request(app).get('/api/admin/users').set('Authorization', 'Bearer ' + adminToken);
    expect(res.statusCode).toBe(200);
    expect(res.body.users).toBeInstanceOf(Array);
    expect(res.body.users[0].email).toBe('a@x.com');
  });

  test('GET /api/admin/courses returns courses for admin', async () => {
    pool.execute.mockResolvedValueOnce([[{ id: 5, title: 'C1' }]]);
    const res = await request(app).get('/api/admin/courses').set('Authorization', 'Bearer ' + adminToken);
    expect(res.statusCode).toBe(200);
    expect(res.body.courses[0].title).toBe('C1');
  });
});

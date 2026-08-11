const pool = require('../config/database');
const bcrypt = require('bcryptjs');

jest.mock('../config/database', () => ({ execute: jest.fn() }));
jest.mock('bcryptjs', () => ({ hash: jest.fn(), compare: jest.fn() }));

const { register, login, me } = require('../controllers/authController');

function createRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('register creates user and returns token and user', async () => {
  pool.execute.mockResolvedValueOnce([[]]); // check existing
  pool.execute.mockResolvedValueOnce([{ insertId: 101 }]); // insert result
  bcrypt.hash.mockResolvedValue('hashed_pw');

  const req = { body: { first_name: 'Test', last_name: 'User', email: 't@example.com', username: 'testuser', password: 'pass' } };
  const res = createRes();

  await register(req, res, (e) => { throw e; });

  expect(pool.execute).toHaveBeenCalled();
  expect(res.json).toHaveBeenCalled();
  const payload = res.json.mock.calls[0][0];
  expect(payload.user.id).toBe(101);
  expect(payload.token).toBeDefined();
});

test('login returns token for valid credentials', async () => {
  const userRow = { id: 102, first_name: 'L', last_name: 'G', email: 'l@example.com', username: 'loginuser', password_hash: 'hashed_pw', role: 'user', is_admin: 0 };
  pool.execute.mockResolvedValueOnce([[userRow]]); // select user
  bcrypt.compare.mockResolvedValue(true);

  const req = { body: { identifier: 'loginuser', password: 'pass' } };
  const res = createRes();

  await login(req, res, (e) => { throw e; });

  expect(res.json).toHaveBeenCalled();
  const payload = res.json.mock.calls[0][0];
  expect(payload.user.id).toBe(102);
  expect(payload.token).toBeDefined();
});

test('me returns user info when authenticated', async () => {
  const userRow = { id: 103, first_name: 'Me', last_name: 'Tester', email: 'me@example.com', username: 'meuser', role: 'user', is_admin: 0 };
  pool.execute.mockResolvedValueOnce([[userRow]]);

  const req = { user: { id: 103 } };
  const res = createRes();

  await me(req, res, (e) => { throw e; });

  expect(res.json).toHaveBeenCalledWith({ user: expect.objectContaining({ id: 103 }) });
});

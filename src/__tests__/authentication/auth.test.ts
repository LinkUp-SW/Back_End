import httpMocks from 'node-mocks-http';
import { login, googleCallback, googleLogout, logout } from '../../controllers/auth.controller.ts';
import { AuthService } from '../../services/authService.service.ts';
import { JWT_CONFIG } from '../../../config/jwt.config.ts';
import { CustomError } from '../../utils/customError.utils.ts';

// Create a Jest mock for the AuthService
jest.mock('../../services/authService.service.ts');

const mockedAuthService = AuthService as jest.MockedClass<typeof AuthService>;

describe('Auth Controller', () => {
  let req: any, res: any, next: any;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    // For cookie inspection, node-mocks-http stores cookies in res.cookies
    next = jest.fn();
    mockedAuthService.mockClear();
  });

  describe('Local Login', () => {
    it('should throw a CustomError if email or password is missing', async () => {
      req.body = { email: '', password: '' };
      await login(req, res, next);
      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0] as CustomError;
      expect(error.message).toBe('Email and password are required');
      expect(error.statusCode).toBe(400);
    });

    it('should call AuthService.login, set cookie, and return success response', async () => {
      req.body = { email: 'user@example.com', password: 'secret' };

      // Stub AuthService.login to return a fake user and token.
      const fakeUser = { _id: '123', email: 'user@example.com' };
      const fakeToken = 'fake.jwt.token';
      mockedAuthService.prototype.login = jest.fn().mockResolvedValue({ user: fakeUser, token: fakeToken });

      await login(req, res, next);

      expect(mockedAuthService.prototype.login).toHaveBeenCalledWith('user@example.com', 'secret');
      // Check that the cookie is set; node-mocks-http stores cookies in res.cookies.
      expect(res.cookies[JWT_CONFIG.COOKIE_NAME]).toBeDefined();
      const json = res._getJSONData();
      expect(json.message).toBe('Login successful');
      expect(json.user).toEqual({ id: fakeUser._id, email: fakeUser.email });
    });
  });

  describe('Google Callback (Login)', () => {
    it('should throw a CustomError if req.user is missing', async () => {
      req.user = null;
      await googleCallback(req, res, next);
      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0] as CustomError;
      expect(error.message).toBe('Google authentication failed');
    });

    it('should process google login, set session and cookie, and return success response', async () => {
      // Simulate Passport populating req.user
      req.user = { 
        profile: { id: 'google123', emails: [{ value: 'google@example.com' }] },
        tokens: { accessToken: 'googleAccess', refreshToken: 'googleRefresh' }
      };
      req.session = {};

      const fakeUser = { _id: '321', email: 'google@example.com' };
      const fakeToken = 'fake.google.jwt.token';
      mockedAuthService.prototype.googleLogin = jest.fn().mockResolvedValue({ user: fakeUser, token: fakeToken });

      await googleCallback(req, res, next);

      expect(mockedAuthService.prototype.googleLogin).toHaveBeenCalledWith(req.user);
      // Verify session tokens and user ID are set.
      expect(req.session.tokens).toBeDefined();
      expect(req.session.userId).toBe(fakeUser._id);
      // Verify cookie is set.
      expect(res.cookies[JWT_CONFIG.COOKIE_NAME]).toBeDefined();
      const json = res._getJSONData();
      expect(json.message).toBe('Google authentication successful');
      expect(json.user).toEqual({ id: fakeUser._id, email: fakeUser.email });
    });
  });

  describe('Google Logout', () => {
    it('should delegate google logout to AuthService and clear cookie', async () => {
      mockedAuthService.prototype.googleLogout = jest.fn().mockResolvedValue(
        res.status(200).json({ message: 'Google logout successful' })
      );
      req.session = { tokens: { access_token: 'dummyToken' } };

      await googleLogout(req, res, next);
      expect(mockedAuthService.prototype.googleLogout).toHaveBeenCalledWith(req, res, next);
      const json = res._getJSONData();
      expect(json.message).toBe('Google logout successful');
    });
  });

  describe('Regular Logout', () => {
    it('should clear cookie and return logout success', async () => {
      mockedAuthService.prototype.logout = jest.fn().mockResolvedValue(
        res.status(200).json({ message: 'Logout successful' })
      );
      await logout(req, res, next);
      expect(mockedAuthService.prototype.logout).toHaveBeenCalledWith(req, res);
      const json = res._getJSONData();
      expect(json.message).toBe('Logout successful');
    });
  });
});

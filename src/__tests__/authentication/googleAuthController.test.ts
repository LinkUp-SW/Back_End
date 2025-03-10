// googleAuthController.test.ts
import { Request, Response } from 'express';
import { handleGoogleCallback, handleLogout } from '../../controllers/googleAuthController';
import { oauth2Client } from '../../services/googleAuthService';


jest.mock('../src/services/googleAuthService');

const mockRequest = (sessionData: any = {}, userData: any = null) => ({
  user: userData,
  session: {
    data: sessionData,
    tokens: null,
    userId: null,
    destroy: jest.fn((callback) => callback(null)),
    ...sessionData
  }
} as unknown as Request);

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe('Google Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleGoogleCallback', () => {
    it('should handle successful authentication', async () => {
      const mockUser = {
        profile: {
          id: '123',
          emails: [{ value: 'test@example.com' }],
          displayName: 'Test User',
          photos: [{ value: 'avatar.jpg' }]
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token'
        }
      };

      const req = mockRequest({}, mockUser);
      const res = mockResponse();

      await handleGoogleCallback(req, res);

      expect(req.session.tokens).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expiry_date: expect.any(Number)
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle missing user', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await handleGoogleCallback(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication failed'
      });
    });
  });

  describe('handleLogout', () => {
    it('should handle successful logout', async () => {
      const req = mockRequest({
        tokens: { access_token: 'valid-token' }
      });
      const res = mockResponse();

      await handleLogout(req, res);

      expect(oauth2Client.revokeToken).toHaveBeenCalledWith('valid-token');
      expect(req.session.destroy).toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('session');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle logout without access token', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await handleLogout(req, res);

      expect(oauth2Client.revokeToken).not.toHaveBeenCalled();
      expect(req.session.destroy).toHaveBeenCalled();
    });

    it('should handle session destruction error', async () => {
      const req = {
        session: {
          destroy: jest.fn((callback) => callback(new Error('Destruction error')))
        }
      } as unknown as Request;
      const res = mockResponse();

      await handleLogout(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
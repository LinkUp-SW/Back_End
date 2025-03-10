
export const JWT_CONFIG = {
    SECRET: process.env.JWT_SECRET || '',
    EXPIRES_IN: '1h',
    COOKIE_NAME: 'auth_token',
    HTTP_ONLY: true,
  };
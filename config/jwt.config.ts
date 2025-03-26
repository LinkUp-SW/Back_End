
export const JWT_CONFIG = {
    SECRET: process.env.JWT_SECRET || '',
    EXPIRES_IN: '1h',
    COOKIE_NAME: 'linkup_auth_token',
    HTTP_ONLY: false,
  };
import { OAuth2Client } from 'google-auth-library';
import { GoogleUserInfo } from '../types/googleAuth';
import { googleConfig } from '../../config/googleAuth';

// Initialize OAuth client
const oauth2Client = new OAuth2Client(
  googleConfig.clientID,
  googleConfig.clientSecret,
  googleConfig.callbackURL
);

/**
 * Helper function to get user information from Google
 */
const getGoogleUserInfo = async (accessToken: string): Promise<GoogleUserInfo> => {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user info from Google');
  }
  
  return response.json();
};

export { oauth2Client, getGoogleUserInfo };
import { Request, Response } from 'express';
import { oauth2Client, getGoogleUserInfo } from '../services/googleAuthService';


const handleGoogleCallback = async (req: Request, res: Response): Promise<void> => {
  try {

    const passportUser = req.user as { profile: any; tokens: { accessToken: string; refreshToken: string } };
    
    if (!passportUser) {
        throw new Error('User not authenticated');
      }
    
    
    // Storing tokens in session 
    if (req.session) {
      req.session.tokens = {
        access_token: passportUser.tokens.accessToken as string,
        refresh_token: passportUser.tokens.refreshToken as string,
        expiry_date: Date.now() + 3600000 // 1 hour
      };
    }
    
    // Get user information from Google
    const googleUser = passportUser.profile;
    
    const user = await getGoogleUserInfo(passportUser.tokens.accessToken); // TODO: Save user to database
    
    // Creating session
    if (req.session) {
      req.session.userId = user.id;
    }
    
    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      redirectUrl: '/',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: googleUser.photos && googleUser.photos.length ? googleUser.photos[0].value : '',
      },
      tokens: req.session?.tokens,
    });
  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};


const handleLogout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Revoking google access token before destroying the session
    if (req.session?.tokens?.access_token) {
      await oauth2Client.revokeToken(req.session.tokens.access_token);
    }
    
    // Destroy the session
    req.session?.destroy((err: Error) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({ success: false, message: 'Logout failed', error: err.message });
      }
      
      // Clear cookies
      res.clearCookie('session'); 
      res.send('Cookies cleared');
      res.status(200).json({ success: true, message: 'Logged out successfully',redirectUrl:'/login' });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).send('Error during logout');
  }
};

export { handleGoogleCallback, handleLogout };



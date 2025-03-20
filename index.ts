// src/index.ts
import express, { Request, Response } from 'express';
import { connectToDatabase } from './config/database.ts';
import YAML from 'yamljs';
import path from 'path';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import passport, {googleAuth} from './src/middleware/passportStrategy.ts';
import tokenUtils from './src/utils/token.utils.ts';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import errorHandler from './src/middleware/errorHandler.ts'; 

import authRoutes from './src/routes/auth.routes.ts';
import otpRoutes from './src/routes/otp.routes.js';
import signupRoutes from './src/routes/signup.routes.ts';
import forgetRoutes from './src/routes/forgetPassword.routes.ts';
import resetRoutes from './src/routes/resetPassword.routes.ts';
import updateEmailRoutes from './src/routes/updateEmail.routes.ts';
import deleteAccountRoutes from './src/routes/deleteAccount.routes.ts'
import updatePassRoutes from './src/routes/updatePassword.routes.ts';
import profilePictureRoutes from './src/routes/profilePicture.routes.ts';
import coverPhotoRoutes from './src/routes/coverPhoto.routes.ts';
import resumeRoutes from './src/routes/resume.routes.ts';
import updateNameRoutes from './src/routes/updateUsername.routes.ts';
import privacySettingsRoutes from './src/routes/privacy.settings.routes.ts';
import viewUserProfileRoutes from './src/routes/view.user.profile.routes.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET!;



// Generate a token with a 1-hour expiration and user_id "Mahmoud-Amr-123"
const generateStartupToken = () => {
  const token = tokenUtils.createToken({ time: '1000h', userID: 'Mahmoud-Amr-123' });
  console.log('Generated Token:', token);
};


connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log('Server is running on port:', PORT);
    });
  })
  .catch(err => {
    console.error('Failed to start server:', err);
  });

// Middleware
app.use(express.json());
app.use(cors({ origin: '*' ,credentials: true}));
app.use(express.urlencoded({ extended: true }));

// Cookie Parser Middleware
app.use(cookieParser());

// Session Configuration
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 1, // 1 hour
      httpOnly: true,
      secure: false,
    },
  })
);

// Passport Initialization
app.use(passport.initialize());
app.use(passport.session());
// Initialize Google OAuth strategy via Passport
googleAuth(app);

// Swagger API Docs
const swaggerDocument = YAML.load(path.join(__dirname, 'api_docs', 'openapi.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Authenticatio Routes
app.use('/auth', authRoutes); 

// Mount User Routes
app.use('/api/v1/user',
    otpRoutes,
    signupRoutes, 
    forgetRoutes,
    resetRoutes, 
    updatePassRoutes,
    updateEmailRoutes,
    updateNameRoutes,
    profilePictureRoutes,
    coverPhotoRoutes,
    resumeRoutes,
    privacySettingsRoutes,
    viewUserProfileRoutes,
    deleteAccountRoutes);

// Privacy Settings Routes
app.use('/api/v1/user', privacySettings);

app.get('/', (req: Request, res: Response) => {
  res.send('<a href="/auth/google">Authenticate with Google</a>');
});

// Error Handler Middleware should be the last middleware added
app.use(errorHandler);

export default app;

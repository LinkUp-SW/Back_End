// src/index.ts
import express, { Request, Response } from 'express';
import { connectToDatabase } from './config/database.ts';
import YAML from 'yamljs';
import path from 'path';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import authRoutes from './src/routes/auth.routes.ts';
import otpRoutes from './src/routes/otp.routes.js';
import signupRoutes from './src/routes/signup.routes.ts';
import forgetRoutes from './src/routes/forgetPassword.routes.ts';
import resetRoutes from './src/routes/resetPassword.routes.ts';
import updateRoutes from './src/routes/updatePassword.routes.ts';
import passport, { googleAuth } from './src/middleware/passportStrategy.ts';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import errorHandler from './src/middleware/errorHandler.ts'; 


dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET!;

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
app.use(cors({ origin: '*' }));
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

// Routes
app.use('/auth', authRoutes); 
// Mount other routes for OTP, signup, forget/reset/update password
app.use('/api/v1/user', otpRoutes, signupRoutes, forgetRoutes, resetRoutes, updateRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('<a href="/auth/google">Authenticate with Google</a>');
});

// Error Handler Middleware should be the last middleware added
app.use(errorHandler);

export default app;

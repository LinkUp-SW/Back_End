import express, { Request, Response } from 'express';
import { connectToDatabase } from './config/database.ts';
import YAML from 'yamljs';
import path from 'path';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import authRoutes from './src/routes/googleAuthRoutes.ts';
import profilePictureRoutes from './src/routes/profilePictureRoutes.ts';
import coverPhotoRoutes from './src/routes/coverPhotoRoutes.ts';
import resumeRoutes from './src/routes/resumeRoutes.ts';
import passport, {googleAuth} from './src/middleware/passportStrategy.ts';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Swagger Docs
const swaggerDocument = YAML.load(path.join(__dirname, 'api_docs', 'openapi.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Cookie Parser Middleware
app.use(cookieParser());

// Configure session middleware.
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 1 , // 1 hour
      httpOnly: true,
      secure: false,
    },
  })
);

// Passport Initialization
app.use(passport.initialize());
app.use(passport.session());

// Google Auth Middleware
googleAuth(app);

// Google Auth Routes
app.use('/auth', authRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('<a href= "/auth/google">Authenticate with google</a>');
});

app.get('/logout', (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// Profile Picture Routes
app.use('/api/v1/users', profilePictureRoutes);

// Cover Photo Routes
app.use('/api/v1/users', coverPhotoRoutes);

// Resume Routes
app.use('/api/v1/users', resumeRoutes);

//Login/Logout Routes
// app.use('/api/v1/auth', authRoutes);

connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log('Server is running on port:', PORT);
    });
  })
  .catch(err => {
    console.error('Failed to start server:', err);
  });
  
function next(err: any): void {
  throw new Error('Function not implemented.');
}


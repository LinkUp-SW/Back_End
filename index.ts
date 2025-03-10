import express, { Request, Response } from 'express';
import { connectToDatabase } from './config/database';
import YAML from 'yamljs';
import path from 'path';
import cors from 'cors';
import session from 'express-session';
import authRoutes from './src/routes/googleAuthRoutes';
import passport, {googleAuth} from './src/middleware/passportStrategy';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Swagger Docs
const swaggerDocument = YAML.load(path.join(__dirname, 'api_docs', 'openapi.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


// Configure session middleware.
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false
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


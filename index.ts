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

import authRoutes from './src/routes/authentication/auth.routes.ts';
import otpRoutes from './src/routes/authentication/otp.routes.ts';
import signupRoutes from './src/routes/authentication/signup.routes.ts';
import forgetRoutes from './src/routes/authentication/forgetPassword.routes.ts';
import resetRoutes from './src/routes/authentication/resetPassword.routes.ts';
import updateEmailRoutes from './src/routes/authentication/updateEmail.routes.ts';
import validateTokenRoutes from './src/routes/authentication/validateToken.routes.ts';
import deleteAccountRoutes from './src/routes/user_profile/deleteAccount.routes.ts'
import updatePassRoutes from './src/routes/authentication/updatePassword.routes.ts';
import profilePictureRoutes from './src/routes/user_uploads/profilePicture.routes.ts';
import coverPhotoRoutes from './src/routes/user_uploads/coverPhoto.routes.ts';
import resumeRoutes from './src/routes/user_uploads/resume.routes.ts';
import updateNameRoutes from './src/routes/authentication/updateUsername.routes.ts';
import privacySettingsRoutes from './src/routes/user_profile/privacySettings.routes.ts';
import viewUserProfileRoutes from './src/routes/user_profile/viewUserProfile.routes.ts';
import experienceRoutes from './src/routes/user_profile/experience.routes.ts';
import educationRoutes from './src/routes/user_profile/education.routes.ts'
import licenseRoutes from './src/routes/user_profile/license.routes.ts'
import updateUserRoutes from './src/routes/user_profile/updateUserProfile.routes.ts';
import skillsRoutes from './src/routes/user_profile/skills.routes.ts';
import myNetwork from './src/routes/my_network/myNetwork.routes.ts';
import postRoutes from './src/routes/posts/posts.routes.ts';
import savePostRoutes from './src/routes/posts/savePosts.routes.ts';
import createAdminRoutes from './src/routes/admin/createAdmin.routes.ts';
import comments from './src/routes/posts/comments.routes.ts';
import reactionRoutes from './src/routes/posts/reactions.routes.ts';

import filterJobsRoutes from './src/routes/jobs/filterJobs.routes.ts';
import saveJobsRoutes from './src/routes/jobs/saveJobs.routes.ts';
import getJobsRoutes from './src/routes/jobs/getJobs.routes.ts';
import searchJobsRoutes from './src/routes/jobs/searchJobs.routes.ts';
import searchRoutes from './src/routes/organization/utilities.routes.ts';
import companyProfileRoutes from "./src/routes/organization/companyProfile.routes.ts"
import companySettingsRoutes from "./src/routes/organization/companySettings.routes.ts"
import companyJobsRoutes from "./src/routes/organization/companyJobs.routes.ts"
import companyPostsRoutes from "./src/routes/organization/companyPosts.routes.ts"
import jobApplicationsRoutes from './src/routes/jobs/jobApplications.routes.ts';
import aboutUserRoutes from './src/routes/user_profile/about.routes.ts';
import stripeWebhookRoutes from './src/routes/subscription/webhook.routes.ts';
import subscriptionRoutes from './src/routes/subscription/subscription.routes.ts';
import peopleYouMayKnowRoutes from './src/routes/my_network/peopleYouMayKnow.routes.ts';
import userSearchRoutes from './src/routes/my_network/userSearch.routes.ts';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET!;
// IMPORTANT: Add webhook route BEFORE express.json() middleware
app.use('/webhook/stripe', stripeWebhookRoutes);
app.use(express.json({limit:"50mb"}));


// Generate a token with a 1-hour expiration and user_id "Mahmoud-Amr-123"
const generateStartupToken = () => {
  const token = tokenUtils.createToken({ time: '1000h', userID: 'Amr-Doma81' });
  console.log('Generated Token:', token);
};


connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log('Server is running on port:', PORT);
      generateStartupToken();
    });
  })
  .catch(err => {
    console.error('Failed to start server:', err);
  });

// Middleware
app.use(express.json());
app.use(cors({ origin: process.env.CORS_URL ,credentials: true}));
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
    deleteAccountRoutes,
    validateTokenRoutes,
    experienceRoutes,
    educationRoutes,
    licenseRoutes,
    updateUserRoutes,
    skillsRoutes,
    myNetwork,
    privacySettingsRoutes,
    aboutUserRoutes,
    peopleYouMayKnowRoutes,);

// Mount Jobs Routes
app.use('/api/v1/jobs', 
    filterJobsRoutes, 
    saveJobsRoutes,
    getJobsRoutes,
    searchJobsRoutes
);

app.use('/api/v1/job-application', 
    jobApplicationsRoutes
);

app.use('/api/v1/post',
    postRoutes,
    savePostRoutes,
    comments,
    reactionRoutes
);

app.use('/api/v1/company',
    companyProfileRoutes,
    companySettingsRoutes,
    companyJobsRoutes,
    companyPostsRoutes
)


// Add after your other middleware
app.use('/api/v1/user/subscription', subscriptionRoutes);

app.use('/api/v1/search', 
  userSearchRoutes,
  searchRoutes );

app.use('/api/v1/admin', createAdminRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('<a href="/auth/google">Authenticate with Google</a>');
});

// Error Handler Middleware should be the last middleware added
app.use(errorHandler);

export default app;

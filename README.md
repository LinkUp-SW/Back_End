# Back_End

## Overview
The **Back_End** repository is the backend service for the LinkUp-SW project. It powers core functionalities such as user authentication, real-time messaging, file uploads, and database management. Built with **Node.js** , **Express** and **TypeScript**.

## 🚀 What's New in v2.0 - May 2025
We're excited to announce a major update to our backend with several new features and improvements:

### Enhanced Privacy & User Control
- **Comprehensive Privacy Settings**:
  - Profile visibility controls (public, private, connections-only)
  - Invitation request preferences
  - Follow settings and primary action controls
  - Messaging request filters
  - Read receipts toggle

### Advanced Networking
- **Intelligent Connection Features**:
  - "People You May Know" suggestion algorithm
  - Smart search suggestions based on work history and connections
  - First and second-degree connection identification

### Subscription Services
- **Premium Features**:
  - Stripe integration for subscription management
  - Invoice history and payment tracking
  - Premium content access controls

### Organization Profiles
- **Company Ecosystem**:
  - Dedicated company profiles with settings management
  - Company job postings and applications
  - Organization-specific content and posts

### Job Platform Enhancements
- **Advanced Job Features**:
  - Sophisticated job application system
  - Job filtering and search capabilities
  - Saved jobs functionality

### Social Engagement Improvements
- **Rich Media Support**:
  - Enhanced post creation with media attachments
  - Comment threading with reactions
  - Tagging capabilities in posts and comments
  - Post visibility controls

## Features
- **Authentication**:
  - Secure user authentication using **JWT** and **Google OAuth**.
  - Token-based access control for APIs.
- **Messaging**:
  - Real-time messaging with **WebSocket** support.
  - File attachments in messages (e.g., images, PDFs).
- **File Uploads**:
  - Handles image and PDF uploads using **Multer** and **Cloudinary**.
  - Automatic file validation and storage.
- **Database**:
  - **MongoDB** integration for data persistence.
  - Efficient schema design for users, posts, and messaging.
- **API Documentation**:
  - OpenAPI-compliant documentation with **Swagger UI**.
  - Easy-to-use interface for testing APIs.
  1. Start the server with `npm run dev`
  2. Open `http://localhost:3000/api-docs` in your browser
- **CI/CD**:
  - Automated build and deployment pipelines using **Jenkins**.
  - Notifications for build success or failure.

## Project Structure
```plaintext
.env                     # Environment variables
.gitignore               # Git ignore rules
index.ts                 # Entry point of the application
Jenkinsfile              # CI/CD pipeline configuration
jest.config.cjs          # Jest configuration for testing
package.json             # Project dependencies and scripts
README.md                # Project documentation
tsconfig.json            # TypeScript configuration
api_docs/                # API documentation files
config/                  # Configuration files (e.g., Cloudinary, database, JWT)
src/                     # Main source code
  ├── __tests__/         # Unit and integration tests
  ├── controllers/       # API controllers
  ├── middleware/        # Middleware for request handling
  ├── models/            # Mongoose models
  ├── repositories/      # Database interaction logic
  ├── routes/            # API route definitions
  ├── scripts/           # Utility scripts (e.g., database seeding)
  ├── services/          # Core business logic
  ├── types/             # TypeScript type definitions
  ├── utils/             # Utility functions 
```
## Installation and Setup
1. Clone the repository
  ```bash
   git clone https://github.com/LinkUp-SW/Back_End.git
   cd Back_End
  ```
2. Install dependencies
  ```bash
    npm install
  ```
3. Create a .env file
  ```bash
    cp .env.example .env
  ```
4. Start the development server
  ```bash
    npm run dev
  ```


## Contact
For questions or support, please contact the LinkUp-SW team:
- Email: linkup.backend.team@gmail.com
- GitHub: LinkUp-SW


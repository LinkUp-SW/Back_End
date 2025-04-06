# Back_End

## Overview
The **Back_End** repository is the backend service for the LinkUp-SW project. It powers core functionalities such as user authentication, real-time messaging, file uploads, and database management. Built with **Node.js** , **Express** and **TypeScript**.

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

## Installation

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **MongoDB** (local or cloud instance)
- **Cloudinary** account for file uploads

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/LinkUp-SW/Back_End.git
   cd Back_End
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the root directory.

4. Run the application:
   ```bash
   npm start
   ```

## Scripts
- **Start the server**:
  ```bash
  npm start
  ```
- **Run in development mode**:
  ```bash
  npm run dev
  ```
- **Run tests**:
  ```bash
  npm test
  ```
- **Build the project**:
  ```bash
  npm run build
  ```

## API Documentation
The API documentation is available via **Swagger UI**. After starting the server, visit:
```
http://localhost:<PORT>/api-docs
```

## Testing
The project uses **Jest** for unit and integration testing. Test files are located in the `src/__tests__/` directory.

Run tests with:
```bash
npm test
```

## CI/CD Pipeline
The project uses **Jenkins** for continuous integration and deployment. The pipeline is defined in the `Jenkinsfile` and includes the following stages:
1. **Checkout**: Pulls the latest code from the repository.
2. **Install Dependencies**: Installs all required packages.
3. **Build**: Compiles the TypeScript code.
4. **Post-Build Notifications**: Sends success or failure notifications to GitHub.

## Contributing
We welcome contributions to the project! To contribute:
1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Commit your changes and submit a pull request.

## License
This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

## Contact
For questions or support, please contact the LinkUp-SW team:
- **Email**: linkup.backend.team@gmail.com
- **GitHub**: [LinkUp-SW](https://github.com/LinkUp-SW)
```

This README provides a professional overview of your project, including installation steps, features, and technical details. Let me know if you'd like to customize any section further!

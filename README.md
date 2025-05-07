# LinkUp-SW Backend

## Overview

The **LinkUp-SW Backend** repository serves as the core backend service for the LinkUp-SW project. It provides essential functionalities including user authentication, real-time messaging, secure file uploads, and robust database management.

This backend is built using the powerful combination of **Node.js**, the flexible **Express** framework, and statically typed **TypeScript**.

### Check our website through the following link 🔥:
-   link: https://linkup-app.tech

## ✨ Features

Here are some of the key features powered by the LinkUp-SW Backend:

* **Authentication**:
    * Secure user authentication utilizing **JWT (JSON Web Tokens)** and **Google OAuth**.
    * Token-based access control for all API endpoints.
* **Messaging**:
    * Real-time messaging capabilities powered by **WebSocket** support.
    * Support for file attachments (such as images and PDFs) within messages.
* **File Uploads**:
    * Handles image and PDF uploads efficiently using **Multer** and storage integration with **Cloudinary**.
    * Includes automatic file validation processes.
* **Database**:
    * Integration with **MongoDB** for persistent data storage.
    * Features an efficient schema design optimized for users, posts, messaging, and other application data.
* **API Documentation**:
    * Comprehensive OpenAPI-compliant documentation accessible via **Swagger UI**.
    * Provides an easy-to-use interface for exploring and testing API endpoints.
    * **How to Access:**
        1.  Start the server with `npm run dev`.
        2.  Open your browser and navigate to `http://localhost:3000/api-docs`.
* **CI/CD**:
    * Automated build and deployment pipelines configured using **Jenkins**.
    * Includes notifications for build success or failure statuses.

## 🚀 What's New in v3.0 - Planned for May 2025

We're excited about the upcoming version 3.0 release, which will introduce significant enhancements and new features:e.

### Performance Enhancements

* **Optimized Database Queries**:
    * Significant improvements to query performance resulting in faster data retrieval times.
    * Reduced latency, especially for high-traffic endpoints.

### Developer Experience

* **Improved API Documentation**:
    * Expanded OpenAPI documentation with more detailed examples.
    * An enhanced interactive API testing experience through Swagger UI.

## 🛠️ Technologies Used

* Node.js
* Express
* TypeScript
* MongoDB
* JWT
* Google OAuth
* WebSocket
* Multer
* Cloudinary
* OpenAPI / Swagger UI
* Jenkins
* Stripe

## 📁 Project Structure

```plaintext
.env                     # Environment variables file (should not be committed)
.gitignore               # Specifies intentionally untracked files that Git should ignore
index.ts                 # The main entry point of the application
Jenkinsfile              # Configuration file for the Jenkins CI/CD pipeline
jest.config.cjs          # Configuration for Jest testing framework
package.json             # Project dependencies and scripts
README.md                # This documentation file
tsconfig.json            # Configuration file for the TypeScript compiler
api_docs/                # Contains files related to API documentation (e.g., OpenAPI spec)
config/                  # Configuration files for various services (e.g., database, JWT, Cloudinary)
src/                     # Main application source code
  ├── __tests__/         # Directory for unit and integration tests
  ├── controllers/       # Handles incoming requests and sends responses (API logic)
  ├── middleware/        # Functions that process requests before they reach controllers (e.g., auth, validation)
  ├── models/            # Defines the structure and relationships of data (e.g., Mongoose schemas)
  ├── repositories/      # Handles data interaction logic, abstracting database operations
  ├── routes/            # Defines the API endpoints and links them to controllers
  ├── scripts/           # Contains utility scripts (e.g., database seeding, setup)
  ├── services/          # Encapsulates core business logic and interacts with repositories
  ├── types/             # Custom TypeScript type definitions
  └── utils/             # Contains various utility functions
```
# 🚀 Installation and Setup

Follow these steps to get the LinkUp-SW Backend running locally:

### Clone the repository:
```bash
git clone https://github.com/LinkUp-SW/Back_End.git
cd Back_End
```

### Install dependencies:
```bash
npm install
```

### Create a `.env` file:
Copy the example environment file and update it with your specific configuration details (e.g., database connection string, API keys, etc.).
```bash
cp .env.example .env
```

### Start the development server:
```bash
npm run dev
```

The server should now be running locally, typically at [http://localhost:3000](http://localhost:3000).

---

## Contributing

We welcome contributions to the LinkUp-SW Backend! If you'd like to contribute, please follow these steps:

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes and commit them:
   ```bash
   git commit -m 'feat: Add some feature'
   ```
4. Push to the branch:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Create a new Pull Request.

Please ensure your code adheres to the project's coding standards and includes relevant tests.

---

## Contact

For questions, support, or any inquiries regarding the LinkUp-SW Backend, please reach out to the team:

- **Email**: linkup.backend.team@gmail.com
- **GitHub**: [LinkUp-SW](https://github.com/LinkUp-SW)

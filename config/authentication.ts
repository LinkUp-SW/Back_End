// JWT and authentication configuration
module.exports = {
    JWT_SECRET: process.env
.JWT_SECRET || 'secret',    
JWT_EXPIRATION: process.env.JWT_EXPIRATION || '1d',
};

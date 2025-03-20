// src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../utils/customError.utils.ts';

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.error(err);

  let statusCode = 500;
  let errorCode: string | undefined = undefined;

  // Check if the error is an instance of CustomError
  if (err instanceof CustomError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
  }

  // Build the error response
  const errorResponse: any = {
    status: 'error',
    message: err.message,
    path: req.originalUrl,
    method: req.method,
  };

  //custom error code
  if (errorCode) {
    errorResponse.errorCode = errorCode;
  }

  // Include stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

export default errorHandler;

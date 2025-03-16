export class CustomError extends Error {
    public statusCode: number;
    public errorCode?: string;
  
    constructor(message: string, statusCode = 500, errorCode?: string) {
      super(message);
      this.statusCode = statusCode;
      this.errorCode = errorCode;
      Object.setPrototypeOf(this, CustomError.prototype);
    }
}
  
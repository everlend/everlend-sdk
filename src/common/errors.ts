export enum ErrorCode {
  ERROR_INVALID_OWNER,
  ERROR_INVALID_ACCOUNT_DATA,
}

export class EverlendError extends Error {
  errorCode: ErrorCode

  constructor(errorCode: ErrorCode, message: string) {
    super(message)
    this.errorCode = errorCode
  }
}

export const ERROR_INVALID_OWNER: () => EverlendError = () => {
  return new EverlendError(ErrorCode.ERROR_INVALID_OWNER, 'Invalid owner')
}

export const ERROR_INVALID_ACCOUNT_DATA: () => EverlendError = () => {
  return new EverlendError(ErrorCode.ERROR_INVALID_ACCOUNT_DATA, 'Invalid data')
}

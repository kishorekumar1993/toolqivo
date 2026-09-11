/**
 * Toolqivo PDF Engine Typed Errors
 * Structured error hierarchy for precise UI feedback and error recovery
 */

export class PdfEngineError extends Error {
  public readonly code: string;
  public readonly userMessage: string;

  constructor(message: string, code: string = "PDF_ENGINE_ERROR", userMessage?: string) {
    super(message);
    this.name = "PdfEngineError";
    this.code = code;
    this.userMessage = userMessage || message;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidPdfError extends PdfEngineError {
  constructor(message: string = "The provided file is not a valid PDF document or is corrupted.") {
    super(message, "INVALID_PDF", "The selected file is corrupted or not a valid PDF document.");
    this.name = "InvalidPdfError";
  }
}

export class PasswordRequiredError extends PdfEngineError {
  constructor(message: string = "This PDF document is password-protected and requires a password to open.") {
    super(message, "PASSWORD_REQUIRED", "This PDF is encrypted. Please enter the password to proceed.");
    this.name = "PasswordRequiredError";
  }
}

export class IncorrectPasswordError extends PdfEngineError {
  constructor(message: string = "The password provided is incorrect and cannot unlock this document.") {
    super(
      message,
      "INCORRECT_PASSWORD",
      "Incorrect PDF Password. The password you entered is wrong. Please check and try again."
    );
    this.name = "IncorrectPasswordError";
  }
}

export class UnsupportedPdfError extends PdfEngineError {
  constructor(feature: string = "This PDF feature is currently unsupported in browser mode.") {
    super(feature, "UNSUPPORTED_PDF", `Unsupported PDF feature: ${feature}`);
    this.name = "UnsupportedPdfError";
  }
}

export class FileTooLargeError extends PdfEngineError {
  public readonly fileSizeMb: number;
  public readonly maxLimitMb: number;

  constructor(fileSizeMb: number, maxLimitMb: number = 100) {
    super(
      `File size (${fileSizeMb.toFixed(1)} MB) exceeds maximum browser limit of ${maxLimitMb} MB.`,
      "FILE_TOO_LARGE",
      `File is too large (${fileSizeMb.toFixed(1)} MB). Maximum browser limit is ${maxLimitMb} MB to prevent memory crashes.`
    );
    this.name = "FileTooLargeError";
    this.fileSizeMb = fileSizeMb;
    this.maxLimitMb = maxLimitMb;
  }
}

export class PageLimitExceededError extends PdfEngineError {
  public readonly pageCount: number;
  public readonly maxPages: number;

  constructor(pageCount: number, maxPages: number = 500) {
    super(
      `PDF document contains ${pageCount} pages, exceeding the safety limit of ${maxPages} pages.`,
      "PAGE_LIMIT_EXCEEDED",
      `Document has ${pageCount} pages (limit: ${maxPages} pages). Please split the document into smaller batches.`
    );
    this.name = "PageLimitExceededError";
    this.pageCount = pageCount;
    this.maxPages = maxPages;
  }
}

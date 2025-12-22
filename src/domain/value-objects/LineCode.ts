import { ValidationError } from '../../shared/errors/DomainError.js';

export class LineCode {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(code: string): LineCode {
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      throw new ValidationError('LineCode must be exactly 6 digits');
    }
    return new LineCode(trimmed);
  }

  static createPartial(code: string): string {
    return code.trim();
  }

  getValue(): string {
    return this.value;
  }

  equals(other: LineCode): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

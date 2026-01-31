import { ValidationError } from '../../shared/errors/DomainError.js';

export class YearMonth {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(yearMonth: string): YearMonth {
    const trimmed = yearMonth.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      throw new ValidationError('YearMonth must be YYYYMM format (6 digits)');
    }

    const year = parseInt(trimmed.slice(0, 4), 10);
    const month = parseInt(trimmed.slice(4, 6), 10);

    if (year < 2000 || year > 2100) {
      throw new ValidationError('Year must be between 2000 and 2100');
    }
    if (month < 1 || month > 12) {
      throw new ValidationError('Month must be between 01 and 12');
    }

    return new YearMonth(trimmed);
  }

  static fromDate(date: Date): YearMonth {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return new YearMonth(`${year}${month}`);
  }

  static thisMonth(): YearMonth {
    return YearMonth.fromDate(new Date());
  }

  getValue(): string {
    return this.value;
  }

  getYear(): number {
    return parseInt(this.value.slice(0, 4), 10);
  }

  getMonth(): number {
    return parseInt(this.value.slice(4, 6), 10);
  }

  toFormatted(): string {
    return `${this.value.slice(0, 4)}-${this.value.slice(4, 6)}`;
  }

  equals(other: YearMonth): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

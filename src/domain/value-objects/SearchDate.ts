import { ValidationError } from '../../shared/errors/DomainError.js';

export class SearchDate {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(date: string): SearchDate {
    const trimmed = date.trim();
    if (!/^\d{8}$/.test(trimmed)) {
      throw new ValidationError('SearchDate must be YYYYMMDD format (8 digits)');
    }
    return new SearchDate(trimmed);
  }

  static fromDate(date: Date): SearchDate {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return new SearchDate(`${year}${month}${day}`);
  }

  static today(): SearchDate {
    return SearchDate.fromDate(new Date());
  }

  static yesterday(): SearchDate {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return SearchDate.fromDate(date);
  }

  static defaultForCrawling(): SearchDate {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    if (hour < 14) {
      if (day === 1) {
        now.setDate(now.getDate() - 3);
      } else if (day === 0) {
        now.setDate(now.getDate() - 2);
      } else {
        now.setDate(now.getDate() - 1);
      }
    }

    return SearchDate.fromDate(now);
  }

  getValue(): string {
    return this.value;
  }

  toFormatted(): string {
    return `${this.value.slice(0, 4)}-${this.value.slice(4, 6)}-${this.value.slice(6, 8)}`;
  }

  toDate(): Date {
    const year = parseInt(this.value.slice(0, 4), 10);
    const month = parseInt(this.value.slice(4, 6), 10) - 1;
    const day = parseInt(this.value.slice(6, 8), 10);
    return new Date(year, month, day);
  }

  equals(other: SearchDate): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

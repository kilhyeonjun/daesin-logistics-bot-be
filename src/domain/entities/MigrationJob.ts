export type MigrationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface MigrationJobProps {
  id?: number;
  startDate: string;
  endDate: string;
  status: MigrationStatus;
  currentDate: string | null;
  totalDays: number;
  completedDays: number;
  errorMessage: string | null;
  createdAt?: string;
  updatedAt?: string | null;
}

export class MigrationJob {
  readonly id?: number;
  readonly startDate: string;
  readonly endDate: string;
  status: MigrationStatus;
  currentDate: string | null;
  readonly totalDays: number;
  completedDays: number;
  errorMessage: string | null;
  readonly createdAt?: string;
  updatedAt?: string | null;

  constructor(props: MigrationJobProps) {
    this.id = props.id;
    this.startDate = props.startDate;
    this.endDate = props.endDate;
    this.status = props.status;
    this.currentDate = props.currentDate;
    this.totalDays = props.totalDays;
    this.completedDays = props.completedDays;
    this.errorMessage = props.errorMessage;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(startDate: string, endDate: string, totalDays: number): MigrationJob {
    return new MigrationJob({
      startDate,
      endDate,
      status: 'pending',
      currentDate: null,
      totalDays,
      completedDays: 0,
      errorMessage: null,
    });
  }

  get progressPercent(): number {
    if (this.totalDays === 0) return 0;
    return Math.round((this.completedDays / this.totalDays) * 100);
  }

  isActive(): boolean {
    return this.status === 'pending' || this.status === 'running';
  }
}

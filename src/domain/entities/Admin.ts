export interface AdminProps {
  id?: number;
  email: string;
  passwordHash: string;
  name?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
}

export class Admin {
  readonly id?: number;
  readonly email: string;
  readonly passwordHash: string;
  readonly name: string | null;
  readonly createdAt?: string;
  readonly updatedAt: string | null;

  constructor(props: AdminProps) {
    this.id = props.id;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.name = props.name ?? null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt ?? null;
  }

  static create(props: Omit<AdminProps, 'id' | 'createdAt' | 'updatedAt'>): Admin {
    return new Admin({
      ...props,
    });
  }
}

import type { Admin } from '../../domain/entities/Admin.js';

export interface AdminDto {
  id: number;
  email: string;
  name: string | null;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  token: string;
  admin: AdminDto;
}

export class AdminMapper {
  static toDto(admin: Admin): AdminDto {
    return {
      id: admin.id!,
      email: admin.email,
      name: admin.name,
    };
  }
}

import { injectable, inject } from 'tsyringe';
import type { IAdminRepository } from '../../domain/repositories/IAdminRepository.js';
import { PasswordService } from '../../infrastructure/auth/PasswordService.js';
import { JwtService } from '../../infrastructure/auth/JwtService.js';
import { LoginRequestDto, LoginResponseDto, AdminMapper } from '../dto/AdminDto.js';
import { TOKENS } from '../../config/tokens.js';
import { ValidationError } from '../../shared/errors/DomainError.js';

@injectable()
export class LoginUseCase {
  constructor(
    @inject(TOKENS.AdminRepository)
    private readonly adminRepository: IAdminRepository,
    @inject(TOKENS.PasswordService)
    private readonly passwordService: PasswordService,
    @inject(TOKENS.JwtService)
    private readonly jwtService: JwtService
  ) {}

  async execute(dto: LoginRequestDto): Promise<LoginResponseDto> {
    const admin = await this.adminRepository.findByEmail(dto.email);
    if (!admin) {
      throw new ValidationError('Invalid email or password');
    }

    const isValid = await this.passwordService.compare(dto.password, admin.passwordHash);
    if (!isValid) {
      throw new ValidationError('Invalid email or password');
    }

    const token = this.jwtService.sign({
      sub: admin.id!,
      email: admin.email,
      name: admin.name,
    });

    return {
      token,
      admin: AdminMapper.toDto(admin),
    };
  }
}

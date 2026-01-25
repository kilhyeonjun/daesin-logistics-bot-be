import { injectable } from 'tsyringe';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

@injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

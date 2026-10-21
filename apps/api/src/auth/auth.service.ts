import type {
  AdminDto,
  LoginResponse,
  SocketTokenResponse,
} from '@district-viii/shared';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { Admin } from './admin.schema';
import type { JwtPayload } from './jwt-payload';

const BCRYPT_ROUNDS = 12;
const SOCKET_TOKEN_TTL_S = 300;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

@Injectable()
export class AuthService {
  /** Compared against when the email is unknown, so timing doesn't reveal which emails exist. */
  private dummyHash: Promise<string> | null = null;

  constructor(
    @InjectModel(Admin.name) private readonly admins: Model<Admin>,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResponse> {
    const admin = await this.admins
      .findOne({ email })
      .select('+passwordHash')
      .exec();
    this.dummyHash ??= hashPassword('district-viii-timing-guard');
    const valid = await bcrypt.compare(
      password,
      admin?.passwordHash ?? (await this.dummyHash),
    );
    if (!admin || !valid)
      throw new UnauthorizedException('Invalid email or password');

    const dto = toAdminDto(admin.id as string, admin);
    const accessToken = await this.jwt.signAsync({
      sub: dto.id,
      email: dto.email,
      role: 'admin',
      typ: 'access',
    } satisfies JwtPayload);
    const decoded = this.jwt.decode<{ exp: number; iat: number }>(accessToken);
    return { accessToken, expiresIn: decoded.exp - decoded.iat, admin: dto };
  }

  async findById(id: string): Promise<AdminDto | null> {
    const admin = await this.admins.findById(id).lean().exec();
    return admin ? toAdminDto(String(admin._id), admin) : null;
  }

  async socketToken(admin: AdminDto): Promise<SocketTokenResponse> {
    const token = await this.jwt.signAsync(
      {
        sub: admin.id,
        email: admin.email,
        role: 'admin',
        typ: 'socket',
      } satisfies JwtPayload,
      { expiresIn: SOCKET_TOKEN_TTL_S },
    );
    return { token, expiresIn: SOCKET_TOKEN_TTL_S };
  }
}

function toAdminDto(
  id: string,
  admin: Pick<Admin, 'email' | 'name'>,
): AdminDto {
  return { id, email: admin.email, name: admin.name };
}

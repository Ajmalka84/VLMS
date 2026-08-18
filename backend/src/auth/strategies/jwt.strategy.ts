import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '../decorators/current-user.decorator';
import { UserRole } from '../decorators/roles.decorator';

export interface JwtPayload {
  sub: string;
  mobile: string;
  role: UserRole;
  businessName?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'vlms_super_secret_jwt_key_2026',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!payload || !payload.sub || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id: payload.sub,
      mobile: payload.mobile,
      role: payload.role,
      businessName: payload.businessName,
    };
  }
}

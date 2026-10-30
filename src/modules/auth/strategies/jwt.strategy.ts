import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { UsersService } from '../../users/services/users.service';
import { UserEntity } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly i18n: I18nService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || '',
    });
  }

  async validate(payload: JwtPayload): Promise<UserEntity> {
    try {
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException(
          await this.i18n.t('errors.auth.unauthorized', {
            defaultValue: 'Usuario no autorizado o sesión inválida.',
          }),
        );
      }
      return user;
    } catch {
      throw new UnauthorizedException(
        await this.i18n.t('errors.auth.unauthorized', {
          defaultValue: 'Usuario no autorizado o sesión inválida.',
        }),
      );
    }
  }
}

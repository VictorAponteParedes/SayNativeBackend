import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { I18nService } from 'nestjs-i18n';
import { UsersService } from '../../users/services/users.service';
import { UserEntity } from '../../users/entities/user.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { LoginDto } from '../dto/login.dto';
import { CreateUserDto } from '../../users/dto/create-user.dto';

export interface AuthResponse {
  user: UserEntity;
  accessToken: string;
  refreshToken: string;
  message: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  message: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Hashea el refresh token mediante SHA-256 para almacenamiento seguro
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Genera el par de tokens (Access Token 15m + Refresh Token 7d)
   * y persiste el hash del refresh token para rotación segura
   */
  async generateTokens(user: UserEntity): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = { sub: user.id, email: user.email };

    const accessExpiresIn =
      this.configService.get<string>('jwt.accessExpiresIn') || '15m';

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: accessExpiresIn as any,
    });

    // Refresh Token aleatorio criptográficamente seguro
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshTokenRecord = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      isRevoked: false,
    });
    await this.refreshTokenRepository.save(refreshTokenRecord);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Valida credenciales de acceso comparando email y hash de contraseña con bcrypt
   */
  async validateUser(
    email: string,
    pass: string,
    lang = 'es',
  ): Promise<UserEntity> {
    const userWithPassword = await this.usersService.findByEmail(email);

    if (!userWithPassword) {
      throw new UnauthorizedException(
        await this.i18n.t('errors.auth.invalid_credentials', {
          lang,
          defaultValue:
            'Credenciales inválidas. Verifica tu correo y contraseña.',
        }),
      );
    }

    const isMatch = await bcrypt.compare(pass, userWithPassword.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException(
        await this.i18n.t('errors.auth.invalid_credentials', {
          lang,
          defaultValue:
            'Credenciales inválidas. Verifica tu correo y contraseña.',
        }),
      );
    }

    return await this.usersService.findById(userWithPassword.id, lang);
  }

  /**
   * Inicia sesión del usuario generando par de tokens criptográficos
   */
  async login(loginDto: LoginDto, lang = 'es'): Promise<AuthResponse> {
    const user = await this.validateUser(
      loginDto.email,
      loginDto.password,
      lang,
    );
    const { accessToken, refreshToken } = await this.generateTokens(user);

    const message = await this.i18n.t('auth.login_success', {
      lang,
      defaultValue: 'Inicio de sesión exitoso',
    });

    return {
      user,
      accessToken,
      refreshToken,
      message,
    };
  }

  /**
   * Registra un nuevo usuario en la plataforma delegando en UsersService
   */
  async register(
    createUserDto: CreateUserDto,
    lang = 'es',
  ): Promise<AuthResponse> {
    const user = await this.usersService.create(createUserDto, lang);
    const { accessToken, refreshToken } = await this.generateTokens(user);

    const message = await this.i18n.t('auth.register_success', {
      lang,
      defaultValue: 'Usuario registrado exitosamente',
    });

    return {
      user,
      accessToken,
      refreshToken,
      message,
    };
  }

  /**
   * Renueva el par de tokens aplicando rotación estricta de Refresh Token
   */
  async refreshTokens(
    rawRefreshToken: string,
    lang = 'es',
  ): Promise<RefreshResponse> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException(
        await this.i18n.t('errors.auth.invalid_refresh_token', {
          lang,
          defaultValue: 'Refresh token no proporcionado o inválido.',
        }),
      );
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException(
        await this.i18n.t('errors.auth.invalid_refresh_token', {
          lang,
          defaultValue: 'El token de actualización es inválido o no existe.',
        }),
      );
    }

    if (tokenRecord.isRevoked) {
      this.logger.warn(
        `Detectado intento de reutilización de refresh token revocado para el usuario ${tokenRecord.userId}`,
      );

      await this.refreshTokenRepository.update(
        { userId: tokenRecord.userId },
        { isRevoked: true },
      );
      throw new UnauthorizedException(
        await this.i18n.t('errors.auth.refresh_token_revoked', {
          lang,
          defaultValue:
            'Sesión revocada por motivos de seguridad. Inicia sesión nuevamente.',
        }),
      );
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw new UnauthorizedException(
        await this.i18n.t('errors.auth.refresh_token_expired', {
          lang,
          defaultValue:
            'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
        }),
      );
    }

    tokenRecord.isRevoked = true;
    await this.refreshTokenRepository.save(tokenRecord);

    const user = await this.usersService.findById(tokenRecord.userId, lang);
    const newTokens = await this.generateTokens(user);

    const message = await this.i18n.t('auth.refresh_success', {
      lang,
      defaultValue: 'Tokens renovados con éxito.',
    });

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      message,
    };
  }

  async logout(
    rawRefreshToken: string,
    lang = 'es',
  ): Promise<{ success: boolean; message: string }> {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.refreshTokenRepository.update(
        { tokenHash },
        { isRevoked: true },
      );
    }

    const message = await this.i18n.t('auth.logout_success', {
      lang,
      defaultValue: 'Sesión cerrada con éxito.',
    });

    return { success: true, message };
  }
}

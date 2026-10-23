import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { I18nService } from 'nestjs-i18n';
import { UsersService } from '../../users/services/users.service';
import { UserEntity } from '../../users/entities/user.entity';
import { LoginDto } from '../dto/login.dto';
import { CreateUserDto } from '../../users/dto/create-user.dto';

export interface AuthResponse {
  user: UserEntity;
  accessToken: string;
  message: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly i18n: I18nService,
  ) {}

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
          defaultValue: 'Credenciales inválidas. Verifica tu correo y contraseña.',
        }),
      );
    }

    const isMatch = await bcrypt.compare(pass, userWithPassword.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException(
        await this.i18n.t('errors.auth.invalid_credentials', {
          lang,
          defaultValue: 'Credenciales inválidas. Verifica tu correo y contraseña.',
        }),
      );
    }

    // Retorna la entidad de usuario completa con todas sus relaciones (avatar, idiomas)
    return await this.usersService.findById(userWithPassword.id, lang);
  }

  /**
   * Inicia sesión del usuario y retorna sus datos y token
   */
  async login(loginDto: LoginDto, lang = 'es'): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password, lang);

    return {
      user,
      accessToken: `token_${user.id}_${Date.now()}`,
      message: 'Inicio de sesión exitoso',
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

    return {
      user,
      accessToken: `token_${user.id}_${Date.now()}`,
      message: 'Usuario registrado exitosamente',
    };
  }
}

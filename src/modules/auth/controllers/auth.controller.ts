import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, AuthResponse, RefreshResponse } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserEntity } from '../../users/entities/user.entity';

@ApiTags('Autenticación (Auth)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión con correo electrónico y contraseña' })
  @SwaggerResponse({ status: 200, description: 'Sesión iniciada con éxito' })
  @SwaggerResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(
    @Body() loginDto: LoginDto,
    @Headers('accept-language') lang = 'es',
  ): Promise<AuthResponse> {
    return await this.authService.login(loginDto, lang);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar un nuevo usuario en la plataforma' })
  @SwaggerResponse({ status: 201, description: 'Usuario registrado con éxito' })
  @SwaggerResponse({ status: 409, description: 'El correo electrónico ya existe' })
  async register(
    @Body() createUserDto: CreateUserDto,
    @Headers('accept-language') lang = 'es',
  ): Promise<AuthResponse> {
    return await this.authService.register(createUserDto, lang);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar par de tokens mediante refresh token rotativo' })
  @SwaggerResponse({ status: 200, description: 'Tokens renovados con éxito' })
  @SwaggerResponse({ status: 401, description: 'Refresh token inválido, expirado o revocado' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Headers('accept-language') lang = 'es',
  ): Promise<RefreshResponse> {
    return await this.authService.refreshTokens(dto.refreshToken, lang);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión e invalidar refresh token' })
  async logout(
    @Body() dto: RefreshTokenDto,
    @Headers('accept-language') lang = 'es',
  ): Promise<{ success: boolean; message: string }> {
    return await this.authService.logout(dto.refreshToken, lang);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener datos del usuario actualmente autenticado vía JWT' })
  getProfile(@CurrentUser() user: UserEntity): UserEntity {
    return user;
  }
}

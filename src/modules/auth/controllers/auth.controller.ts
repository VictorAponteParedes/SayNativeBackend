import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { AuthService, AuthResponse } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { CreateUserDto } from '../../users/dto/create-user.dto';

@ApiTags('Autenticación (Auth)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}

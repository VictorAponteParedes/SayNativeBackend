import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Headers,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { AddLanguageDto } from '../dto/add-language.dto';
import { UserEntity } from '../entities/user.entity';
import { UserLanguageEntity } from '../entities/user-language.entity';

@ApiTags('Usuarios (Users)')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @SwaggerResponse({ status: 201, type: UserEntity })
  async create(
    @Body() createUserDto: CreateUserDto,
    @Headers('accept-language') lang = 'es'
  ): Promise<UserEntity> {
    return await this.usersService.create(createUserDto, lang);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los compañeros disponibles' })
  @SwaggerResponse({ status: 200, type: [UserEntity] })
  async findAll(
    @Headers('x-user-id') userId?: string,
  ): Promise<UserEntity[]> {
    return await this.usersService.findAll(userId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Obtener mi perfil completo' })
  @SwaggerResponse({ status: 200, type: UserEntity })
  async getMyProfile(
    @Headers('x-user-id') userId: string,
    @Headers('accept-language') lang = 'es'
  ): Promise<UserEntity> {
    // Por ahora usamos el header o parámetro hasta conectar JwtAuthGuard
    return await this.usersService.findById(userId, lang);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Actualizar mis datos personales' })
  @SwaggerResponse({ status: 200, type: UserEntity })
  async updateMyProfile(
    @Headers('x-user-id') userId: string,
    @Body() updateDto: UpdateProfileDto,
    @Headers('accept-language') lang = 'es'
  ): Promise<UserEntity> {
    return await this.usersService.updateProfile(userId, updateDto, lang);
  }

  @Post('me/avatar/:fileId')
  @ApiOperation({ summary: 'Vincular un archivo subido como foto de avatar' })
  @SwaggerResponse({ status: 200, type: UserEntity })
  async updateAvatar(
    @Headers('x-user-id') userId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Headers('accept-language') lang = 'es'
  ): Promise<UserEntity> {
    return await this.usersService.updateAvatar(userId, fileId, lang);
  }

  @Post('me/languages')
  @ApiOperation({ summary: 'Agregar un idioma al perfil (Nativo o en Aprendizaje)' })
  @SwaggerResponse({ status: 201, type: UserLanguageEntity })
  async addLanguage(
    @Headers('x-user-id') userId: string,
    @Body() addLanguageDto: AddLanguageDto,
    @Headers('accept-language') lang = 'es'
  ): Promise<UserLanguageEntity> {
    return await this.usersService.addLanguage(userId, addLanguageDto, lang);
  }

  @Patch('me/teaching-mode')
  @ApiOperation({ summary: 'Activar o pausar el Modo Enseñar para recibir llamadas' })
  async toggleTeachingMode(
    @Headers('x-user-id') userId: string,
    @Body('isAvailable') isAvailable: boolean,
    @Headers('accept-language') lang = 'es'
  ): Promise<UserEntity> {
    return await this.usersService.toggleTeachingMode(userId, isAvailable, lang);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener el perfil público de otro compañero/tutor' })
  @SwaggerResponse({ status: 200, type: UserEntity })
  async getPublicProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('accept-language') lang = 'es'
  ): Promise<UserEntity> {
    return await this.usersService.findById(id, lang);
  }
}

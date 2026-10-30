import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Headers,
  ParseUUIDPipe,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { AddLanguageDto } from '../dto/add-language.dto';
import { UserEntity } from '../entities/user.entity';
import { UserLanguageEntity } from '../entities/user-language.entity';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Usuarios (Users)')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
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
    @CurrentUser() user?: UserEntity,
    @Headers('x-user-id') userId?: string,
  ): Promise<UserEntity[]> {
    return await this.usersService.findAll(user?.id || userId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Obtener mi perfil completo' })
  @SwaggerResponse({ status: 200, type: UserEntity })
  async getMyProfile(
    @CurrentUser() user?: UserEntity,
    @Headers('x-user-id') userId?: string,
    @Headers('accept-language') lang = 'es'
  ): Promise<UserEntity> {
    const targetId = user?.id || userId;
    return await this.usersService.findById(targetId!, lang);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Actualizar mis datos personales' })
  @SwaggerResponse({ status: 200, type: UserEntity })
  async updateMyProfile(
    @CurrentUser() user?: UserEntity,
    @Headers('x-user-id') userId?: string,
    @Body() updateDto?: UpdateProfileDto,
    @Headers('accept-language') lang = 'es'
  ): Promise<UserEntity> {
    const targetId = user?.id || userId;
    return await this.usersService.updateProfile(targetId!, updateDto || {}, lang);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Subir y actualizar foto de avatar directamente' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser() user: UserEntity,
    @Headers('x-user-id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
        ],
      })
    )
    file: Express.Multer.File,
    @Headers('accept-language') lang = 'es'
  ): Promise<UserEntity> {
    const targetId = user?.id || userId;
    return await this.usersService.uploadAndSetAvatar(targetId, file, lang);
  }

  @Post('me/avatar/:fileId')
  @ApiOperation({ summary: 'Vincular un archivo subido como foto de avatar' })
  @SwaggerResponse({ status: 200, type: UserEntity })
  async updateAvatar(
    @CurrentUser() user: UserEntity,
    @Headers('x-user-id') userId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Headers('accept-language') lang = 'es'
  ): Promise<UserEntity> {
    const targetId = user?.id || userId;
    return await this.usersService.updateAvatar(targetId, fileId, lang);
  }

  @Post('me/languages')
  @ApiOperation({ summary: 'Agregar un idioma al perfil (Nativo o en Aprendizaje)' })
  @SwaggerResponse({ status: 201, type: UserLanguageEntity })
  async addLanguage(
    @CurrentUser() user: UserEntity,
    @Headers('x-user-id') userId: string,
    @Body() addLanguageDto: AddLanguageDto,
    @Headers('accept-language') lang = 'es'
  ): Promise<UserLanguageEntity> {
    const targetId = user?.id || userId;
    return await this.usersService.addLanguage(targetId, addLanguageDto, lang);
  }

  @Patch('me/teaching-mode')
  @ApiOperation({ summary: 'Activar o pausar el Modo Enseñar para recibir llamadas' })
  async toggleTeachingMode(
    @CurrentUser() user: UserEntity,
    @Headers('x-user-id') userId: string,
    @Body('isAvailable') isAvailable: boolean,
    @Headers('accept-language') lang = 'es'
  ): Promise<UserEntity> {
    const targetId = user?.id || userId;
    return await this.usersService.toggleTeachingMode(targetId, isAvailable, lang);
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

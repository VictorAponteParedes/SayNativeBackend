import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  Body,
  Res,
  ParseFilePipe,
  MaxFileSizeValidator,
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { FilesService } from '../services/files.service';
import { UploadFileDto } from '../dto/upload-file.dto';
import { FileEntity } from '../entities/file.entity';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Archivos (Files)')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Subir un archivo (Avatar, Audio o Captura)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: {
          type: 'string',
          enum: ['AVATAR', 'CHAT_AUDIO', 'CHAT_IMAGE', 'SUPPORT_ATTACHMENT'],
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB máximo
        ],
      })
    )
    file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto,
    @Headers('accept-language') lang = 'es'
  ): Promise<FileEntity> {
    return await this.filesService.saveUploadedFile(
      file,
      uploadDto.type,
      null,
      lang
    );
  }

  @Public()
  @Get(':fileName')
  @ApiOperation({ summary: 'Obtener y visualizar un archivo por su nombre' })
  async getFile(
    @Param('fileName') fileName: string,
    @Res() res: Response,
    @Headers('accept-language') lang = 'es'
  ) {
    const { path: filePath, mimeType } =
      await this.filesService.getFilePathByName(fileName, lang);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(filePath);
  }
}

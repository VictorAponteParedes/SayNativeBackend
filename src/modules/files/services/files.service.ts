import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { I18nService } from 'nestjs-i18n';
import { FileEntity, FileType } from '../entities/file.entity';

@Injectable()
export class FilesService {
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads');

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly i18n: I18nService
  ) {
    // Asegurar que el directorio de uploads exista
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveUploadedFile(
    file: Express.Multer.File,
    type: FileType = FileType.AVATAR,
    userId: string | null = null,
    lang = 'es'
  ): Promise<FileEntity> {
    if (!file) {
      throw new BadRequestException(
        await this.i18n.t('files.no_file_provided', { lang })
      );
    }

    const fileExt = path.extname(file.originalname).toLowerCase();
    const uniqueFileName = `${uuidv4()}${fileExt}`;
    const destinationPath = path.join(this.uploadDir, uniqueFileName);

    // Escribir archivo en disco
    await fs.promises.writeFile(destinationPath, file.buffer);

    const relativeUrl = `/files/${uniqueFileName}`;

    const newFile = this.fileRepository.create({
      originalName: file.originalname,
      fileName: uniqueFileName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      type,
      url: relativeUrl,
      path: destinationPath,
      userId,
    });

    return await this.fileRepository.save(newFile);
  }

  async getFileById(id: string, lang = 'es'): Promise<FileEntity> {
    const file = await this.fileRepository.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException(
        await this.i18n.t('files.file_not_found', { lang })
      );
    }
    return file;
  }

  async getFilePathByName(
    fileName: string,
    lang = 'es'
  ): Promise<{ path: string; mimeType: string }> {
    const file = await this.fileRepository.findOne({ where: { fileName } });
    if (!file || !fs.existsSync(file.path)) {
      throw new NotFoundException(
        await this.i18n.t('files.file_not_found', { lang })
      );
    }

    return {
      path: file.path,
      mimeType: file.mimeType,
    };
  }

  async deleteFile(id: string, lang = 'es'): Promise<void> {
    const file = await this.getFileById(id, lang);
    if (fs.existsSync(file.path)) {
      await fs.promises.unlink(file.path);
    }
    await this.fileRepository.remove(file);
  }
}

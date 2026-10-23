import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FileType } from '../entities/file.entity';

export class UploadFileDto {
  @ApiProperty({
    enum: FileType,
    default: FileType.AVATAR,
    description: 'Tipo o destino del archivo',
  })
  @IsEnum(FileType, { message: 'errors.files.invalid_type' })
  @IsOptional()
  type?: FileType = FileType.AVATAR;
}

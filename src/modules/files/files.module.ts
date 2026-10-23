import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from './entities/file.entity';
import { FilesService } from './services/files.service';
import { FilesController } from './controllers/files.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity])],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService, TypeOrmModule],
})
export class FilesModule {}

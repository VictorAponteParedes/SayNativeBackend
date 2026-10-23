import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UserLanguageEntity } from './entities/user-language.entity';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserLanguageEntity]),
    FilesModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { I18nModule, AcceptLanguageResolver, QueryResolver } from 'nestjs-i18n';
import * as path from 'path';

import { databaseConfig } from './config/database.config';
import { jwtConfig } from './config/jwt.config';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { FilesModule } from './modules/files/files.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CallsModule } from './modules/calls/calls.module';
import { CoinsModule } from './modules/coins/coins.module';
import { ChatsModule } from './modules/chats/chats.module';
import { TranslationsModule } from './modules/translations/translations.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Variables de entorno globales
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
    }),

    // Eventos desacoplados en memoria
    EventEmitterModule.forRoot(),

    // Conexión a Base de Datos PostgreSQL con TypeORM
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('database.host');
        const isLocal = host === 'localhost' || host === '127.0.0.1';

        return {
          type: 'postgres',
          host,
          port: config.get<number>('database.port'),
          username: config.get<string>('database.username'),
          password: config.get<string>('database.password'),
          database: config.get<string>('database.database'),
          autoLoadEntities: true,
          synchronize:
            process.env.DB_SYNCHRONIZE === 'true' ||
            process.env.NODE_ENV !== 'production',
          logging: config.get<boolean>('database.logging'),
          ssl: isLocal ? false : { rejectUnauthorized: false },
        };
      },
    }),

    // Sistema de Internacionalización Multi-Idioma
    I18nModule.forRoot({
      fallbackLanguage: 'es',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [AcceptLanguageResolver, new QueryResolver(['lang'])],
    }),

    // Módulos de Negocio
    AuthModule,
    FilesModule,
    UsersModule,
    CallsModule,
    CoinsModule,
    ChatsModule,
    TranslationsModule,
    ModerationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

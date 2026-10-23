import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { I18nService } from 'nestjs-i18n';
import { UserEntity } from '../entities/user.entity';
import {
  UserLanguageEntity,
  LanguageType,
  CefrLevel,
} from '../entities/user-language.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { AddLanguageDto } from '../dto/add-language.dto';
import { FilesService } from '../../files/services/files.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserLanguageEntity)
    private readonly userLanguageRepository: Repository<UserLanguageEntity>,
    private readonly filesService: FilesService,
    private readonly i18n: I18nService
  ) {}

  async create(createUserDto: CreateUserDto, lang = 'es'): Promise<UserEntity> {
    const existing = await this.userRepository.findOne({
      where: { email: createUserDto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException(
        await this.i18n.t('users.email_already_exists', { lang })
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(createUserDto.password, salt);

    const user = this.userRepository.create({
      email: createUserDto.email.toLowerCase(),
      passwordHash,
      fullName: createUserDto.fullName,
      countryCode: createUserDto.countryCode || 'ES',
      countryFlag: createUserDto.countryFlag || '🇪🇸',
      acceptedTerms: createUserDto.acceptedTerms,
      termsAcceptedAt: createUserDto.acceptedTerms ? new Date() : null,
      acceptedPromotions: createUserDto.acceptedPromotions ?? false,
    });

    const savedUser = await this.userRepository.save(user);

    // Inicializar idioma nativo por defecto
    const nativeLang = this.userLanguageRepository.create({
      userId: savedUser.id,
      languageCode: createUserDto.nativeLanguageCode || 'es',
      languageName: 'Español',
      flagEmoji: '🇪🇸',
      type: LanguageType.NATIVE,
    });
    await this.userLanguageRepository.save(nativeLang);

    // Inicializar idioma en aprendizaje por defecto
    const learningLang = this.userLanguageRepository.create({
      userId: savedUser.id,
      languageCode: createUserDto.learningLanguageCode || 'en',
      languageName: 'Inglés',
      flagEmoji: '🇺🇸',
      type: LanguageType.LEARNING,
      cefrLevel: CefrLevel.B1,
      targetLevel: 'B2',
      progressPercentage: 60,
    });
    await this.userLanguageRepository.save(learningLang);

    return await this.findById(savedUser.id, lang);
  }

  private isValidUuid(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }

  async findById(id: string, lang = 'es'): Promise<UserEntity> {
    if (!id || !this.isValidUuid(id)) {
      throw new NotFoundException(
        await this.i18n.t('users.user_not_found', { lang })
      );
    }

    const user = await this.userRepository.findOne({
      where: { id },
      relations: {
        avatar: true,
        userLanguages: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        await this.i18n.t('users.user_not_found', { lang })
      );
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        fullName: true,
        isVerified: true,
        isAvailableToTeach: true,
      },
    });
  }

  async updateProfile(
    userId: string,
    updateDto: UpdateProfileDto,
    lang = 'es'
  ): Promise<UserEntity> {
    const user = await this.findById(userId, lang);

    Object.assign(user, updateDto);

    await this.userRepository.save(user);
    return await this.findById(userId, lang);
  }

  async updateAvatar(
    userId: string,
    fileId: string,
    lang = 'es'
  ): Promise<UserEntity> {
    const user = await this.findById(userId, lang);
    const file = await this.filesService.getFileById(fileId, lang);

    user.avatarId = file.id;
    user.avatar = file;

    await this.userRepository.save(user);
    return user;
  }

  async addLanguage(
    userId: string,
    dto: AddLanguageDto,
    lang = 'es'
  ): Promise<UserLanguageEntity> {
    await this.findById(userId, lang);

    const newLang = this.userLanguageRepository.create({
      userId,
      languageCode: dto.languageCode,
      languageName: dto.languageName,
      flagEmoji: dto.flagEmoji,
      type: dto.type,
      cefrLevel: dto.cefrLevel || null,
      targetLevel: dto.targetLevel || null,
      progressPercentage: dto.progressPercentage || 0,
    });

    return await this.userLanguageRepository.save(newLang);
  }

  async toggleTeachingMode(
    userId: string,
    isAvailable: boolean,
    lang = 'es'
  ): Promise<UserEntity> {
    const user = await this.findById(userId, lang);
    user.isAvailableToTeach = isAvailable;
    return await this.userRepository.save(user);
  }
}

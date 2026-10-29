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
import { UserSettingsEntity } from '../entities/user-settings.entity';
import { UserStatsEntity } from '../entities/user-stats.entity';
import { WalletEntity } from '../../coins/entities/wallet.entity';
import {
  CoinTransactionEntity,
  TransactionType,
} from '../../coins/entities/coin-transaction.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { AddLanguageDto } from '../dto/add-language.dto';
import { FilesService } from '../../files/services/files.service';
import { FileType } from '../../files/entities/file.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserLanguageEntity)
    private readonly userLanguageRepository: Repository<UserLanguageEntity>,
    @InjectRepository(UserSettingsEntity)
    private readonly userSettingsRepository: Repository<UserSettingsEntity>,
    @InjectRepository(UserStatsEntity)
    private readonly userStatsRepository: Repository<UserStatsEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    @InjectRepository(CoinTransactionEntity)
    private readonly transactionRepository: Repository<CoinTransactionEntity>,
    private readonly filesService: FilesService,
    private readonly i18n: I18nService,
  ) {}

  async create(createUserDto: CreateUserDto, lang = 'es'): Promise<UserEntity> {
    const existing = await this.userRepository.findOne({
      where: { email: createUserDto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException(
        await this.i18n.t('users.email_already_exists', { lang }),
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(createUserDto.password, salt);

    const user = this.userRepository.create({
      email: createUserDto.email.toLowerCase(),
      passwordHash,
      fullName: createUserDto.fullName,
      birthDate: createUserDto.birthDate
        ? new Date(createUserDto.birthDate)
        : null,
      countryCode: createUserDto.countryCode || 'ES',
      countryFlag: createUserDto.countryFlag || '🇪🇸',
    });

    const savedUser = await this.userRepository.save(user);
    const settings = this.userSettingsRepository.create({
      userId: savedUser.id,
      acceptedTerms: createUserDto.acceptedTerms,
      termsAcceptedAt: createUserDto.acceptedTerms ? new Date() : null,
      acceptedPromotions: createUserDto.acceptedPromotions ?? false,
      isAvailableToTeach: false,
      earningRatePerMin: 7,
      learningCostPerMin: 10,
    });
    await this.userSettingsRepository.save(settings);

    // Inicializar estadísticas en user_stats
    const stats = this.userStatsRepository.create({
      userId: savedUser.id,
      rating: 5.0,
      totalCalls: 0,
      hoursPracticed: 0.0,
      reviewCount: 0,
    });
    await this.userStatsRepository.save(stats);

    // Inicializar billetera con bono de bienvenida de 1,000 monedas
    const wallet = this.walletRepository.create({
      userId: savedUser.id,
      balance: 1000,
    });
    const savedWallet = await this.walletRepository.save(wallet);

    const welcomeDescription = await this.i18n.t('coins.welcome_bonus', {
      lang,
      defaultValue: 'Bono de bienvenida por registrarte en SayNative',
    });

    const welcomeTx = this.transactionRepository.create({
      walletId: savedWallet.id,
      userId: savedUser.id,
      amount: 1000,
      type: TransactionType.WELCOME_BONUS,
      description: welcomeDescription,
      referenceId: 'welcome-bonus',
    });
    await this.transactionRepository.save(welcomeTx);

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
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    );
  }

  async findById(id: string, lang = 'es'): Promise<UserEntity> {
    if (!id || !this.isValidUuid(id)) {
      throw new NotFoundException(
        await this.i18n.t('users.user_not_found', { lang }),
      );
    }

    const user = await this.userRepository.findOne({
      where: { id },
      relations: {
        avatar: true,
        userLanguages: true,
        settings: true,
        stats: true,
        wallet: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        await this.i18n.t('users.user_not_found', { lang }),
      );
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: {
        avatar: true,
        userLanguages: true,
        settings: true,
        stats: true,
        wallet: true,
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        fullName: true,
        isVerified: true,
      },
    });
  }

  async updateProfile(
    userId: string,
    updateDto: UpdateProfileDto,
    lang = 'es',
  ): Promise<UserEntity> {
    const user = await this.findById(userId, lang);

    const { isAvailableToTeach, ...userFields } = updateDto;

    Object.assign(user, userFields);
    await this.userRepository.save(user);

    if (isAvailableToTeach !== undefined) {
      if (user.settings) {
        user.settings.isAvailableToTeach = isAvailableToTeach;
        await this.userSettingsRepository.save(user.settings);
      } else {
        const newSettings = this.userSettingsRepository.create({
          userId: user.id,
          isAvailableToTeach,
        });
        await this.userSettingsRepository.save(newSettings);
      }
    }

    return await this.findById(userId, lang);
  }

  async updateAvatar(
    userId: string,
    fileId: string,
    lang = 'es',
  ): Promise<UserEntity> {
    const user = await this.findById(userId, lang);
    const file = await this.filesService.getFileById(fileId, lang);

    user.avatarId = file.id;
    user.avatar = file;

    await this.userRepository.save(user);
    return user;
  }

  async uploadAndSetAvatar(
    userId: string,
    file: Express.Multer.File,
    lang = 'es',
  ): Promise<UserEntity> {
    const user = await this.findById(userId, lang);
    const savedFile = await this.filesService.saveUploadedFile(
      file,
      FileType.AVATAR,
      userId,
      lang,
    );

    user.avatarId = savedFile.id;
    user.avatar = savedFile;

    await this.userRepository.save(user);
    return await this.findById(userId, lang);
  }

  async addLanguage(
    userId: string,
    dto: AddLanguageDto,
    lang = 'es',
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

  async findAll(excludeUserId?: string): Promise<UserEntity[]> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.avatar', 'avatar')
      .leftJoinAndSelect('user.userLanguages', 'userLanguages')
      .leftJoinAndSelect('user.settings', 'settings')
      .leftJoinAndSelect('user.stats', 'stats')
      .leftJoinAndSelect('user.wallet', 'wallet')
      .orderBy('user.createdAt', 'DESC')
      .take(50);

    if (excludeUserId && this.isValidUuid(excludeUserId)) {
      query.where('user.id != :excludeUserId', { excludeUserId });
    }

    return await query.getMany();
  }

  async toggleTeachingMode(
    userId: string,
    isAvailable: boolean,
    lang = 'es',
  ): Promise<UserEntity> {
    const user = await this.findById(userId, lang);
    if (user.settings) {
      user.settings.isAvailableToTeach = isAvailable;
      await this.userSettingsRepository.save(user.settings);
    } else {
      const newSettings = this.userSettingsRepository.create({
        userId: user.id,
        isAvailableToTeach: isAvailable,
      });
      await this.userSettingsRepository.save(newSettings);
    }
    return await this.findById(userId, lang);
  }
}

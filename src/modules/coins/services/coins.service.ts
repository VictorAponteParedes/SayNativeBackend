import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { I18nService } from 'nestjs-i18n';
import { WalletEntity } from '../entities/wallet.entity';
import {
  CoinTransactionEntity,
  TransactionType,
} from '../entities/coin-transaction.entity';
import { RechargeCoinsDto } from '../dto/recharge-coins.dto';
import { RewardCoinsDto } from '../dto/reward-coins.dto';
import { CallCompletedEvent } from '../../calls/events/call-completed.event';

export const INITIAL_WELCOME_BONUS = 1000;

@Injectable()
export class CoinsService {
  private readonly logger = new Logger(CoinsService.name);

  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    @InjectRepository(CoinTransactionEntity)
    private readonly transactionRepository: Repository<CoinTransactionEntity>,
    private readonly dataSource: DataSource,
    private readonly i18n: I18nService
  ) {}

  /**
   * Obtiene o crea la billetera del usuario.
   * Si es nueva, le otorga el bono inicial de bienvenida con su registro en el ledger internacionalizado.
   */
  async getOrCreateWallet(userId: string, lang = 'es'): Promise<WalletEntity> {
    let wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      wallet = this.walletRepository.create({
        userId,
        balance: INITIAL_WELCOME_BONUS,
      });
      wallet = await this.walletRepository.save(wallet);

      const welcomeDescription = await this.i18n.t('coins.welcome_bonus', {
        lang,
        defaultValue: 'Bono de bienvenida por registrarte en SayNative',
      });

      const welcomeTx = this.transactionRepository.create({
        walletId: wallet.id,
        userId,
        amount: INITIAL_WELCOME_BONUS,
        type: TransactionType.WELCOME_BONUS,
        description: welcomeDescription,
        referenceId: 'welcome-bonus',
      });
      await this.transactionRepository.save(welcomeTx);
    }

    return wallet;
  }

  /**
   * Obtiene el saldo actual de la billetera
   */
  async getBalance(userId: string, lang = 'es'): Promise<{ balance: number }> {
    const wallet = await this.getOrCreateWallet(userId, lang);
    return { balance: wallet.balance };
  }

  /**
   * Obtiene el historial de transacciones ordenado por fecha más reciente
   */
  async getTransactions(
    userId: string,
    limit = 50,
    lang = 'es'
  ): Promise<CoinTransactionEntity[]> {
    await this.getOrCreateWallet(userId, lang);

    return await this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Recarga de saldo (compra de paquete) con transacción atómica y descripción en el idioma del usuario
   */
  async recharge(
    userId: string,
    dto: RechargeCoinsDto,
    lang = 'es'
  ): Promise<{ balance: number; transaction: CoinTransactionEntity; message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let wallet = await queryRunner.manager.findOne(WalletEntity, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        wallet = queryRunner.manager.create(WalletEntity, {
          userId,
          balance: 0,
        });
        wallet = await queryRunner.manager.save(wallet);
      }

      wallet.balance += dto.amount;
      await queryRunner.manager.save(wallet);

      const rechargeDescription = await this.i18n.t('coins.recharge_package', {
        lang,
        args: { packageId: dto.packageId },
        defaultValue: `Recarga de paquete (${dto.packageId})`,
      });

      const tx = queryRunner.manager.create(CoinTransactionEntity, {
        walletId: wallet.id,
        userId,
        amount: dto.amount,
        type: TransactionType.RECHARGE,
        description: rechargeDescription,
        referenceId: dto.packageId,
      });
      const savedTx = await queryRunner.manager.save(tx);

      await queryRunner.commitTransaction();

      const successMessage = await this.i18n.t('coins.recharge_success', {
        lang,
        defaultValue: 'Recarga de monedas realizada con éxito.',
      });

      return {
        balance: wallet.balance,
        transaction: savedTx,
        message: successMessage,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error en recarga de monedas para usuario ${userId}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Acredita monedas por recompensa con traducción según el idioma del cliente
   */
  async reward(
    userId: string,
    dto: RewardCoinsDto,
    lang = 'es'
  ): Promise<{ balance: number; transaction: CoinTransactionEntity; message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let wallet = await queryRunner.manager.findOne(WalletEntity, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        wallet = queryRunner.manager.create(WalletEntity, {
          userId,
          balance: 0,
        });
        wallet = await queryRunner.manager.save(wallet);
      }

      wallet.balance += dto.amount;
      await queryRunner.manager.save(wallet);

      const rewardDescription =
        dto.rewardType === 'AD_WATCH'
          ? await this.i18n.t('coins.reward_ad', {
              lang,
              args: { amount: dto.amount },
              defaultValue: `Recompensa por ver anuncio patrocinado (+${dto.amount})`,
            })
          : await this.i18n.t('coins.daily_bonus', {
              lang,
              defaultValue: 'Bono diario por racha consecutiva',
            });

      const tx = queryRunner.manager.create(CoinTransactionEntity, {
        walletId: wallet.id,
        userId,
        amount: dto.amount,
        type: TransactionType.REWARD_AD,
        description: rewardDescription,
        referenceId: dto.rewardType,
      });
      const savedTx = await queryRunner.manager.save(tx);

      await queryRunner.commitTransaction();

      const successMessage = await this.i18n.t('coins.reward_claimed', {
        lang,
        defaultValue: 'Recompensa reclamada con éxito.',
      });

      return {
        balance: wallet.balance,
        transaction: savedTx,
        message: successMessage,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Descuenta monedas de un estudiante y acredita al tutor tras una videollamada con descripciones traducidas
   */
  async transferForCall(
    callerId: string,
    receiverId: string,
    coinsCharged: number,
    callId: string,
    durationSeconds: number,
    lang = 'es'
  ): Promise<void> {
    if (coinsCharged <= 0) return;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Bloquear y verificar saldo del estudiante (caller)
      let callerWallet = await queryRunner.manager.findOne(WalletEntity, {
        where: { userId: callerId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!callerWallet) {
        callerWallet = queryRunner.manager.create(WalletEntity, {
          userId: callerId,
          balance: 0,
        });
        callerWallet = await queryRunner.manager.save(callerWallet);
      }

      const actualDeduction = Math.min(callerWallet.balance, coinsCharged);
      callerWallet.balance = Math.max(0, callerWallet.balance - coinsCharged);
      await queryRunner.manager.save(callerWallet);

      const minutes = Math.ceil(durationSeconds / 60);

      const callerDescription = await this.i18n.t('coins.call_expense', {
        lang,
        args: { minutes },
        defaultValue: `Llamada completada (${minutes} min)`,
      });

      const debitTx = queryRunner.manager.create(CoinTransactionEntity, {
        walletId: callerWallet.id,
        userId: callerId,
        amount: -coinsCharged,
        type: TransactionType.CALL_EXPENSE,
        description: callerDescription,
        referenceId: callId,
      });
      await queryRunner.manager.save(debitTx);

      // 2. Acreditar monedas al tutor (receiver)
      let receiverWallet = await queryRunner.manager.findOne(WalletEntity, {
        where: { userId: receiverId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!receiverWallet) {
        receiverWallet = queryRunner.manager.create(WalletEntity, {
          userId: receiverId,
          balance: 0,
        });
        receiverWallet = await queryRunner.manager.save(receiverWallet);
      }

      receiverWallet.balance += actualDeduction;
      await queryRunner.manager.save(receiverWallet);

      const receiverDescription = await this.i18n.t('coins.call_earning', {
        lang,
        args: { minutes },
        defaultValue: `Ingreso por sesión de tutoría (${minutes} min)`,
      });

      const creditTx = queryRunner.manager.create(CoinTransactionEntity, {
        walletId: receiverWallet.id,
        userId: receiverId,
        amount: actualDeduction,
        type: TransactionType.CALL_EARNING,
        description: receiverDescription,
        referenceId: callId,
      });
      await queryRunner.manager.save(creditTx);

      await queryRunner.commitTransaction();
      this.logger.log(
        `Transferencia de llamada completada: ${actualDeduction} monedas transferidas de ${callerId} a ${receiverId}`
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Fallo en transferencia de monedas para llamada ${callId}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Listener del evento de llamada finalizada
   */
  @OnEvent('call.completed')
  async handleCallCompleted(event: CallCompletedEvent): Promise<void> {
    if (event.coinsCharged > 0) {
      try {
        await this.transferForCall(
          event.callerId,
          event.receiverId,
          event.coinsCharged,
          event.callId,
          event.durationSeconds
        );
      } catch (err) {
        this.logger.error('Error procesando cobro de llamada en listener', err);
      }
    }
  }
}

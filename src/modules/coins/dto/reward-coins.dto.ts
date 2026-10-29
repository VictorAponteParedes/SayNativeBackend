import { IsString, IsInt, Min, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RewardCoinsDto {
  @ApiProperty({
    example: 'AD_WATCH',
    enum: ['AD_WATCH', 'DAILY_BONUS'],
    description: 'Tipo de recompensa',
  })
  @IsString()
  @IsIn(['AD_WATCH', 'DAILY_BONUS'], { message: 'errors.coins.invalid_reward_type' })
  rewardType: 'AD_WATCH' | 'DAILY_BONUS';

  @ApiProperty({ example: 5, description: 'Cantidad de monedas otorgadas como recompensa' })
  @IsInt({ message: 'errors.coins.amount_must_be_integer' })
  @Min(1, { message: 'errors.coins.amount_must_be_positive' })
  amount: number;
}

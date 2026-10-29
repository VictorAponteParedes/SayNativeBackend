import { IsString, IsInt, Min, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RechargeCoinsDto {
  @ApiProperty({ example: 'pack-500', description: 'Identificador del paquete adquirido' })
  @IsString({ message: 'errors.coins.invalid_package' })
  packageId: string;

  @ApiProperty({ example: 500, description: 'Cantidad de monedas a acreditar' })
  @IsInt({ message: 'errors.coins.amount_must_be_integer' })
  @Min(1, { message: 'errors.coins.amount_must_be_positive' })
  amount: number;

  @ApiPropertyOptional({ example: 4.99, description: 'Monto pagado en dinero real' })
  @IsNumber()
  @IsOptional()
  pricePaid?: number;

  @ApiPropertyOptional({ example: 'USD', description: 'Moneda del pago' })
  @IsString()
  @IsOptional()
  currency?: string;
}

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CallsService } from '../services/calls.service';
import { CallSessionResponseDto } from '../dto/call-session-response.dto';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('calls')
@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Public()
  @Get('ice-servers')
  @ApiOperation({ summary: 'Obtiene la lista de servidores STUN/TURN' })
  getIceServers() {
    return this.callsService.getIceServers();
  }

  @Get('check-availability/:userId')
  @ApiOperation({ summary: 'Verifica si un usuario está ocupado en una llamada' })
  async checkAvailability(@Param('userId', ParseUUIDPipe) userId: string) {
    const isBusy = await this.callsService.checkIfUserIsBusy(userId);
    return {
      available: !isBusy,
    };
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'Finaliza una llamada y calcula los minutos consumidos' })
  @ApiResponse({ status: 200, type: CallSessionResponseDto })
  async endCall(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('durationSeconds') durationSeconds: number,
  ) {
    return await this.callsService.endCall(id, durationSeconds || 0);
  }

  @Get('history/:userId')
  @ApiOperation({ summary: 'Obtiene el historial de llamadas de un usuario' })
  @ApiResponse({ status: 200, type: [CallSessionResponseDto] })
  async getCallHistory(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.callsService.getUserCallHistory(userId);
  }
}

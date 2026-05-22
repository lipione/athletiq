import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/public.decorator.js';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'athletiq-api',
    };
  }
}

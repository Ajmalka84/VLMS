import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getStatus() {
    return { success: true, data: { service: 'vlms-backend' } };
  }
}


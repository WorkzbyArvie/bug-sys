import { Controller, Get, Post, Body, Delete, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // --- TICKETS ENDPOINTS ---
  @Post('tickets')
  createTicket(@Body() body: any) {
    return this.appService.createTicket(body);
  }

  @Get('tickets')
  findAllTickets() {
    return this.appService.getAllTickets();
  }

  @Delete('tickets/:id')
  removeTicket(@Param('id') id: string) {
    return this.appService.deleteTicket(Number(id));
  }

  // --- CRM / CUSTOMER ENDPOINTS ---
  @Get('customers')
  findAllCustomers() {
    return this.appService.getAllCustomers();
  }

  @Get('customers/:id')
  findOneCustomer(@Param('id') id: string) {
    return this.appService.getCustomerById(id);
  }

  // Add this inside the AppController class
  @Post('customers')
  createCustomer(@Body() body: any) {
    return this.appService.createCustomer(body);
  }
}
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  // --- TICKET LOGIC ---
  async createTicket(data: any) {
    return await this.prisma.ticket.create({
      data: {
        ticketNumber: data.ticketNumber,
        category: data.category,
        description: data.description,
        loanAmount: data.loanAmount,
        expiryDate: new Date(data.expiryDate),
        status: "ACTIVE",
        // Connect to the existing Customer
        customer: {
          connect: { id: data.customerId }
        },
        // NEW: Connect to the Branch
        // Ensure your frontend sends 'branchId' (Number or String depending on your schema)
        branch: {
          connect: { id: data.branchId }
        }
      }
    });
  }

  async getAllTickets() {
    return await this.prisma.ticket.findMany({
      include: { 
        customer: true,
        branch: true // Included branch details for the UI
      },
      orderBy: { pawnDate: 'desc' }
    });
  }

  async deleteTicket(id: number) {
    return await this.prisma.ticket.delete({
      where: { id: id }
    });
  }

  // --- CUSTOMER / CRM LOGIC ---
  async getAllCustomers() {
    return await this.prisma.customer.findMany({
      include: {
        _count: {
          select: { tickets: true }
        }
      },
      orderBy: { fullName: 'asc' }
    });
  }

  async getCustomerById(id: string) {
    return await this.prisma.customer.findUnique({
      where: { id },
      include: { tickets: true }
    });
  }

  async createCustomer(data: any) {
    return await this.prisma.customer.create({
      data: {
        id: require('crypto').randomUUID(),
        fullName: data.fullName,
        contactNumber: data.contactNumber,
        address: data.address,
        loyaltyTier: data.loyaltyTier || "Standard"
      }
    });
  }
}
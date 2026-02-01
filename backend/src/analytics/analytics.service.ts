import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    // We use 'ACTIVE' in all caps to satisfy the Prisma Enum type requirement
    const [totalCustomers, activeTickets, loanSum] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.ticket.count({ 
        where: { status: 'ACTIVE' } 
      }),
      this.prisma.ticket.aggregate({
        _sum: { loanAmount: true },
        where: { status: 'ACTIVE' }
      }),
    ]);

    const totalLoansValue = Number(loanSum._sum.loanAmount) || 0;

    return {
      totalLoans: totalLoansValue,
      totalCustomers,
      activeTickets,
      // Fixed: Calculating interest based on the sum of active loans
      interestEarned: totalLoansValue * 0.05,
      growth: "+12.5%"
    };
  }
}
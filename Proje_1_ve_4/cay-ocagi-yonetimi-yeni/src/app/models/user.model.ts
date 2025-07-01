import { Order } from './order.model';

export enum UserRole {
  Admin,
  User
}

export interface User {
  Id: number;
  Username: string;
  PasswordHash: string;
  Role: UserRole;
  TicketCount: number;
  IsActive: boolean;
  Orders?: Order[];
} 
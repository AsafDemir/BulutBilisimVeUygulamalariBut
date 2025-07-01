import { OrderStatus } from './order-status.enum';
import { User } from './user.model';
import { OrderDrink } from './order-drink.model';

export interface Order {
  id?: number;
  notes?: string;
  roomid: number;
  status: number;  // Status değeri küçük harfle
  UserId?: number;
  User?: {
    Id: number;
    Username: string;
    Role: string;
    TicketCount: number;
  };
  orderDrinks?: OrderDrink[];
}

export interface OrderResponse {
  order: Order;
  message: string;
  updatedTicketCount: number;
}

export interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}
  
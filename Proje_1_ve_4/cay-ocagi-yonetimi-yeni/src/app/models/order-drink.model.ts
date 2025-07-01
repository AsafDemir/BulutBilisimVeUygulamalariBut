import { Beverage } from './beverage.model';
import { Order } from './order.model';

export interface OrderDrink {
    id?: number;
    orderid: number;
    beverageid: number;
    piece: number;
    OrderNavigation?: Order;
    BeverageNavigation?: Beverage;
}
  
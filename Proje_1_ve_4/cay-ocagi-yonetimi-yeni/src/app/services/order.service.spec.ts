import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OrderService } from './order.service';
import { Order } from '../models/order.model';
import { OrderStatus } from '../models/order-status.enum';
import { ApiResponse } from '../models/api-response.model';

describe('OrderService', () => {
  let service: OrderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OrderService]
    });
    service = TestBed.inject(OrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should get pending orders', () => {
    const mockResponse: ApiResponse<Order[]> = {
      success: true,
      data: [{
        id: 1,
        roomid: 1,
        notes: 'Test sipariş',
        status: OrderStatus.Pending
      }],
      message: 'Başarılı'
    };

    service.getPendingOrders().subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${service['apiUrl']}/pending`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should approve order', () => {
    const orderId = 1;
    const mockOrder: Order = {
      id: orderId,
      roomid: 1,
      notes: 'Test sipariş',
      status: OrderStatus.Approved
    };

    service.approveOrder(orderId).subscribe(order => {
      expect(order.status).toBe(OrderStatus.Approved);
    });

    const req = httpMock.expectOne(`${service['apiUrl']}/${orderId}`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockOrder);
  });

  it('should reject order', () => {
    const orderId = 1;
    const mockOrder: Order = {
      id: orderId,
      roomid: 1,
      notes: 'Test sipariş',
      status: OrderStatus.Rejected
    };

    service.rejectOrder(orderId).subscribe(order => {
      expect(order.status).toBe(OrderStatus.Rejected);
    });

    const req = httpMock.expectOne(`${service['apiUrl']}/${orderId}`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockOrder);
  });
});

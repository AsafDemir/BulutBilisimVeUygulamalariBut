import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AnasayfaComponent } from './anasayfa.component';
import { OrderService } from '../../../services/order.service';
import { RoomService } from '../../../services/room.service';
import { DrinkService } from '../../../services/drink.service';

describe('AnasayfaComponent', () => {
  let component: AnasayfaComponent;
  let fixture: ComponentFixture<AnasayfaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [],
      providers: [OrderService, RoomService, DrinkService]
    }).compileComponents();

    fixture = TestBed.createComponent(AnasayfaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

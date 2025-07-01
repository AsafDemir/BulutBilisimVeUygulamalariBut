import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IcecekIslemComponent } from './icecek-islem.component';

describe('IcecekIslemComponent', () => {
  let component: IcecekIslemComponent;
  let fixture: ComponentFixture<IcecekIslemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IcecekIslemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IcecekIslemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

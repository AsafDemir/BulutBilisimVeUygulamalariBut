import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OdaIslemComponent } from './oda-islem.component';

describe('OdaIslemComponent', () => {
  let component: OdaIslemComponent;
  let fixture: ComponentFixture<OdaIslemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OdaIslemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OdaIslemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SiparisVerComponent } from './siparis-ver.component';

describe('SiparisVerComponent', () => {
  let component: SiparisVerComponent;
  let fixture: ComponentFixture<SiparisVerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiparisVerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SiparisVerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

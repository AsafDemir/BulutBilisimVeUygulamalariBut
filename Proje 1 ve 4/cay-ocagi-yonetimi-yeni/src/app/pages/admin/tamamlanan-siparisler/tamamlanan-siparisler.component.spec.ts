import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TamamlananSiparislerComponent } from './tamamlanan-siparisler.component';

describe('TamamlananSiparislerComponent', () => {
  let component: TamamlananSiparislerComponent;
  let fixture: ComponentFixture<TamamlananSiparislerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TamamlananSiparislerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TamamlananSiparislerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

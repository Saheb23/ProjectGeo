import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapSelectionService {
  private selectedDistrictSubject = new BehaviorSubject<string | null>(null);
  private selectedMouzaSubject = new BehaviorSubject<string | null>(null);
  
  selectedDistrict$: Observable<string | null> = this.selectedDistrictSubject.asObservable();
  selectedMouza$: Observable<string | null> = this.selectedMouzaSubject.asObservable();

  selectDistrict(districtName: string | null): void {
    this.selectedDistrictSubject.next(districtName);
    // Clear mouza when district changes
    if (districtName) {
      this.selectedMouzaSubject.next(null);
    }
  }

  selectMouza(mouzaName: string | null): void {
    this.selectedMouzaSubject.next(mouzaName);
  }

  getSelectedDistrict(): string | null {
    return this.selectedDistrictSubject.value;
  }

  getSelectedMouza(): string | null {
    return this.selectedMouzaSubject.value;
  }
}


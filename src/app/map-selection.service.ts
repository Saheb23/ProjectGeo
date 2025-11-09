import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapSelectionService {
  private selectedDistrictSubject = new BehaviorSubject<string | null>(null);
  private selectedMouzaSubject = new BehaviorSubject<string | null>(null);
  private selectedLayerSubject = new BehaviorSubject<string | null>(null);
  
  selectedDistrict$: Observable<string | null> = this.selectedDistrictSubject.asObservable();
  selectedMouza$: Observable<string | null> = this.selectedMouzaSubject.asObservable();
  selectedLayer$: Observable<string | null> = this.selectedLayerSubject.asObservable();

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

  selectLayer(layerName: string): void {
    this.selectedLayerSubject.next(layerName);
  }

  getSelectedDistrict(): string | null {
    return this.selectedDistrictSubject.value;
  }

  getSelectedMouza(): string | null {
    return this.selectedMouzaSubject.value;
  }

  getSelectedLayer(): string | null {
    return this.selectedLayerSubject.value;
  }
}


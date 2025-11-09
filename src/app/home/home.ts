import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MapComponent } from '../map/map';
import { MapSelectionService } from '../map-selection.service';

@Component({
  selector: 'app-home',
  imports: [MapComponent, CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit, OnDestroy {
  districts = signal<string[]>([]);
  mouzas = signal<string[]>([]);
  selectedDistrict: string = '';
  selectedMouza: string = '';

  private districtData: any;
  private mouzaData: any;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private mapSelectionService: MapSelectionService
  ) {}

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      await this.loadData();
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private async loadData(): Promise<void> {
    try {
      // Load district script
      await this.loadScript('/assets/data/ArunachalPradeshDistricts_2.js');
      
      // Load mouza script
      await this.loadScript('/assets/data/ArunachalPradeshMouza_1.js');
      
      // Access the global variables
      this.districtData = (window as any).json_ArunachalPradeshDistricts_2;
      this.mouzaData = (window as any).json_ArunachalPradeshMouza_1;
      
      if (this.districtData && this.districtData.features) {
        // Extract district names
        const districtNames = this.districtData.features
          .map((f: any) => f.properties["District N"] || f.properties.district)
          .filter((name: string) => name)
          .sort();
        
        // Update signal - this will automatically trigger change detection
        this.districts.set(districtNames);
        console.log('Districts loaded:', districtNames.length);
      }

      // Mouzas will be filtered based on selected district
      this.updateMouzas();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        // Script already loaded, check if data is available
        if (src.includes('Districts') && (window as any).json_ArunachalPradeshDistricts_2) {
          resolve();
          return;
        }
        if (src.includes('Mouza') && (window as any).json_ArunachalPradeshMouza_1) {
          resolve();
          return;
        }
        // Script tag exists but data not ready, wait a bit
        setTimeout(() => {
          if ((src.includes('Districts') && (window as any).json_ArunachalPradeshDistricts_2) ||
              (src.includes('Mouza') && (window as any).json_ArunachalPradeshMouza_1)) {
            resolve();
          } else {
            reject(new Error(`Script loaded but data not available: ${src}`));
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        // Give a small delay to ensure global variables are set
        setTimeout(() => resolve(), 50);
      };
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  onDistrictChange(): void {
    if (this.selectedDistrict) {
      this.mapSelectionService.selectDistrict(this.selectedDistrict);
      this.updateMouzas();
      // Clear mouza selection when district changes
      this.selectedMouza = '';
      this.mapSelectionService.selectMouza(null);
    } else {
      this.mapSelectionService.selectDistrict(null);
      this.mouzas.set([]);
    }
  }

  onMouzaChange(): void {
    if (this.selectedMouza) {
      this.mapSelectionService.selectMouza(this.selectedMouza);
    } else {
      this.mapSelectionService.selectMouza(null);
    }
  }

  private updateMouzas(): void {
    if (!this.selectedDistrict || !this.mouzaData || !this.mouzaData.features) {
      this.mouzas.set([]);
      return;
    }

    // Find the district feature
    const districtFeature = this.districtData?.features?.find(
      (f: any) => (f.properties["District N"] || f.properties.district) === this.selectedDistrict
    );

    if (!districtFeature) {
      this.mouzas.set([]);
      return;
    }

    // Filter mouzas that are in the selected district
    const filteredMouzas: string[] = [];
    
    this.mouzaData.features.forEach((f: any) => {
      try {
        const mouzaCentroid = this.getFeatureCentroid(f);
        if (this.isPointInPolygon(mouzaCentroid, districtFeature)) {
          const mouzaName = f.properties["Mouza Name"] || f.properties.subdistrict;
          if (mouzaName && !filteredMouzas.includes(mouzaName)) {
            filteredMouzas.push(mouzaName);
          }
        }
      } catch (error) {
        // Skip this mouza
      }
    });

    // Update signal - this will automatically trigger change detection
    this.mouzas.set(filteredMouzas.sort());
    console.log('Mouzas loaded for', this.selectedDistrict, ':', filteredMouzas.length);
  }

  private getFeatureCentroid(feature: any): any {
    const coordinates = feature.geometry.coordinates;
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    const processCoordinate = (coord: any[]) => {
      if (Array.isArray(coord) && coord.length >= 2 && typeof coord[0] === 'number') {
        const [lng, lat] = coord;
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }
    };

    if (feature.geometry.type === 'MultiPolygon') {
      coordinates.forEach((polygon: any) => {
        polygon.forEach((ring: any) => {
          ring.forEach(processCoordinate);
        });
      });
    } else if (feature.geometry.type === 'Polygon') {
      coordinates.forEach((ring: any) => {
        ring.forEach(processCoordinate);
      });
    }

    return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
  }

  private isPointInPolygon(point: any, polygonFeature: any): boolean {
    const lat = point.lat;
    const lng = point.lng;
    const coordinates = polygonFeature.geometry.coordinates;
    
    if (polygonFeature.geometry.type === 'MultiPolygon') {
      for (const polygon of coordinates) {
        if (this.isPointInPolygonRing(point, polygon[0], lat, lng)) {
          return true;
        }
      }
      return false;
    } else if (polygonFeature.geometry.type === 'Polygon') {
      const outerRing = coordinates[0];
      if (!this.isPointInPolygonRing(point, outerRing, lat, lng)) {
        return false;
      }
      for (let i = 1; i < coordinates.length; i++) {
        if (this.isPointInPolygonRing(point, coordinates[i], lat, lng)) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  private isPointInPolygonRing(point: any, ring: any[], lat: number, lng: number): boolean {
    let crossings = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      if (Math.abs(yi - yj) < 1e-10) continue;
      const crossesLatitude = (yi > lat) !== (yj > lat);
      if (crossesLatitude) {
        const edgeLng = (xj - xi) * (lat - yi) / (yj - yi) + xi;
        if (lng < edgeLng) {
          crossings++;
        }
      }
    }
    return crossings % 2 === 1;
  }
}

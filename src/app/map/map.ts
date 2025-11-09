import { Component, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-map',
  standalone: true,
  template: `<div id="map"></div>`,
  styles: [`
    #map {
      height: 83vh;
      width: 100%;
    }
  `]
})
export class MapComponent implements AfterViewInit {

  private map: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      await this.initMap();
    }
  }

  private async initMap(): Promise<void> {
    const L = await import('leaflet');
    
    // Fix missing default marker icons using local assets
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/assets/images/marker-icon-2x.png',
      iconUrl: '/assets/images/marker-icon.png',
      shadowUrl: '/assets/images/marker-shadow.png',
    });

    this.map = L.map('map', {
      center: [22.5726, 88.3639], // Kolkata, India
      zoom: 13
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    const marker = L.marker([22.5726, 88.3639]).addTo(this.map);
    marker.bindPopup('You are here!').openPopup();
  }
}

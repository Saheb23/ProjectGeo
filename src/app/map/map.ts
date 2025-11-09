import { Component, AfterViewInit, Inject, PLATFORM_ID, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { MapSelectionService } from '../map-selection.service';
import { Subscription } from 'rxjs';

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
export class MapComponent implements AfterViewInit, OnDestroy {

  private map: any;
  private L: any;
  private currentLayer: any = null;
  private activeLayer: any = null;
  private mouzaLayer: any = null;
  private currentMarker: any;
  private highlightedMouzaLayer: any = null;
  private highlightedMouzaMarker: any = null;

  // District and mouza data
  private districtData: any;
  private mouzaData: any;
  private selectedDistrictFeature: any = null;
  private geojsonLayer: any = null;

  // UI state
  selectedDistrict: string | null = null;
  selectedMouza: string | null = null;
  mouzaCount: number = 0;
  showInfoPanel: boolean = false;

  availableLayers = [
    { name: 'OpenStreetMap', label: 'OpenStreetMap' },
    { name: 'Satellite', label: 'Satellite' },
    { name: 'Terrain', label: 'Terrain' },
    { name: 'Google Streets', label: 'Google Streets' },
    { name: 'Google Satellite', label: 'Google Satellite' },
    { name: 'Google Hybrid', label: 'Google Hybrid' },
    { name: 'CartoDB Light', label: 'CartoDB Light' },
    { name: 'CartoDB Dark', label: 'CartoDB Dark' }
  ];

  currentLayerName: string = 'OpenStreetMap';
  private baseLayers: any = {};
  districtListItems: any[] = [];
  private subscriptions: Subscription[] = [];
  private districtLayerMap: Map<string, any> = new Map();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private mapSelectionService: MapSelectionService
  ) {}

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      await this.initMap();
      this.subscribeToSelections();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private subscribeToSelections(): void {
    // Listen to district selection from home page
    const districtSub = this.mapSelectionService.selectedDistrict$.subscribe(districtName => {
      if (districtName && this.districtLayerMap.has(districtName)) {
        const district = this.districtLayerMap.get(districtName);
        this.highlightDistrict(district.layer, districtName);
      }
    });

    // Listen to mouza selection from home page
    const mouzaSub = this.mapSelectionService.selectedMouza$.subscribe(mouzaName => {
      if (mouzaName) {
        // Try to find and highlight the mouza
        const highlightMouza = () => {
          if (this.mouzaLayer) {
            let found = false;
            this.mouzaLayer.eachLayer((layer: any) => {
              const feature = layer.feature;
              const name = feature.properties["Mouza Name"] || feature.properties.subdistrict;
              if (name === mouzaName) {
                this.selectedMouza = mouzaName;
                this.highlightMouza(feature, layer);
                this.cdr.detectChanges();
                found = true;
                return; // Found and highlighted
              }
            });
            return found;
          }
          return false;
        };

        // Try immediately
        if (!highlightMouza()) {
          // If mouza layer not ready, wait a bit and retry
          setTimeout(() => {
            highlightMouza();
          }, 500);
        }
      } else {
        // Clear mouza highlight when selection is cleared
        this.clearMouzaHighlight();
        this.selectedMouza = null;
        this.cdr.detectChanges();
      }
    });

    this.subscriptions.push(districtSub, mouzaSub);
  }

  private async initMap(): Promise<void> {
    this.L = await import('leaflet');
    
    // Fix missing default marker icons using local assets
    delete (this.L.Icon.Default.prototype as any)._getIconUrl;
    this.L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/assets/images/marker-icon-2x.png',
      iconUrl: '/assets/images/marker-icon.png',
      shadowUrl: '/assets/images/marker-shadow.png',
    });

    this.map = this.L.map('map', {
      center: [28.2, 94.5], // Center of Arunachal Pradesh
      zoom: 7,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      dragging: true
    });

    // Define different map layers
    this.baseLayers = {
      "OpenStreetMap": this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
        minZoom: 4
      }),
      
      "Satellite": this.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri',
        maxZoom: 18,
        minZoom: 4
      }),
      
      "Terrain": this.L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenTopoMap',
        maxZoom: 17,
        minZoom: 4
      }),
      
      "Google Streets": this.L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google',
        maxZoom: 20,
        minZoom: 4
      }),
      
      "Google Satellite": this.L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google',
        maxZoom: 20,
        minZoom: 4
      }),
      
      "Google Hybrid": this.L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google',
        maxZoom: 20,
        minZoom: 4
      }),
      
      "CartoDB Light": this.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB',
        maxZoom: 20,
        minZoom: 4
      }),
      
      "CartoDB Dark": this.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB',
        maxZoom: 20,
        minZoom: 4
      })
    };
    
    // Add the default layer
    this.baseLayers["Satellite"].addTo(this.map);
    this.currentLayer = this.baseLayers["Satellite"];
    
    // Add layer control
    this.L.control.layers(this.baseLayers).addTo(this.map);
    
    // Add scale control
    this.L.control.scale().addTo(this.map);
    
    // Add My Location button
    this.addMyLocationControl();

    // Ensure map resizes properly
    setTimeout(() => {
      this.map.invalidateSize();
    }, 100);

    // For demo purposes, create sample district data
    // In production, you would load this from a GeoJSON file
    this.initDistrictData();
  }

  switchLayer(layerName: string): void {
    if (this.currentLayer) {
      this.map.removeLayer(this.currentLayer);
    }
    
    if (this.baseLayers[layerName]) {
      this.currentLayer = this.baseLayers[layerName];
      this.map.addLayer(this.currentLayer);
      this.currentLayerName = layerName;
    }
  }

  addMyLocationControl(): void {
    const myLocationControl = this.L.Control.extend({
      onAdd: (map: any) => {
        const container = this.L.DomUtil.create('div', 'my-location-control');
        const button = this.L.DomUtil.create('button', 'my-location-btn');
        button.innerHTML = '📍';
        button.title = 'Go to my location';
        button.style.cssText = `
          width: 40px;
          height: 40px;
          background: white;
          border: 2px solid rgba(0,0,0,0.2);
          border-radius: 4px;
          cursor: pointer;
          font-size: 20px;
          box-shadow: 0 1px 5px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        `;

        this.L.DomEvent.disableClickPropagation(button);
        
        button.addEventListener('click', () => {
          this.getCurrentLocation();
        });

        container.appendChild(button);
        return container;
      }
    });

    new myLocationControl({ position: 'topright' }).addTo(this.map);
  }

  getCurrentLocation(): void {
    if (!navigator.geolocation) {
      console.log('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (this.currentMarker) {
          this.map.removeLayer(this.currentMarker);
        }

        this.currentMarker = this.L.marker([lat, lng], {
          icon: this.L.divIcon({
            className: 'current-location-marker',
            html: '<div style="background-color: blue; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(this.map);

        this.currentMarker.bindPopup('Your current location').openPopup();
        this.map.setView([lat, lng], 15);
      },
      (error) => {
        console.log('Error getting user location:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }

  hideInfoPanel(): void {
    this.showInfoPanel = false;
    this.cdr.detectChanges();
  }

  filteredDistricts: any[] = [];
  searchQuery: string = '';

  filterDistricts(event: any): void {
    this.searchQuery = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredDistricts = this.districtListItems.filter(d => 
      d.name.toLowerCase().includes(this.searchQuery)
    );
  }

  getDisplayDistricts(): any[] {
    if (!this.searchQuery) {
      return this.districtListItems;
    }
    return this.filteredDistricts.length > 0 ? this.filteredDistricts : this.districtListItems;
  }

  // Load district data from assets
  private async initDistrictData(): Promise<void> {
    await this.loadDistrictData();
  }

  private createSampleDistricts(): void {
    // Create sample district polygons (simple rectangles for demo)
    const sampleDistricts = [
      { name: 'Itanagar', bounds: [[28.0, 93.5], [28.5, 94.0]] },
      { name: 'Tawang', bounds: [[27.5, 91.5], [28.0, 92.5]] },
      { name: 'Bomdila', bounds: [[27.0, 92.5], [27.5, 93.5]] },
      { name: 'Changlang', bounds: [[27.0, 95.5], [27.5, 96.5]] },
      { name: 'Anjaw', bounds: [[27.5, 95.0], [28.0, 96.0]] },
      { name: 'Kamle', bounds: [[26.5, 94.0], [27.0, 95.0]] },
      { name: 'Dibang Valley', bounds: [[28.0, 95.5], [28.5, 96.5]] },
      { name: 'East Kameng', bounds: [[26.5, 93.0], [27.0, 94.0]] }
    ];

    const features = sampleDistricts.map(dist => {
      const [sw, ne] = dist.bounds;
      return {
        type: 'Feature',
        properties: {
          'District N': dist.name,
          district: dist.name
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [sw[1], sw[0]],
            [ne[1], sw[0]],
            [ne[1], ne[0]],
            [sw[1], ne[0]],
            [sw[1], sw[0]]
          ]]
        }
      };
    });

    this.districtData = {
      type: "FeatureCollection",
      features
    };

    this.mouzaData = {
      type: "FeatureCollection",
      features: []
    };
  }

  private async loadDistrictData(): Promise<void> {
    try {
      // Load JavaScript files that export variables
      // These files export json_ArunachalPradeshDistricts_2 and json_ArunachalPradeshMouza_1
      
      // Load district script
      await this.loadScript('/assets/data/ArunachalPradeshDistricts_2.js');
      
      // Load mouza script
      await this.loadScript('/assets/data/ArunachalPradeshMouza_1.js');
      
      // Access the global variables that were declared in the JS files
      this.districtData = (window as any).json_ArunachalPradeshDistricts_2;
      this.mouzaData = (window as any).json_ArunachalPradeshMouza_1;
      
      if (!this.districtData) {
        console.error('District data not found. Make sure the JS file exports json_ArunachalPradeshDistricts_2');
        throw new Error('District data not loaded');
      }
      if (!this.mouzaData) {
        console.warn('Mouza data not found. Make sure the JS file exports json_ArunachalPradeshMouza_1');
      }
      
      this.setupDistrictLayer();
    } catch (error) {
      console.error('Error loading data files:', error);
      // Fall back to sample data if real data fails
      console.log('Falling back to sample data...');
      this.createSampleDistricts();
      this.setupDistrictLayer();
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  private setupDistrictLayer(): void {
    if (!this.districtData || !this.districtData.features) return;

    const districtMap = new Map<string, any>();

    this.geojsonLayer = this.L.geoJSON(this.districtData, {
      style: { color: "blue", weight: 1, fillOpacity: 0.1 },
      onEachFeature: (feature: any, layer: any) => {
        const name = feature.properties["District N"] || feature.properties.district;
        districtMap.set(name, layer);
        
        layer.on('click', () => {
          this.highlightDistrict(layer, name);
        });
      }
    }).addTo(this.map);

    // Populate district list items for Angular template
    this.districtListItems = Array.from(districtMap.entries()).map(([name, layer]) => ({
      name,
      layer
    })).sort((a, b) => a.name.localeCompare(b.name));
    
    // Store district layer map for service-based selection
    this.districtListItems.forEach(district => {
      this.districtLayerMap.set(district.name, district);
    });
    
    this.cdr.detectChanges();
  }

  selectedDistrictName: string | null = null;

  selectDistrict(district: any): void {
    this.selectedDistrictName = district.name;
    this.highlightDistrict(district.layer, district.name);
  }

  isDistrictActive(districtName: string): boolean {
    return districtName === this.selectedDistrictName;
  }

  highlightDistrict(layer: any, districtName: string): void {
    // Reset previous active layer
    if (this.activeLayer && this.geojsonLayer) {
      this.geojsonLayer.resetStyle(this.activeLayer);
    }
    
    // Clear previously selected mouza when district is clicked
    this.clearMouzaHighlight();
    this.selectedMouza = null;
    // Also clear selection in service
    this.mapSelectionService.selectMouza(null);
    
    // Highlight the selected district
    layer.setStyle({ 
      color: "red", 
      weight: 3, 
      fillColor: "red", 
      fillOpacity: 0.3 
    });
    
    // Fit bounds with padding
    const bounds = layer.getBounds();
    this.map.fitBounds(bounds, {
      padding: [20, 20],
      maxZoom: 12
    });
    
    this.activeLayer = layer;
    this.selectedDistrictFeature = layer.feature;
    this.selectedDistrict = districtName;
    this.showInfoPanel = true;

    // Update mouza display
    this.loadMouzasForDistrict(districtName, layer);
    
    // Trigger change detection
    this.cdr.detectChanges();
  }

  private loadMouzasForDistrict(districtName: string, districtLayer: any): void {
    if (!this.mouzaData || !this.mouzaData.features) return;

    // Clear previous mouzas
    if (this.mouzaLayer) {
      this.map.removeLayer(this.mouzaLayer);
    }
    this.mouzaCount = 0;

    const districtFeature = districtLayer.feature;
    const districtBounds = districtLayer.getBounds();

    console.log('Selected district:', districtName);
    console.log('District bounds:', districtBounds);
    console.log('District feature:', districtFeature);

    // Load Mouza GeoJSON with polygon-based filtering (similar to HTML file)
    this.mouzaLayer = this.L.geoJSON(this.mouzaData, {
      filter: (f: any) => {
        const mouzaName = f.properties["Mouza Name"] || f.properties.subdistrict || "Unknown";
        
        try {
          // Get Mouza centroid (center point)
          const mouzaCentroid = this.getFeatureCentroid(f);
          
          // Use proper polygon-based filtering instead of bounds
          const isCentroidInDistrict = this.isPointInPolygon(mouzaCentroid, districtFeature);
          
          if (isCentroidInDistrict) {
            console.log(`✓ Mouza "${mouzaName}" is within district polygon`);
            return true;
          } else {
            console.log(`✗ Mouza "${mouzaName}" is outside district polygon`);
            return false;
          }
          
        } catch (error) {
          console.warn('Error processing Mouza:', mouzaName, error);
          // Fallback to bounds checking if polygon check fails
          try {
            const mouzaCentroid = this.getFeatureCentroid(f);
            const isInBounds = districtBounds.contains(mouzaCentroid);
            console.log(`Fallback bounds check for Mouza "${mouzaName}":`, isInBounds);
            return isInBounds;
          } catch (fallbackError) {
            console.warn('Fallback also failed:', fallbackError);
            return false;
          }
        }
      },
      style: { color: "green", weight: 1, fillOpacity: 0.2 },
      onEachFeature: (feature: any, layer: any) => {
        const mouzaName = feature.properties["Mouza Name"] || feature.properties.subdistrict;
        layer.on('click', () => {
          this.selectedMouza = mouzaName;
          this.highlightMouza(feature, layer);
          this.cdr.detectChanges();
        });
        this.mouzaCount++;
      }
    }).addTo(this.map);

    console.log(`Found ${this.mouzaCount} Mouzas in ${districtName} using polygon filtering`);
    this.updateInfoPanel();
  }

  private getFeatureCentroid(feature: any): any {
    // Calculate centroid (center point) from GeoJSON feature
    // This is similar to turf.centroid but using our own calculation
    const bounds = this.getFeatureBounds(feature);
    return bounds.getCenter();
  }

  private isPointInLayer(point: any, layer: any): boolean {
    // For GeoJSON layers (which is what we have), always check the feature
    if (layer.feature) {
      return this.isPointInPolygon(point, layer.feature);
    }
    
    // For direct polygon layers, use latlngs
    if (layer.getLatLngs && typeof layer.getLatLngs === 'function') {
      try {
        return this.isPointInPolygonLayer(point, layer);
      } catch (e) {
        // Fallback to bounds check
      }
    }
    
    // Fallback: check bounds (less accurate but better than nothing)
    if (layer.getBounds && typeof layer.getBounds === 'function') {
      return layer.getBounds().contains(point);
    }
    
    return false;
  }

  private isPointInPolygonLayer(point: any, polygonLayer: any): boolean {
    // Get all latlngs from the polygon layer
    const latlngs = polygonLayer.getLatLngs();
    
    // Handle MultiPolygon
    if (Array.isArray(latlngs[0]) && Array.isArray(latlngs[0][0])) {
      // It's a MultiPolygon - check each polygon
      for (const polygon of latlngs) {
        if (this.isPointInPolygonLatLngs(point, polygon[0])) {
          return true;
        }
      }
      return false;
    } else {
      // It's a single Polygon
      return this.isPointInPolygonLatLngs(point, latlngs[0]);
    }
  }

  private isPointInPolygonLatLngs(point: any, latlngs: any[]): boolean {
    // Ray casting algorithm for Leaflet LatLng array
    let inside = false;
    const lat = point.lat;
    const lng = point.lng;

    for (let i = 0, j = latlngs.length - 1; i < latlngs.length; j = i++) {
      const xi = latlngs[i].lng, yi = latlngs[i].lat;
      const xj = latlngs[j].lng, yj = latlngs[j].lat;

      // Skip horizontal edges
      if (yi === yj) continue;

      // Check if edge crosses the horizontal line at point's latitude
      const crossesLatitude = (yi > lat) !== (yj > lat);

      if (crossesLatitude) {
        // Calculate longitude where edge crosses the latitude line
        const edgeLng = (xj - xi) * (lat - yi) / (yj - yi) + xi;

        // Check if intersection point is to the right of the point
        if (lng < edgeLng) {
          inside = !inside;
        }
      }
    }

    return inside;
  }

  private getFeatureBounds(feature: any): any {
    // Calculate bounds from GeoJSON feature coordinates
    const coordinates = feature.geometry.coordinates;
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    const processCoordinate = (coord: any[]) => {
      // GeoJSON coordinates are [lng, lat]
      if (Array.isArray(coord) && coord.length >= 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number') {
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

    // Create a Leaflet LatLngBounds object
    return this.L.latLngBounds(
      [minLat, minLng],
      [maxLat, maxLng]
    );
  }

  private isPointInPolygon(point: any, polygonFeature: any): boolean {
    // Ray casting algorithm to check if point is inside polygon
    // Note: GeoJSON coordinates are [lng, lat] format
    const lat = point.lat;
    const lng = point.lng;
    
    const coordinates = polygonFeature.geometry.coordinates;
    
    // Handle MultiPolygon - check each polygon separately
    if (polygonFeature.geometry.type === 'MultiPolygon') {
      // For MultiPolygon: point is inside if it's inside ANY of the polygons
      for (const polygon of coordinates) {
        if (this.isPointInPolygonRing(point, polygon[0], lat, lng)) {
          return true;
        }
      }
      return false;
    } 
    // Handle Polygon - check outer ring, exclude holes
    else if (polygonFeature.geometry.type === 'Polygon') {
      const outerRing = coordinates[0];
      // Point must be inside outer ring
      if (!this.isPointInPolygonRing(point, outerRing, lat, lng)) {
        return false;
      }
      
      // Check if point is in any hole (if so, it's outside)
      for (let i = 1; i < coordinates.length; i++) {
        if (this.isPointInPolygonRing(point, coordinates[i], lat, lng)) {
          return false; // Point is in a hole, so it's outside
        }
      }
      return true;
    }
    
    return false;
  }

  private isPointInPolygonRing(point: any, ring: any[], lat: number, lng: number): boolean {
    let crossings = 0;
    
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      // GeoJSON: [lng, lat]
      const xi = ring[i][0], yi = ring[i][1]; // lng, lat
      const xj = ring[j][0], yj = ring[j][1]; // lng, lat
      
      // Skip horizontal edges
      if (Math.abs(yi - yj) < 1e-10) continue;
      
      // Check if edge crosses the horizontal line at point's latitude
      const crossesLatitude = (yi > lat) !== (yj > lat);
      
      if (crossesLatitude) {
        // Calculate longitude where edge crosses the latitude line
        const edgeLng = (xj - xi) * (lat - yi) / (yj - yi) + xi;
        
        // Check if intersection point is to the right of the point
        if (lng < edgeLng) {
          crossings++;
        }
      }
    }
    
    // Odd number of crossings means point is inside
    return crossings % 2 === 1;
  }

  private highlightMouza(feature: any, layer: any): void {
    this.clearMouzaHighlight();
    
    this.highlightedMouzaLayer = this.L.geoJSON(feature, {
      style: {
        color: '#ff6b35',
        weight: 4,
        fillColor: '#ff6b35',
        fillOpacity: 0.3
      }
    }).addTo(this.map);
    
    this.cdr.detectChanges();
  }

  private clearMouzaHighlight(): void {
    if (this.highlightedMouzaLayer) {
      this.map.removeLayer(this.highlightedMouzaLayer);
      this.highlightedMouzaLayer = null;
    }
  }

  private updateInfoPanel(): void {
    this.cdr.detectChanges();
  }
}

import { Component, AfterViewInit, Inject, PLATFORM_ID, ChangeDetectorRef, OnDestroy, ViewEncapsulation, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { MapSelectionService } from '../map-selection.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div id="map"></div>
    <div *ngIf="showInfoPanel" id="infoPanel" class="info-panel" style="position: fixed !important; bottom: 20px !important; right: 20px !important; width: 250px !important; background: white !important; border: 2px solid #0066cc !important; border-radius: 8px !important; padding: 15px !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important; z-index: 99999 !important;">
      <button (click)="hideInfoPanel()" style="position: absolute; top: 8px; right: 8px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer;">×</button>
      <h4 style="margin: 0 0 12px 0; color: #0066cc; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 8px; padding-right: 30px;">Selected Information</h4>
      <div style="margin: 8px 0; font-size: 13px;">
        <strong style="color: #333; display: inline-block; width: 90px;">State:</strong> 
        <span style="color: #666;">Arunachal Pradesh</span>
      </div>
      <div style="margin: 8px 0; font-size: 13px;">
        <strong style="color: #333; display: inline-block; width: 90px;">District:</strong> 
        <span id="selectedDistrict" style="color: #0066cc; font-weight: bold;">{{ selectedDistrict || 'None' }}</span>
      </div>
      <div style="margin: 8px 0; font-size: 13px;">
        <strong style="color: #333; display: inline-block; width: 90px;">Mouza Count:</strong> 
        <span id="mouzaCount" style="color: #28a745; font-weight: bold;">{{ mouzaCount }}</span>
      </div>
      <div style="margin: 8px 0; font-size: 13px;">
        <strong style="color: #333; display: inline-block; width: 90px;">Selected Mouza:</strong> 
        <span id="selectedMouza" style="color: #dc3545; font-weight: bold;">{{ selectedMouza || 'None' }}</span>
      </div>
    </div>
  `,
  styles: [`
    #map {
      height: 83vh;
      width: 100%;
    }
    .info-panel {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 250px;
      background: rgba(255, 255, 255, 0.95);
      border: 2px solid #0066cc;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      font-family: Arial, sans-serif;
      backdrop-filter: blur(5px);
    }
    
    .info-panel h4 {
      margin: 0 0 12px 0;
      color: #0066cc;
      font-size: 16px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 8px;
      padding-right: 30px;
    }

    .info-item {
      margin: 8px 0;
      font-size: 13px;
      line-height: 1.4;
    }
    
    .info-item strong {
      color: #333;
      display: inline-block;
      width: 90px;
    }
    
    .info-item span {
      color: #666;
    }

    #selectedDistrict {
      color: #0066cc;
      font-weight: bold;
    }

    #mouzaCount {
      color: #28a745;
      font-weight: bold;
    }

    #selectedMouza {
      color: #dc3545;
      font-weight: bold;
    }

    /* Close button styles */
    #closeInfoPanel {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    }
    
    #closeInfoPanel:hover {
      background: #c82333;
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
  private isHighlighting: boolean = false;
  
  // Map initialization state
  isMapReady: boolean = false;

  availableLayers = [
    { name: 'OpenStreetMap', label: 'OpenStreetMap' },
    { name: 'Satellite', label: 'Satellite' },
    // { name: 'Terrain', label: 'Terrain' },
    { name: 'Google Streets', label: 'Google Streets' },
    // { name: 'Google Satellite', label: 'Google Satellite' },
    // { name: 'Google Hybrid', label: 'Google Hybrid' },
    // { name: 'CartoDB Light', label: 'CartoDB Light' },
    { name: 'CartoDB Dark', label: 'CartoDB Dark' }
  ];

  currentLayerName: string = 'Satellite';
  private baseLayers: any = {};
  districtListItems: any[] = [];
  private subscriptions: Subscription[] = [];
  private districtLayerMap: Map<string, any> = new Map();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private mapSelectionService: MapSelectionService,
    private ngZone: NgZone
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

    // Listen to layer selection from home page
    const layerSub = this.mapSelectionService.selectedLayer$.subscribe(layerName => {
      if (layerName) {
        console.log('Map component received layer change request:', layerName);
        this.switchLayer(layerName);
      }
    });

    this.subscriptions.push(districtSub, mouzaSub, layerSub);
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
    this.currentLayerName = 'Satellite';
    
    // Note: Layer control is commented out since we're using custom buttons
    // If you want to use Leaflet's built-in layer control, uncomment this line
    // this.L.control.layers(this.baseLayers).addTo(this.map);
    
    // Add scale control
    this.L.control.scale().addTo(this.map);
    
    // Add My Location button
    this.addMyLocationControl();

    // Ensure map resizes properly
    setTimeout(() => {
      this.map.invalidateSize();
    }, 100);

    // Mark map as ready
    this.isMapReady = true;

    // For demo purposes, create sample district data
    // In production, you would load this from a GeoJSON file
    this.initDistrictData();
  }

  switchLayer(layerName: string): void {
    console.log(`switchLayer called in MapComponent with: ${layerName}`);
    console.log(`isMapReady: ${this.isMapReady}, map exists: ${!!this.map}`);
    
    if (!this.isMapReady || !this.map) {
      console.warn('Map is not initialized yet. Please wait...');
      // Retry after a short delay if map is still initializing
      setTimeout(() => {
        if (this.isMapReady && this.map) {
          this.switchLayer(layerName);
        } else {
          console.error('Map still not ready after retry');
        }
      }, 200);
      return;
    }
    
    if (!this.baseLayers || Object.keys(this.baseLayers).length === 0) {
      console.warn('Base layers not initialized yet');
      setTimeout(() => {
        if (this.baseLayers && Object.keys(this.baseLayers).length > 0) {
          this.switchLayer(layerName);
        }
      }, 200);
      return;
    }
    
    if (!this.baseLayers[layerName]) {
      console.warn(`Layer "${layerName}" not found. Available layers:`, Object.keys(this.baseLayers));
      return;
    }
    
    try {
      // Remove current layer if it exists
      if (this.currentLayer && this.map.hasLayer(this.currentLayer)) {
        this.map.removeLayer(this.currentLayer);
        console.log('Removed current layer');
      }
      
      // Add new layer
      this.currentLayer = this.baseLayers[layerName];
      this.map.addLayer(this.currentLayer);
      this.currentLayerName = layerName;
      
      // Force map to redraw
      this.map.invalidateSize();
      
      console.log(`Successfully switched to layer: ${layerName}`);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error switching layer:', error);
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
    console.log('hideInfoPanel called, current showInfoPanel:', this.showInfoPanel);
    this.showInfoPanel = false;
    console.log('showInfoPanel set to:', this.showInfoPanel);
    
    // Force change detection
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    
    // Also trigger in next tick to ensure it's applied
    setTimeout(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      console.log('Panel should be hidden now, showInfoPanel:', this.showInfoPanel);
    }, 0);
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
          this.ngZone.run(() => {
            this.highlightDistrict(layer, name);
          });
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
    // Prevent recursive calls
    if (this.isHighlighting && this.selectedDistrict === districtName) {
      return;
    }
    
    this.isHighlighting = true;
    
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
    
    // Force show info panel - do this FIRST
    this.showInfoPanel = true;
    console.log('highlightDistrict called for:', districtName);
    console.log('showInfoPanel set to:', this.showInfoPanel);
    console.log('selectedDistrict:', this.selectedDistrict);

    // Update mouza display
    this.loadMouzasForDistrict(districtName, layer);
    
    // Force change detection immediately in Angular zone
    this.ngZone.run(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      console.log('Change detection in ngZone, showInfoPanel:', this.showInfoPanel);
    });
    
    // Notify service AFTER change detection to update dropdowns
    // This ensures panel is shown first
    setTimeout(() => {
      this.mapSelectionService.selectDistrict(districtName);
      this.isHighlighting = false;
    }, 100);
    
    // Also trigger delayed change detection
    setTimeout(() => {
      this.ngZone.run(() => {
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        console.log('Delayed change detection, showInfoPanel:', this.showInfoPanel);
        const panel = document.getElementById('infoPanel');
        console.log('Panel element exists:', !!panel);
        if (panel) {
          console.log('Panel display style:', window.getComputedStyle(panel).display);
          console.log('Panel visibility:', window.getComputedStyle(panel).visibility);
        }
      });
    }, 200);
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
          this.ngZone.run(() => {
            this.selectedMouza = mouzaName;
            this.highlightMouza(feature, layer);
            // Notify service to update dropdown
            this.mapSelectionService.selectMouza(mouzaName);
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
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
    
    // Ensure info panel is visible when mouza is selected
    this.showInfoPanel = true;
    console.log('Mouza clicked, showInfoPanel:', this.showInfoPanel);
    
    // Update info panel with mouza information
    this.updateInfoPanel();
    
    // Force change detection
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    
    setTimeout(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      console.log('Mouza change detection triggered, showInfoPanel:', this.showInfoPanel);
    }, 10);
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

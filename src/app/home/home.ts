import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, signal, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MapComponent } from '../map/map';
import { MapSelectionService } from '../map-selection.service';

type ProjectDocument = {
  label: string;
  url: string;
};

type Project = {
  id: string;
  name: string;
  startDate: string;
  address: string;
  contactPhone: string;
  budget: string;
  description: string;
  siteImages: string[];
  documents: ProjectDocument[];
};

@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule, MapComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})

 
export class Home implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(MapComponent) mapComponent!: MapComponent;
  
  districts = signal<string[]>([]);
  mouzas = signal<string[]>([]);
  selectedDistrict: string = '';
  selectedMouza: string = '';
  
  // Map layer properties
  availableLayers = signal<Array<{name: string, label: string, icon: string}>>([]);
  currentLayerName = signal<string>('Satellite');

  private districtData: any;
  private mouzaData: any;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private mapSelectionService: MapSelectionService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      await this.loadData();
    }
  }

  ngAfterViewInit(): void {
    // Wait a bit for map component to initialize
    const checkMapComponent = () => {
      if (this.mapComponent && this.mapComponent.availableLayers && this.mapComponent.availableLayers.length > 0) {
        // Sync available layers from map component
        this.availableLayers.set(this.mapComponent.availableLayers.map(layer => ({
          name: layer.name,
          label: layer.label,
          icon: this.getLayerIcon(layer.name)
        })));
        // Sync current layer
        this.currentLayerName.set(this.mapComponent.currentLayerName);
        this.cdr.detectChanges();
        console.log('Map component initialized, layers synced:', this.availableLayers().length);
      } else {
        // Retry if map component not ready yet
        setTimeout(checkMapComponent, 100);
      }
    };
    setTimeout(checkMapComponent, 100);
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  switchLayer(layerName: string): void {
    console.log('switchLayer called with:', layerName);
    
    // Update current layer name in home component
    this.currentLayerName.set(layerName);
    
    // Notify map component via service
    this.mapSelectionService.selectLayer(layerName);
    
    // Also try direct method call as fallback
    if (this.mapComponent) {
      try {
        this.mapComponent.switchLayer(layerName);
      } catch (error) {
        console.error('Error calling mapComponent.switchLayer directly:', error);
      }
    }
    
    this.cdr.detectChanges();
  }

  getLayerIcon(layerName: string): string {
    const iconMap: { [key: string]: string } = {
      'OpenStreetMap': 'fa-map',
      'Satellite': 'fa-earth-asia',
      'Terrain': 'fa-mountain',
      'Google Streets': 'fa-road',
      'Google Satellite': 'fa-satellite',
      'Google Hybrid': 'fa-layer-group',
      'CartoDB Light': 'fa-sun',
      'CartoDB Dark': 'fa-moon'
    };
    return iconMap[layerName] || 'fa-map';
  }

  isLayerActive(layerName: string): boolean {
    return this.currentLayerName() === layerName;
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



  protected projects: Project[] = [
    {
      id: 'p-001',
      name: 'Riverfront Redevelopment',
      startDate: 'March 12, 2024',
      address: '123 Riverside Dr, Springfield, IL',
      contactPhone: '+1 (555) 815-2234',
      budget: '$8.2M',
      description:
        'Mixed-use redevelopment of the old industrial riverfront into a walkable commercial hub with green public spaces.',
      siteImages: [
        'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
      ],
      documents: [
        { label: 'Executive Summary.pdf', url: '#' },
        { label: 'Environmental Report.pdf', url: '#' },
        { label: 'Community Briefing.pptx', url: '#' },
      ],
    },
    {
      id: 'p-002',
      name: 'North Ridge Solar Farm',
      startDate: 'January 5, 2025',
      address: '88 Solstice Way, Flagstaff, AZ',
      contactPhone: '+1 (555) 661-9087',
      budget: '$14.6M',
      description:
        'Construction of a 25MW solar farm providing clean energy to over 6,000 homes with battery storage capabilities.',
      siteImages: [
        'https://images.unsplash.com/photo-1509395176047-4a66953fd231?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1505739649139-70c3b40607c0?auto=format&fit=crop&w=1200&q=80',
      ],
      documents: [
        { label: 'Site Layout.dwg', url: '#' },
        { label: 'Power Purchase Agreement.pdf', url: '#' },
      ],
    },
    {
      id: 'p-003',
      name: 'Central Transit Hub',
      startDate: 'July 21, 2023',
      address: '501 Main St, Austin, TX',
      contactPhone: '+1 (555) 300-4411',
      budget: '$22.4M',
      description:
        'Upgrade and expansion of the downtown transit interchange with integrated bus, tram, and micro-mobility services.',
      siteImages: [
        'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1447433865958-f402f562b843?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1468078809804-4c7b3e60a478?auto=format&fit=crop&w=1200&q=80',
      ],
      documents: [
        { label: 'Construction Schedule.xlsx', url: '#' },
        { label: 'Stakeholder MoU.pdf', url: '#' },
        { label: 'Safety Compliance Checklist.pdf', url: '#' },
      ],
    },
    {
      id: 'p-004',
      name: 'Harbor Flood Mitigation',
      startDate: 'September 18, 2024',
      address: '42 Seawall Ave, Charleston, SC',
      contactPhone: '+1 (555) 982-4710',
      budget: '$11.8M',
      description:
        'Installation of adaptive flood barriers and wetland restoration to protect the harbor district from storm surges.',
      siteImages: [
        'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
      ],
      documents: [
        { label: 'Hydrology Report.pdf', url: '#' },
        { label: 'Barrier Specs.dwg', url: '#' },
      ],
    },
    {
      id: 'p-005',
      name: 'Innovation Campus Expansion',
      startDate: 'May 2, 2025',
      address: '200 Labs Way, Boulder, CO',
      contactPhone: '+1 (555) 742-1130',
      budget: '$36.0M',
      description:
        'Development of new R&D labs, collaborative workspaces, and sustainability upgrades across the tech campus.',
      siteImages: [
        'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1543248939-ff40856f65d4?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1467238307002-480ffdd70ab5?auto=format&fit=crop&w=1200&q=80',
      ],
      documents: [
        { label: 'Master Plan.pdf', url: '#' },
        { label: 'Tenant Fit-Out Guidelines.pdf', url: '#' },
        { label: 'LEED Checklist.xlsx', url: '#' },
      ],
    },
    {
      id: 'p-006',
      name: 'South Ridge Wind Extension',
      startDate: 'November 30, 2023',
      address: 'Palmer Trail, Cheyenne, WY',
      contactPhone: '+1 (555) 663-9051',
      budget: '$19.5M',
      description:
        'Expansion of the existing wind farm with 14 new turbines and upgraded transmission infrastructure.',
      siteImages: [
        'https://images.unsplash.com/photo-1509395176047-4a66953fd231?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
      ],
      documents: [
        { label: 'Turbine Layout.kmz', url: '#' },
        { label: 'Maintenance Plan.pdf', url: '#' },
      ],
    },
  ];

  protected selectedProject: Project | null = null;
  protected searchTerm = '';
  protected activeImageIndex = 0;

  protected get filteredProjects(): Project[] {
    const keyword = this.searchTerm.trim().toLowerCase();
    if (!keyword) {
      return this.projects;
    }

    return this.projects.filter((project) => this.matchesKeyword(project, keyword));
  }

  protected selectProject(project: Project): void {
    this.selectedProject = project;
    this.activeImageIndex = 0;
  }

  protected clearSelection(): void {
    this.selectedProject = null;
    this.activeImageIndex = 0;
  }

  protected setActiveImage(index: number): void {
    this.activeImageIndex = index;
  }

  private matchesKeyword(project: Project, keyword: string): boolean {
    return (
      project.name.toLowerCase().includes(keyword) ||
      project.address.toLowerCase().includes(keyword) ||
      project.startDate.toLowerCase().includes(keyword) ||
      project.contactPhone.toLowerCase().includes(keyword) ||
      project.budget.toLowerCase().includes(keyword)
    );
}
}

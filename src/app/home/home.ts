import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MapComponent } from '../map/map';

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
export class Home {
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
        'https://images.unsplash.com/photo-1529429617124-aee1aa7c9890?auto=format&fit=crop&w=1200&q=80',
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

import { Routes } from '@angular/router';
import { MapComponent } from './map/map';
import { Home } from './home/home';

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'home', component: Home },
    { path: 'map', component: MapComponent },
];

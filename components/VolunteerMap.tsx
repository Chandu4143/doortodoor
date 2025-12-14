
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { Building2, User, AlertTriangle } from 'lucide-react';
import { Apartment } from '../types';
import { FloorClaim } from '../services/supabase/floorClaimService';
import { HelpRequest } from '../services/supabase/helpRequestService';

// --- Custom Icons ---
const createIcon = (icon: React.ReactNode, color: string, className: string = '') => {
    const html = renderToStaticMarkup(
        <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-lg ${color} ${className}`}>
            {icon}
        </div>
    );
    return L.divIcon({
        html,
        className: 'bg-transparent',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
};

const apartmentIcon = createIcon(<Building2 size={18} className="text-white" />, 'bg-slate-700');
const volunteerIcon = createIcon(<User size={18} className="text-white" />, 'bg-blue-600');
const alertIcon = createIcon(<AlertTriangle size={18} className="text-white" />, 'bg-red-600 animate-pulse');

interface VolunteerMapProps {
    apartments: Apartment[];
    claims: FloorClaim[]; // Used to show where volunteers are
    helpRequests: HelpRequest[];
    center?: [number, number];
}

// Helper to auto-fit bounds
function BoundsHandler({ locations }: { locations: [number, number][] }) {
    const map = useMap();
    useEffect(() => {
        if (locations.length > 0) {
            const bounds = L.latLngBounds(locations);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
    }, [locations, map]);
    return null;
}

export default function VolunteerMap({ apartments, claims, helpRequests, center = [12.9716, 77.5946] }: VolunteerMapProps) {
    // 1. Map Apartments
    // 2. Map Active Claims (Volunteers) -> If apartment has coords, offset slightly?
    // 3. Map Help Requests -> If coords exist, use them. Else fallback to apartment.

    // Filter items with valid locations
    const validApartments = apartments.filter(a => a.latitude && a.longitude);

    // For volunteers, we map them to the apartment they have claimed a floor in
    const volunteerMarkers = claims.map(claim => {
        const apt = apartments.find(a => a.id === claim.apartment_id);
        if (!apt || !apt.latitude || !apt.longitude) return null;

        // Add tiny random jitter so markers don't overlap perfectly
        const lat = apt.latitude + (Math.random() - 0.5) * 0.0005;
        const lng = apt.longitude + (Math.random() - 0.5) * 0.0005;

        return {
            ...claim,
            lat,
            lng,
            apartmentName: apt.name
        };
    }).filter(Boolean);

    // Collect all points for bounds
    const allPoints: [number, number][] = [
        ...validApartments.map(a => [a.latitude!, a.longitude!] as [number, number]),
        ...helpRequests.filter(h => h.latitude && h.longitude).map(h => [h.latitude!, h.longitude!] as [number, number])
    ];

    if (allPoints.length === 0) {
        // Fallback if no data
        allPoints.push(center);
    }

    return (
        <div className="h-[500px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm z-0 relative">
            <MapContainer
                center={center}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                <BoundsHandler locations={allPoints} />

                {/* Apartments */}
                {validApartments.map(apt => (
                    <Marker key={apt.id} position={[apt.latitude!, apt.longitude!]} icon={apartmentIcon}>
                        <Popup>
                            <div className="font-sans">
                                <h3 className="font-bold text-sm">{apt.name}</h3>
                                <p className="text-xs text-slate-500">{apt.floors} Floors • {apt.unitsPerFloor * apt.floors} Units</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Volunteers (Floor Claims) */}
                {volunteerMarkers.map((vol: any) => (
                    <Marker key={vol.id} position={[vol.lat, vol.lng]} icon={volunteerIcon}>
                        <Popup>
                            <div className="font-sans">
                                <h3 className="font-bold text-sm text-blue-600">{vol.profiles?.name || 'Volunteer'}</h3>
                                <p className="text-xs text-slate-500">Working @ {vol.apartmentName}</p>
                                <p className="text-xs text-slate-400">Floor {vol.floor}</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Help Requests */}
                {helpRequests.map(req => {
                    if (!req.latitude || !req.longitude) return null;
                    return (
                        <Marker key={req.id} position={[req.latitude, req.longitude]} icon={alertIcon} zIndexOffset={1000}>
                            <Popup>
                                <div className="font-sans">
                                    <h3 className="font-bold text-sm text-red-600">HELP NEEDED</h3>
                                    <p className="text-xs font-bold">{req.profiles?.name}</p>
                                    <p className="text-xs italic my-1">"{req.message}"</p>
                                    <p className="text-[10px] text-slate-400">
                                        {new Date(req.created_at).toLocaleTimeString()}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

            </MapContainer>
        </div>
    );
}


import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Apartment } from '../types';
import L from 'leaflet';

// Fix for default marker icon missing in React Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface CampaignMapProps {
    apartments: Apartment[];
    onSelectApartment: (aptId: string) => void;
}

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
}

export default function CampaignMap({ apartments, onSelectApartment }: CampaignMapProps) {
    // Filter apartments with valid coordinates
    const validApartments = apartments.filter(apt => apt.latitude && apt.longitude);

    // Default center (Hyderabad approx)
    const defaultCenter: [number, number] = [17.3850, 78.4867];

    // Calculate center based on first valid apartment or use default
    const center: [number, number] = validApartments.length > 0
        ? [validApartments[0].latitude!, validApartments[0].longitude!]
        : defaultCenter;

    return (
        <div className="h-[500px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm relative z-0">
            <MapContainer
                center={center}
                zoom={13}
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {validApartments.map(apt => (
                    <Marker
                        key={apt.id}
                        position={[apt.latitude!, apt.longitude!]}
                        eventHandlers={{
                            click: () => onSelectApartment(apt.id)
                        }}
                    >
                        <Popup>
                            <div className="p-1">
                                <h3 className="font-bold text-sm">{apt.name}</h3>
                                <p className="text-xs text-slate-500">{apt.unitsPerFloor * apt.floors} units</p>
                                <button
                                    onClick={() => onSelectApartment(apt.id)}
                                    className="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded"
                                >
                                    View Campaign
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                <MapUpdater center={center} />
            </MapContainer>

            {validApartments.length === 0 && (
                <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-800/90 p-3 rounded-lg shadow-lg z-[1000] text-sm max-w-xs backdrop-blur-sm">
                    <p className="font-bold text-amber-600 mb-1">No Locations Set</p>
                    <p className="text-slate-600 dark:text-slate-300">
                        Campaigns don't have GPS coordinates yet. Edit a campaign to add its location.
                    </p>
                </div>
            )}
        </div>
    );
}

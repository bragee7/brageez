import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

const isValidLat = (v) => Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 90;
const isValidLng = (v) => Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 180;

const HeatmapView = ({ points = [], height = 'h-96', emptyText = 'No location data available' }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const heatRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    try {
      mapRef.current = L.map(containerRef.current, {
        center: [20, 0],
        zoom: 2,
        scrollWheelZoom: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);
    } catch (e) {
      setError(true);
      return;
    }
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        heatRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (heatRef.current) {
      map.removeLayer(heatRef.current);
      heatRef.current = null;
    }

    const valid = (points || []).filter((p) => isValidLat(p.latitude) && isValidLng(p.longitude));
    if (valid.length === 0) return;

    heatRef.current = L.heatLayer(
      valid.map((p) => [Number(p.latitude), Number(p.longitude)]),
      { radius: 25, blur: 15, maxZoom: 15, max: 1.0 }
    ).addTo(map);

    const bounds = L.latLngBounds(valid.map((p) => [Number(p.latitude), Number(p.longitude)]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [points]);

  if (error) {
    return (
      <div className={`${height} bg-gray-800 rounded-lg flex items-center justify-center`}>
        <p className="text-gray-400 text-sm">Heatmap failed to load.</p>
      </div>
    );
  }

  if (!containerRef.current && (points || []).length === 0) {
    return (
      <div className={`${height} bg-gray-800 rounded-lg flex items-center justify-center`}>
        <p className="text-gray-400 text-sm">{emptyText}</p>
      </div>
    );
  }

  return <div ref={containerRef} className={`${height} w-full rounded-lg z-0`} />;
};

export default HeatmapView;
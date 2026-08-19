const isValidPhone = (phone) =>
  typeof phone === 'string' && phone.trim().replace(/[^0-9+]/g, '').length >= 8;

const isValidLat = (lat) =>
  lat !== undefined && lat !== null && lat !== '' && Number.isFinite(Number(lat)) && Math.abs(Number(lat)) <= 90;

const isValidLng = (lng) =>
  lng !== undefined && lng !== null && lng !== '' && Number.isFinite(Number(lng)) && Math.abs(Number(lng)) <= 180;

export const buildWhatsAppLink = ({
  phone,
  latitude,
  longitude,
  caseId,
  timestamp,
  message,
}) => {
  const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
  if (!isValidPhone(cleanPhone)) return null;
  if (!isValidLat(latitude) || !isValidLng(longitude)) return null;

  const mapsLink = `https://maps.google.com/?q=${Number(latitude)},${Number(longitude)}`;
  const lines = [];
  lines.push('ZELDA EMERGENCY ALERT');
  lines.push('');
  lines.push('Emergency location:');
  lines.push(mapsLink);
  if (caseId) {
    lines.push('');
    lines.push(`Case ID: ${caseId}`);
  }
  if (timestamp) {
    lines.push(`Time: ${timestamp}`);
  }
  if (message) lines.push(message);

  return `https://wa.me/${cleanPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(lines.join('\n'))}`;
};

export const normalizePhone = (phone) =>
  typeof phone === 'string' ? phone.trim().replace(/[^0-9]/g, '') : '';
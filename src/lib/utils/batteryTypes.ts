export const controllerBatteryTypeLabels: { [key: string]: string } = {
  '00': 'User',
  '01': 'FLD',
  '02': 'SLD',
  '03': 'GEL',
  '04': 'LI'
};

export const inverterBatteryTypeLabels: { [key: string]: string } = {
  '00': 'UserDef',
  '01': 'SLD',
  '02': 'FLD',
  '03': 'GEL',
  '04': 'LFP14(48v)',
  '05': 'LFP15(48v)',
  '06': 'LFP16(48v)',
  '0C': 'N13',
  '0D': 'N14',
  '0E': 'LFP4(12V)'
};

export function getBatteryLabel(deviceCategory: string, rawValue: any): string {
  const cat = (deviceCategory || '').toLowerCase();
  const isInverter = cat === 'inverter';
  const labels = isInverter ? inverterBatteryTypeLabels : controllerBatteryTypeLabels;
  const batteryValue = isInverter
    ? Number(rawValue).toString(16).padStart(2, '0').toUpperCase()
    : String(rawValue).padStart(2, '0');
  return labels[batteryValue] ?? String(rawValue);
}

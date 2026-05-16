import { getBatteryLabel } from './batteryTypes';

export type FormattedParameter = { value: string; unit?: string };

export function isBatteryTypeParameter(key: string, info: any): boolean {
  const param = `${key}`.toLowerCase();
  const desc = `${info?.desc || ''}`.toLowerCase();
  return /battery.*type/.test(param) || /battery.*type/.test(desc);
}

export function createFormatParameter(deviceCategory: string) {
  return function formatParameterValue(key: string, value: any, info: any): FormattedParameter {
    if (isBatteryTypeParameter(key, info)) {
      return {
        value: getBatteryLabel(deviceCategory, value),
        unit: info?.unit
      };
    }

    if (info?.type === 'float') {
      if (info.unit === 'mA') {
        return {
          value: (Number(value) / 1000).toFixed(2),
          unit: 'A'
        };
      }
      return {
        value: Number(value).toFixed(2),
        unit: info.unit
      };
    }

    return {
      value: String(value),
      unit: info?.unit
    };
  };
}

import { formatIsoDate, parseMonthYear } from './master-availability.util';

export function providersExportFilename(date = new Date()): string {
  return `providers-${formatIsoDate(date)}.xlsx`;
}

/** Region scope label for calendar exports (Region 1…4, Chaperone, Telehealth, Travel/IMO). */
export function regionExportScope(region: string): string {
  if (region === 'Chaperone' || region === 'Telehealth' || region === 'Travel/IMO') {
    return region;
  }
  if (/^Region \d+$/.test(region)) {
    return region;
  }
  if (/^\d+$/.test(region)) {
    return `Region ${region}`;
  }
  return region;
}

export function regionExportFilename(
  region: string,
  company: string,
  monthYear: string,
): string {
  const { label } = parseMonthYear(monthYear);
  if (region === 'Chaperone') {
    return `Chaperone - Frontera - ${label}.xlsx`;
  }
  const scope = regionExportScope(region);
  return `${scope} - ${company} - ${label}.xlsx`;
}

export function aceImoExportFilename(company: string, monthYear: string): string {
  const { label } = parseMonthYear(monthYear);
  return `ACE-IMO - ${company} - ${label}.xlsx`;
}

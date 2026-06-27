import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import ExcelJS from 'exceljs';
import type { MasterAvailabilityClientExportProvider, MasterAvailabilityEntry } from '../interface';
import {
  buildAceImoExportWorkbook,
  buildRegionExportWorkbooks,
  compactExportHours,
} from './master-pto-export.util';

describe('compactExportHours', () => {
  it('shortens standard shift ranges', () => {
    expect(compactExportHours('8:00 AM – 5:00 PM')).toBe('8-5');
  });

  it('keeps minute precision when present', () => {
    expect(compactExportHours('7:45 AM – 4:45 PM')).toBe('7:45-4:45');
  });
});

describe('buildAceImoExportWorkbook', () => {
  const provider: MasterAvailabilityClientExportProvider = {
    providerUserId: 'p1',
    providerName: 'Dr. Sarah Johnson',
    specialty: 'Family Medicine',
    recruiterId: 'r1',
    recruiterName: 'Gray Rodgers',
    liaisonName: 'Liaison',
    region: 'Region 1',
    facilityName: 'Dallas Medical Center',
    workSiteId: 'w1',
    weeklySchedule: [{ day: 'Monday', startTime: '8:00 AM', endTime: '5:00 PM' }],
    scheduleType: 'set',
  };

  const baselineEntry: MasterAvailabilityEntry = {
    requestId: null,
    providerUserId: 'p1',
    providerName: 'Dr. Sarah Johnson',
    liaisonName: 'Liaison',
    recruiterName: 'Gray Rodgers',
    date: '2026-05-05',
    timeAvailable: '8:00 AM – 5:00 PM',
    status: 'approved',
    displayStatus: 'approved',
    specialty: 'Family Medicine',
    region: 'Region 1',
    facilityName: 'Dallas Medical Center',
    notes: null,
    changeType: null,
    createdAt: null,
    source: 'baseline',
  };

  it('creates one recruiter sheet with calendar layout and provider hours', async () => {
    const buffer = await buildAceImoExportWorkbook({
      company: '4tress',
      monthYear: '2026-05-01',
      providers: [provider],
      entries: [baselineEntry],
    });

    const tmpPath = path.join(os.tmpdir(), `ace-imo-export-${Date.now()}.xlsx`);
    await fs.writeFile(tmpPath, buffer);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(tmpPath);
    await fs.unlink(tmpPath);

    expect(workbook.worksheets).toHaveLength(1);
    expect(workbook.worksheets[0]?.name).toBe('Gray Rodgers');
    expect(workbook.worksheets[0]?.getCell(2, 2).value).toBe('Sunday');

    const values: string[] = [];
    workbook.worksheets[0]?.eachRow((row) => {
      row.eachCell((cell) => {
        if (typeof cell.value === 'string' && cell.value.includes('Dr. Sarah Johnson')) {
          values.push(cell.value);
        }
      });
    });
    expect(values.length).toBeGreaterThan(0);
    expect(values.every((value) => value === 'Dr. Sarah Johnson 8-5')).toBe(true);
  });
});

describe('buildRegionExportWorkbooks', () => {
  const provider: MasterAvailabilityClientExportProvider = {
    providerUserId: 'p1',
    providerName: 'Dr. Sarah Johnson',
    specialty: 'Family Medicine',
    recruiterId: 'r1',
    recruiterName: 'Gray Rodgers',
    liaisonName: 'Liaison',
    region: 'Region 1',
    facilityName: 'Dallas Medical Center',
    city: 'Dallas',
    state: 'TX',
    workSiteId: 'w1',
    weeklySchedule: [{ day: 'Monday', startTime: '8:00 AM', endTime: '5:00 PM' }],
    scheduleType: 'set',
  };

  const baselineEntry: MasterAvailabilityEntry = {
    requestId: null,
    providerUserId: 'p1',
    providerName: 'Dr. Sarah Johnson',
    liaisonName: 'Liaison',
    recruiterName: 'Gray Rodgers',
    date: '2026-05-05',
    timeAvailable: '8:00 AM – 5:00 PM',
    status: 'approved',
    displayStatus: 'approved',
    specialty: 'Family Medicine',
    region: 'Region 1',
    facilityName: 'Dallas Medical Center',
    notes: null,
    changeType: null,
    createdAt: null,
    source: 'baseline',
  };

  it('creates facility sheets with calendar layout (not table rows)', async () => {
    const files = await buildRegionExportWorkbooks({
      company: 'Frontera',
      monthYear: '2026-05-01',
      providers: [provider],
      entries: [baselineEntry],
      regions: ['Region 1'],
    });

    expect(files).toHaveLength(1);
    expect(files[0]?.filename).toBe('Region 1 - Frontera - May 2026.xlsx');

    const tmpPath = path.join(os.tmpdir(), `region-export-${Date.now()}.xlsx`);
    await fs.writeFile(tmpPath, files[0]!.buffer);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(tmpPath);
    await fs.unlink(tmpPath);

    expect(workbook.worksheets[0]?.name).toBe('Dallas, TX');
    expect(workbook.worksheets[0]?.getCell(2, 2).value).toBe('Sunday');
    expect(workbook.worksheets[0]?.getCell(1, 1).value).not.toBe('Provider');
  });
});

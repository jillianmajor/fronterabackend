import {
  aceImoExportFilename,
  providersExportFilename,
  regionExportFilename,
} from './export-filename.util';

describe('export-filename.util', () => {
  it('names provider roster exports with today date', () => {
    expect(providersExportFilename(new Date(2026, 5, 27))).toBe('providers-2026-06-27.xlsx');
  });

  it('names numbered region calendar exports without duplicating Region prefix', () => {
    expect(regionExportFilename('Region 2', 'Frontera', '2026-06-01')).toBe(
      'Region 2 - Frontera - June 2026.xlsx',
    );
  });

  it('names Chaperone exports without Region prefix and always Frontera', () => {
    expect(regionExportFilename('Chaperone', '4tress', '2026-06-01')).toBe(
      'Chaperone - Frontera - June 2026.xlsx',
    );
  });

  it('names ACE/IMO exports', () => {
    expect(aceImoExportFilename('Frontera', '2026-06-01')).toBe(
      'ACE-IMO - Frontera - June 2026.xlsx',
    );
  });
});

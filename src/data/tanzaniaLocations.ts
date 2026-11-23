export const TANZANIA_DISTRICTS_BY_REGION: Record<string, string[]> = {
  Arusha: [
    'Arusha City',
    'Arusha DC',
    'Karatu',
    'Longido',
    'Meru',
    'Monduli',
    'Ngorongoro',
  ],
  'Dar es Salaam': [
    'Ilala',
    'Kigamboni',
    'Kinondoni',
    'Temeke',
    'Ubungo',
  ],
  Dodoma: [
    'Dodoma Mjini (Dodoma City)',
    'Bahi',
    'Chamwino',
    'Chemba',
    'Kondoa',
    'Kondoa Mjini',
    'Kongwa',
    'Mpwapwa',
  ],
  Geita: [
    'Bukombe',
    'Chato',
    'Geita',
    'Geita Mjini',
    'Mbogwe',
    "Nyang'hwale",
  ],
  Iringa: [
    'Iringa Mjini',
    'Iringa DC',
    'Kilolo',
    'Mafinga Mjini',
    'Mufindi',
  ],
  Kagera: [
    'Biharamulo',
    'Bukoba Mjini',
    'Bukoba DC',
    'Karagwe',
    'Kyerwa',
    'Missenyi',
    'Muleba',
    'Ngara',
  ],
  'Kaskazini Pemba': ['Micheweni', 'Wete'],
  'Kaskazini Unguja': ['Kaskazini A', 'Kaskazini B'],
  Katavi: ['Mlele', 'Mpanda Mjini', 'Mpanda DC', 'Nsimbo', 'Tanganyika'],
  Kigoma: [
    'Buhigwe',
    'Kakonko',
    'Kasulu Mjini',
    'Kasulu DC',
    'Kibondo',
    'Kigoma Ujiji',
    'Kigoma DC',
    'Uvinza',
  ],
  Kilimanjaro: [
    'Hai',
    'Moshi Mjini',
    'Moshi DC',
    'Mwanga',
    'Rombo',
    'Same',
    'Siha',
  ],
  'Kusini Pemba': ['Chake Chake', 'Mkoani'],
  'Kusini Unguja': ['Kati', 'Kusini'],
  Lindi: ['Kilwa', 'Lindi Mjini', 'Lindi DC', 'Liwale', 'Nachingwea', 'Ruangwa'],
  Manyara: [
    'Babati Mjini',
    'Babati DC',
    "Hanang'",
    'Kiteto',
    'Mbulu Mjini',
    'Mbulu DC',
    'Simanjiro',
  ],
  Mara: [
    'Bunda Mjini',
    'Bunda DC',
    'Butiama',
    'Musoma Mjini',
    'Musoma DC',
    'Rorya',
    'Serengeti',
    'Tarime Mjini',
    'Tarime DC',
  ],
  Mbeya: [
    'Busokelo',
    'Chunya',
    'Kyela',
    'Mbarali',
    'Mbeya City (Mbeya Mjini)',
    'Mbeya DC',
    'Rungwe',
  ],
  'Mjini Magharibi': ['Magharibi A', 'Magharibi B', 'Mjini (Stone Town)'],
  Morogoro: [
    'Gairo',
    'Ifakara Mjini',
    'Kilombero',
    'Kilosa',
    'Malinyi',
    'Mlimba',
    'Morogoro Mjini',
    'Morogoro DC',
    'Mvomero',
    'Ulanga',
  ],
  Mtwara: [
    'Masasi Mjini',
    'Masasi DC',
    'Mtwara Mikindani',
    'Mtwara DC',
    'Nanyamba Mjini',
    'Nanyumbu',
    'Newala Mjini',
    'Newala DC',
    'Tandahimba',
  ],
  Mwanza: [
    'Buchosa',
    'Ilemela',
    'Kwimba',
    'Magu',
    'Misungwi',
    'Nyamagana',
    'Sengerema',
    'Ukerewe',
  ],
  Njombe: [
    'Ludewa',
    'Makambako Mjini',
    'Makete',
    'Njombe Mjini',
    'Njombe DC',
    "Wanging'ombe",
  ],
  Pwani: [
    'Bagamoyo',
    'Chalinze',
    'Kibaha Mjini',
    'Kibaha DC',
    'Kibiti',
    'Kisarawe',
    'Mafia',
    'Mkuranga',
    'Rufiji',
  ],
  Rukwa: ['Kalambo', 'Nkasi', 'Sumbawanga Mjini', 'Sumbawanga DC'],
  Ruvuma: [
    'Mbinga Mjini',
    'Mbinga DC',
    'Namtumbo',
    'Nyasa',
    'Songea Mjini',
    'Songea DC',
    'Tunduru',
  ],
  Shinyanga: [
    'Kahama Manispaa',
    'Kishapu',
    'Msalala',
    'Shinyanga Mjini',
    'Shinyanga DC',
    'Ushetu',
  ],
  Simiyu: ['Bariadi Mjini', 'Bariadi DC', 'Busega', 'Itilima', 'Maswa', 'Meatu'],
  Singida: [
    'Ikungi',
    'Iramba',
    'Itigi',
    'Manyoni',
    'Mkalama',
    'Singida Mjini',
    'Singida DC',
  ],
  Songwe: ['Ileje', 'Mbozi', 'Momba', 'Songwe', 'Tunduma Mjini'],
  Tabora: [
    'Igunga',
    'Kaliua',
    'Nzega Mjini',
    'Nzega DC',
    'Sikonge',
    'Tabora Mjini',
    'Urambo',
    'Uyui',
  ],
  Tanga: [
    'Bumbuli',
    'Handeni Mjini',
    'Handeni DC',
    'Kilindi',
    'Korogwe Mjini',
    'Korogwe DC',
    'Lushoto',
    'Mkinga',
    'Muheza',
    'Pangani',
    'Tanga City (Tanga Mjini)',
  ],
};

export const TANZANIA_REGIONS: string[] = Object.keys(TANZANIA_DISTRICTS_BY_REGION);

export function getDistrictsForRegion(region: string): string[] {
  if (!region) return TANZANIA_DISTRICTS_BY_REGION.Dodoma;
  const direct = TANZANIA_DISTRICTS_BY_REGION[region];
  if (direct) return direct;
  const matchedKey = TANZANIA_REGIONS.find(
    (r) => r.toLowerCase() === region.trim().toLowerCase()
  );
  if (matchedKey) return TANZANIA_DISTRICTS_BY_REGION[matchedKey];
  if (region.toLowerCase().includes('zanzibar')) {
    return TANZANIA_DISTRICTS_BY_REGION['Mjini Magharibi'];
  }
  return ['Central District'];
}

export function formatOrderDestination(region?: string, street?: string): string {
  const rawParts = [region || '', ...(street || '').split(',')]
    .map((p) => p.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const uniqueParts: string[] = [];
  for (const part of rawParts) {
    const key = part.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueParts.push(part);
    }
  }
  return uniqueParts.join(', ');
}

export function extractCleanStreet(
  savedStreet: string | undefined,
  region: string,
  districts: string[]
): string {
  if (!savedStreet) return '';
  const regionLower = region.trim().toLowerCase();
  const districtSet = new Set(districts.map((d) => d.toLowerCase()));
  const parts = savedStreet
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const p of parts) {
    const lower = p.toLowerCase();
    if (lower === regionLower || districtSet.has(lower)) continue;
    // Also skip legacy uppercase forms like "IRINGA MJINI" when "Iringa Mjini" is a district
    if (seen.has(lower)) continue;
    seen.add(lower);
    cleaned.push(p);
  }
  return cleaned.join(', ');
}

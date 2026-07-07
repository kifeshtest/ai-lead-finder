// Referentiedata voor de mock-provider (realistische Nederlandse bedrijven).

export const PROVINCES = {
  'Noord-Holland': ['Amsterdam', 'Haarlem', 'Zaandam', 'Alkmaar', 'Hilversum', 'Hoorn'],
  'Zuid-Holland': ['Rotterdam', 'Den Haag', 'Leiden', 'Delft', 'Dordrecht', 'Gouda'],
  Utrecht: ['Utrecht', 'Amersfoort', 'Nieuwegein', 'Veenendaal', 'Zeist'],
  'Noord-Brabant': ['Eindhoven', 'Tilburg', 'Breda', 'Den Bosch', 'Helmond', 'Oss'],
  Gelderland: ['Nijmegen', 'Arnhem', 'Apeldoorn', 'Ede', 'Zutphen'],
  Overijssel: ['Enschede', 'Zwolle', 'Deventer', 'Hengelo', 'Almelo'],
  Groningen: ['Groningen', 'Winschoten', 'Delfzijl', 'Hoogezand'],
  Friesland: ['Leeuwarden', 'Drachten', 'Sneek', 'Heerenveen'],
  Drenthe: ['Assen', 'Emmen', 'Hoogeveen', 'Meppel'],
  Flevoland: ['Almere', 'Lelystad', 'Dronten'],
  Limburg: ['Maastricht', 'Venlo', 'Roermond', 'Heerlen', 'Sittard'],
  Zeeland: ['Middelburg', 'Vlissingen', 'Goes', 'Terneuzen'],
};

export const BRANCHES = [
  'Kappersalon', 'Loodgietersbedrijf', 'Schildersbedrijf', 'Autogarage', 'Restaurant',
  'Fysiotherapiepraktijk', 'Advocatenkantoor', 'Hoveniersbedrijf', 'Bakkerij', 'Tandartspraktijk',
  'Aannemersbedrijf', 'Schoonheidssalon', 'Rijschool', 'Boekhoudkantoor', 'Installatiebedrijf',
  'Meubelmaker', 'Fietsenwinkel', 'Cateringbedrijf', 'Makelaardij', 'Dierenkliniek',
];

export const NAME_SUFFIX = ['B.V.', 'V.O.F.', '& Zonen', 'Groep', '', '', ''];
export const NAME_ROOTS = [
  'De Jong', 'Van Dijk', 'Bakker', 'Visser', 'Smit', 'Meijer', 'De Boer', 'Mulder', 'Bos', 'Vos',
  'Peters', 'Hendriks', 'Van Leeuwen', 'Dekker', 'Brouwer', 'De Wit', 'Dijkstra', 'Kok', 'Jansen', 'Willems',
  'Noord', 'Centraal', 'Maas', 'Rijn', 'Zuid', 'Hanze', 'Delta', 'Vecht', 'Duin', 'Veld',
];

export function pick(arr, rnd = Math.random) {
  return arr[Math.floor(rnd() * arr.length)];
}

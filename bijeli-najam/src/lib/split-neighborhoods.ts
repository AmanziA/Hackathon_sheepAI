export const NEIGHBORHOOD_CENTERS: Record<string, { lat: number; lon: number }> = {
  "veli-varos":  { lat: 43.5081, lon: 16.4372 },
  "mali-varos":  { lat: 43.5066, lon: 16.4408 },
  "bacvice":     { lat: 43.5055, lon: 16.4501 },
  "spinut":      { lat: 43.5130, lon: 16.4418 },
  "meje":        { lat: 43.5078, lon: 16.4290 },
  "znjan":       { lat: 43.4990, lon: 16.4600 },
  "firule":      { lat: 43.5035, lon: 16.4560 },
  "sucidar":     { lat: 43.5120, lon: 16.4480 },
  "grad":        { lat: 43.5097, lon: 16.4406 },
  "trstenik":    { lat: 43.5092, lon: 16.4530 },
  "lovret":      { lat: 43.5160, lon: 16.4450 },
  "kman":        { lat: 43.5170, lon: 16.4560 },
  "mejasi":      { lat: 43.5175, lon: 16.4380 },
  "mejaši":      { lat: 43.5175, lon: 16.4380 },
  "blatine":     { lat: 43.5145, lon: 16.4515 },
  "skalice":     { lat: 43.5060, lon: 16.4450 },
};

export function centerForSlug(slug: string): { lat: number; lon: number } | null {
  return NEIGHBORHOOD_CENTERS[slug] ?? null;
}

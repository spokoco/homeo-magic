// Symptom data structure from symptoms.json
export interface SymptomsData {
  [symptomName: string]: {
    remedies: {
      [remedyAbbrev: string]: number; // weight 1-3
    };
  };
}

// Remedies data structure from remedies.json
export interface RemediesData {
  [abbrev: string]: string; // full name
}

// Result of repertorization
export interface RepertoResult {
  abbrev: string;
  fullName: string;
  totalScore: number; // normalized 0-100
  rawScore: number; // actual sum of grades
  breakdown: {
    [symptom: string]: number;
  };
}

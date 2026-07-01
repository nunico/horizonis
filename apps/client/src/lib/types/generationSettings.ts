export interface GenerationSettings {
	SystemCountMin: number;
	SystemCountMax: number;
	MultiStarChance: number;
	TrinaryRatio: number;
	MaxBodiesPerStar: number;
	AsteroidBeltChance: number;
	DisallowCircumbinaryBodies: boolean;
}

/**
 * Mirrors `GenerationSettings::default()` in
 * `libs/procedural-gen/src/models.rs` field-for-field. Keep both in sync
 * manually if either changes.
 */
export const defaultGenerationSettings: GenerationSettings = {
	SystemCountMin: 15,
	SystemCountMax: 25,
	MultiStarChance: 0.2,
	TrinaryRatio: 0.3,
	MaxBodiesPerStar: 8,
	AsteroidBeltChance: 0.5,
	DisallowCircumbinaryBodies: false
};

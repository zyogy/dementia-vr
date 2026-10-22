export interface SimulationConfig {
  audioDistractions: boolean;
  audioIntensity: number;
  taskInterruptions: boolean;
  showHints: boolean;
  enableVisualEffects: boolean;
}

export const defaultSimulationConfig: SimulationConfig = {
  audioDistractions: true,
  audioIntensity: 0.3,
  taskInterruptions: true,
  showHints: true,
  enableVisualEffects: false,
};

export function sanitizeConfig(config: SimulationConfig): SimulationConfig {
  return {
    ...config,
    audioIntensity: Math.max(
      0,
      Math.min(
        1,
        Number.isFinite(config.audioIntensity) ? config.audioIntensity : 0.3,
      ),
    ),
  };
}

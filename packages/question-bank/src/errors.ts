export class GenerationTargetError extends Error {
  public override readonly name = "GenerationTargetError";
}

export class PersistedValidationError extends Error {
  public override readonly name = "PersistedValidationError";
}

export class ConfigurationError extends Error {
  public override readonly name = "ConfigurationError";
}

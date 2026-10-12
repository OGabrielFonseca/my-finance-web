import type { components } from './schema';

type Schemas = components['schemas'];

/** Schema como gerado. Use para requests: os opcionais refletem @NotNull/@NotBlank do backend. */
export type ApiSchema<K extends keyof Schemas> = Schemas[K];

/**
 * Schema de resposta. O springdoc marca como opcionais os campos sem anotação, mas o Jackson serializa todos;
 * então nenhum campo é ausente. Os que podem vir null são listados em N.
 */
export type ApiResponse<K extends keyof Schemas, N extends keyof Schemas[K] = never> = {
  [P in keyof Schemas[K]]-?: P extends N ? Exclude<Schemas[K][P], undefined> | null : Exclude<Schemas[K][P], undefined>;
};

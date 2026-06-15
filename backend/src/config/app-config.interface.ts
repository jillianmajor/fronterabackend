/** Typed access to environment variables — implemented by `AppConfigService`. */
export interface IAppConfig {
  get<T = string>(propertyPath: string): T | undefined;
}

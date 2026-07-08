// Tiny classnames helper — joins truthy class strings.
export function cn(...args) {
  return args.flat().filter(Boolean).join(" ");
}

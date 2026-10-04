export function withRedirectBase(redirects, base) {
  return Object.fromEntries(Object.entries(redirects).map(([source, destination]) => [
    source,
    destination.startsWith(`${base}/`) ? destination : `${base}${destination}`,
  ]));
}

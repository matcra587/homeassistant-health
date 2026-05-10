type LocationLike = Pick<Location, "href"> | URL | string;

declare global {
  interface Window {
    baseUrl?: string;
  }
}

function browserBaseUrl(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return typeof window.baseUrl === "string" ? window.baseUrl : undefined;
}

function pageUrl(location: LocationLike): URL {
  if (location instanceof URL) {
    return location;
  }

  return new URL(typeof location === "string" ? location : location.href);
}

function directoryUrl(value: string, origin: string): URL {
  const url = new URL(value, origin);
  if (!url.pathname.endsWith("/")) {
    url.pathname = `${url.pathname}/`;
  }
  return url;
}

function appBaseUrl(location: URL, baseUrl?: string): URL {
  if (baseUrl) {
    return directoryUrl(baseUrl, location.origin);
  }

  const segments = location.pathname.split("/").filter(Boolean);
  if (
    segments[0] === "api" &&
    segments[1] === "hassio_ingress" &&
    segments[2]
  ) {
    const ingressUrl = new URL("/", location.origin);
    ingressUrl.pathname = `/${segments.slice(0, 3).join("/")}/`;
    return ingressUrl;
  }

  return new URL("/", location.origin);
}

function relativeRoute(path: string): string {
  let route = path;
  while (route.startsWith("/")) {
    route = route.slice(1);
  }
  return route;
}

export function apiUrl(
  path: string,
  location: LocationLike = window.location,
  baseUrl: string | undefined = browserBaseUrl(),
): string {
  return new URL(
    relativeRoute(path),
    appBaseUrl(pageUrl(location), baseUrl),
  ).toString();
}

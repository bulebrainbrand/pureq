export async function resolveStringValue(
  value: string | (() => Promise<string> | string)
): Promise<string> {
  return typeof value === "function" ? await value() : value;
}

export function appendQueryParam(url: string, name: string, value: string): string {
  try {
    const parsed = new URL(url, typeof location !== "undefined" ? location.origin : "http://localhost");
    parsed.searchParams.set(name, value);
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)) {
      return parsed.toString();
    }
    const search = parsed.searchParams.toString();
    return `${parsed.pathname}${search ? `?${search}` : ""}${parsed.hash}`;
  } catch {
    const [path, hash = ""] = url.split("#", 2);
    const [base, query = ""] = (path ?? "").split("?", 2);
    const params = new URLSearchParams(query);
    params.set(name, value);
    const nextQuery = params.toString();
    return `${base}${nextQuery ? `?${nextQuery}` : ""}${hash ? `#${hash}` : ""}`;
  }
}

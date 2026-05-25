export function splitCookiesString(cookiesString: string | string[] | null | undefined) {
  if (!cookiesString) {
    return [];
  }
  if (Array.isArray(cookiesString)) {
    return cookiesString;
  }

  const cookies: string[] = [];
  let start = 0;
  let inExpires = false;

  for (let index = 0; index < cookiesString.length; index += 1) {
    const char = cookiesString[index];
    const rest = cookiesString.slice(index).toLowerCase();

    if (rest.startsWith("expires=")) {
      inExpires = true;
      index += "expires=".length - 1;
      continue;
    }

    if (inExpires && char === ";") {
      inExpires = false;
      continue;
    }

    if (char === "," && !inExpires) {
      const next = cookiesString.slice(index + 1);
      if (/^\s*[^=;\s]+=\s*/.test(next)) {
        cookies.push(cookiesString.slice(start, index).trim());
        start = index + 1;
      }
    }
  }

  cookies.push(cookiesString.slice(start).trim());
  return cookies.filter(Boolean);
}

export function parse(value: string | string[] | null | undefined) {
  return splitCookiesString(value).map((item) => {
    const firstSegment = item.split(";")[0] || "";
    const separator = firstSegment.indexOf("=");
    return {
      name: separator >= 0 ? firstSegment.slice(0, separator) : "",
      value: separator >= 0 ? firstSegment.slice(separator + 1) : firstSegment,
    };
  });
}

export default parse;

type CookieParseOptions = {
  decode?: (value: string) => string;
};

type CookieSerializeOptions = {
  domain?: string;
  encode?: (value: string) => string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  priority?: "low" | "medium" | "high";
  sameSite?: boolean | "lax" | "strict" | "none";
  secure?: boolean;
};

export function parse(cookieHeader: string, options: CookieParseOptions = {}) {
  const result: Record<string, string> = {};
  const decode = options.decode || decodeURIComponent;

  if (!cookieHeader) {
    return result;
  }

  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) {
      continue;
    }

    const key = part.slice(0, index).trim();
    if (!key || Object.prototype.hasOwnProperty.call(result, key)) {
      continue;
    }

    let value = part.slice(index + 1).trim();
    if (value.charCodeAt(0) === 0x22) {
      value = value.slice(1, -1);
    }

    try {
      result[key] = decode(value);
    } catch {
      result[key] = value;
    }
  }

  return result;
}

export function serialize(
  name: string,
  value: string,
  options: CookieSerializeOptions = {},
) {
  const encode = options.encode || encodeURIComponent;
  const segments = [`${name}=${encode(value)}`];

  if (typeof options.maxAge === "number") {
    segments.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }
  if (options.domain) {
    segments.push(`Domain=${options.domain}`);
  }
  if (options.path) {
    segments.push(`Path=${options.path}`);
  }
  if (options.expires) {
    segments.push(`Expires=${options.expires.toUTCString()}`);
  }
  if (options.httpOnly) {
    segments.push("HttpOnly");
  }
  if (options.secure) {
    segments.push("Secure");
  }
  if (options.priority) {
    segments.push(`Priority=${options.priority[0].toUpperCase()}${options.priority.slice(1)}`);
  }
  if (options.sameSite) {
    const sameSite =
      options.sameSite === true
        ? "Strict"
        : `${options.sameSite[0].toUpperCase()}${options.sameSite.slice(1)}`;
    segments.push(`SameSite=${sameSite}`);
  }

  return segments.join("; ");
}

export default {
  parse,
  serialize,
};

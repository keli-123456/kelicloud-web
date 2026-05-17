import i18next from "i18next";

type ApiErrorMessageContext = {
  status?: number;
};

type TranslationRule = {
  pattern: RegExp;
  build: (match: RegExpMatchArray, context: ApiErrorMessageContext) => string;
};

const exactMessages: Record<string, string> = {
  "unknown error": "未知错误，请稍后重试。",
  "network error": "网络连接失败，请检查网络或后端服务状态。",
  "upload cancelled": "上传已取消。",
  "copy failed": "复制失败，请手动复制。",
  "an error occurred": "操作失败，请稍后重试。",
  "invalid credentials": "用户名或密码不正确。",
  "2fa code is required": "请输入两步验证验证码。",
  "invalid 2fa code": "两步验证验证码不正确。",
  "login request body is too large": "登录请求内容过大。",
  "invalid request body: username and password are required": "用户名和密码不能为空。",
  "username already exists": "这个账号已经存在，请换一个邮箱或用户名。",
  "username cannot contain spaces": "用户名不能包含空格。",
  "latest agent release tag is unavailable": "无法获取最新 Agent 版本号，请稍后重试。",
  "failed to fetch account data": "获取账号信息失败，请刷新后重试。",
  "failed to fetch public info": "获取站点公开信息失败，请刷新后重试。",
  "an error occurred while fetching public info": "获取站点公开信息失败，请刷新后重试。",
  "failed to update username": "更新用户名失败，请稍后重试。",
  "failed to update password": "更新密码失败，请稍后重试。",
  "failed to enable 2fa": "启用两步验证失败，请检查验证码后重试。",
  "failed to disable 2fa": "关闭两步验证失败，请稍后重试。",
  "failed to fetch tasks": "获取执行任务失败，请刷新后重试。",
  "failed to fetch task results": "获取任务结果失败，请稍后重试。",
  "unexpected task result response": "任务结果响应格式异常，请刷新后重试。",
  "failed to fetch node live data": "获取节点实时状态失败，请检查后端服务或稍后重试。",
  "an error occurred while fetching data": "获取数据失败，请刷新后重试。",
  "failed to load ddns domain": "加载 DDNS 域名失败，请稍后重试。",
  "failed to fetch commands": "获取脚本库失败，请刷新后重试。",
  "failed to add command": "添加脚本失败，请稍后重试。",
  "failed to update command": "更新脚本失败，请稍后重试。",
  "failed to delete command": "删除脚本失败，请稍后重试。",
  "failed to delete session": "删除会话失败，请稍后重试。",
  "failed to fetch notification tasks": "获取负载告警任务失败，请刷新后重试。",
  "failed to fetch offline notifications": "获取离线通知配置失败，请刷新后重试。",
  "failed to fetch ping tasks": "获取 Ping 监测任务失败，请刷新后重试。",
  "an error occurred while fetching ping tasks": "获取 Ping 监测任务失败，请刷新后重试。",
  "an error occurred while fetching load alerts": "获取负载告警失败，请刷新后重试。",
  "failed to load load alerts": "加载负载告警失败，请刷新后重试。",
  "watch client not found": "当前出口客户端不存在或已被删除。",
  "current client not found": "当前客户端不存在或已被删除。",
  "client not found": "客户端不存在或已被删除。",
  "failover v2 service not found": "故障切换 V2 服务不存在或已被删除。",
  "failover v2 member not found": "故障切换 V2 成员不存在或已被删除。",
  "failover task not found": "故障切换任务不存在或已被删除。",
  "ddns binding not found": "DDNS 绑定不存在或已被删除。",
  "request is required": "请求内容不能为空。",
  "service is required": "服务不能为空。",
  "member is required": "成员不能为空。",
  "user context is required": "缺少用户上下文，请重新登录后再试。",
  "dns_lines is required": "请至少选择一条 DNS 线路。",
  "watch_client_uuid is required for existing_client mode": "现有客户端模式必须选择当前客户端。",
  "cloudflare api_token is required": "Cloudflare API Token 必填。",
  "cloudflare zone_id or zone_name is required": "Cloudflare Zone ID 或 Zone Name 必填。",
  "cloudflare record_name is required": "Cloudflare 记录名称必填。",
  "aliyun access_key_id and access_key_secret are required": "阿里云 AccessKey ID 和 AccessKey Secret 必填。",
  "aliyun domain_name is required": "阿里云域名必填。",
  "vultr token is empty": "Vultr 令牌为空。",
  "digitalocean token is not configured": "DigitalOcean 令牌未配置。",
  "vultr token is not configured": "Vultr 令牌未配置。",
  "linode token is not configured": "Linode 令牌未配置。",
  "aws credential is not configured": "AWS 凭证未配置。",
  "azure credential is not configured": "Azure 凭证未配置。",
  "azure credential is incomplete": "Azure 凭证缺少租户 ID、应用 ID 或客户端密钥，请检查后重新导入。",
  "azure service principal has no accessible subscriptions": "这个 Azure 服务主体没有可访问的订阅，请给应用分配订阅权限，或导入时填写 subscription_id。",
  "invalid token": "令牌无效，请检查令牌是否正确、是否启用，以及权限是否足够。",
  "invalid api key": "API Key 无效，请检查凭证是否正确。",
  "unauthorized": "未授权，请检查令牌权限或服务商访问控制。",
  "unauthorized.": "请先登录。",
  "login required": "请先登录。",
  "forbidden": "没有权限执行此操作。",
  "permission denied": "权限不足，无法执行此操作。",
  "platform admin permission is required": "需要平台管理员权限。",
  "feature is disabled for this user": "当前用户未开通此功能。",
  "cloud provider is disabled for this user": "当前用户未开通此云服务权限。",
  "user account is disabled": "用户账户已被停用。",
  "user account has expired": "用户套餐已到期。",
  "user account is not active": "用户账户当前不可用。",
};

const fieldLabels: Record<string, string> = {
  cooldown_seconds: "冷却时间",
  current_instance_ref: "当前实例引用",
  alicloud: "阿里云",
  aliyun: "阿里云",
  aws: "AWS",
  azure: "Azure",
  cloudflare: "Cloudflare",
  digitalocean: "DigitalOcean",
  dns_lines: "DNS 线路",
  dns_payload: "DNS 配置",
  dns_record_refs: "DNS 记录引用",
  entry_id: "凭证",
  "epusdt config": "Epusdt 配置",
  "epusdt gateway url": "Epusdt 网关地址",
  "epusdt pid": "Epusdt 商户 PID",
  "epusdt secret key": "Epusdt 商户 Secret Key",
  plan_payload: "计划参数",
  "payment method code": "支付方式编码",
  "payment method name": "支付方式名称",
  provider: "云服务商",
  provider_entry_group: "凭证分组",
  provider_entry_id: "云凭证",
  linode: "Linode",
  record_name: "记录名称",
  request: "请求内容",
  service: "服务",
  vultr: "Vultr",
  username: "用户名",
  password: "密码",
  watch_client_uuid: "当前客户端",
};

const statusLabels: Record<number, string> = {
  400: "请求参数不正确",
  401: "未登录或登录已过期",
  403: "没有权限执行此操作",
  404: "请求的资源不存在",
  408: "请求超时",
  409: "当前状态冲突，请刷新后重试",
  422: "请求内容校验失败",
  429: "请求过于频繁，请稍后再试",
  500: "服务器内部错误",
  502: "网关错误，后端服务可能不可用",
  503: "服务暂时不可用",
  504: "网关超时，后端响应太慢",
};

function shouldUseChineseErrorMessage() {
  const language = String(i18next.resolvedLanguage || i18next.language || "").toLowerCase();
  return !language || language.startsWith("zh");
}

function normalizeMessage(value: unknown, context: ApiErrorMessageContext) {
  const raw = value instanceof Error ? value.message : String(value ?? "");
  const message = raw.trim().replace(/^error:\s*/i, "");
  if (message) {
    return message;
  }
  return context.status ? statusLabels[context.status] || `请求失败：HTTP ${context.status}` : "请求失败。";
}

function normalizeLookupKey(message: string) {
  return message.trim().replace(/\s+/g, " ").toLowerCase();
}

function labelField(field: string) {
  const normalized = field
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase();
  return fieldLabels[normalized] || normalized.replace(/_/g, " ");
}

function translateAction(action: string) {
  const normalized = action.trim().replace(/\s+/g, " ").toLowerCase();
  if (normalized.includes("provision replacement instance")) return "创建替换实例";
  if (normalized.includes("create failover v2 member")) return "创建 V2 成员";
  if (normalized.includes("update failover v2 member")) return "保存 V2 成员";
  if (normalized.includes("create failover v2 service")) return "创建 V2 服务";
  if (normalized.includes("update failover v2 service")) return "保存 V2 服务";
  if (normalized.includes("sync ddns")) return "同步 DDNS";
  if (normalized.includes("save ddns")) return "保存 DDNS";
  if (normalized.includes("load dns catalog")) return "加载 DNS 记录";
  if (normalized.includes("load credential")) return "加载云凭证";
  if (normalized.includes("create instance")) return "创建实例";
  if (normalized.includes("delete instance")) return "删除实例";
  if (normalized.includes("fetch settings")) return "获取设置";
  if (normalized.includes("update settings")) return "保存设置";
  if (normalized.includes("save payment method")) return "保存支付方式";
  if (normalized.includes("create billing order")) return "创建订单";
  return action.trim() || "操作";
}

function translateNested(message: string, context: ApiErrorMessageContext) {
  const translated = translateEnglishMessage(message, context);
  return translated || message;
}

const translationRules: TranslationRule[] = [
  {
    pattern: /^failed to\s+(.+?):\s*(.+)$/i,
    build: (match, context) => `${translateAction(match[1] || "")}失败：${translateNested(match[2] || "", context)}`,
  },
  {
    pattern: /^failed to load latest agent release\s+\(github http\s+(\d+)\)$/i,
    build: (match) => `获取最新 Agent 版本失败：${statusLabels[Number(match[1])] || `GitHub HTTP ${match[1]}`}`,
  },
  {
    pattern: /^agent release\s+(.+?)\s+is not fully published yet\.\s+missing assets:\s*(.+)$/i,
    build: (match) => `Agent 版本 ${match[1]} 尚未完整发布，缺少文件：${match[2]}。`,
  },
  {
    pattern: /^failed to enable 2fa(?:\s*\((\d+)\))?$/i,
    build: (match) => `启用两步验证失败${match[1] ? `：${statusLabels[Number(match[1])] || `HTTP ${match[1]}`}` : "，请检查验证码后重试"}。`,
  },
  {
    pattern: /^failed to disable 2fa(?:\s*\((\d+)\))?$/i,
    build: (match) => `关闭两步验证失败${match[1] ? `：${statusLabels[Number(match[1])] || `HTTP ${match[1]}`}` : "，请稍后重试"}。`,
  },
  {
    pattern: /^request timed out while loading\s+(.+)$/i,
    build: () => "请求超时，后端响应太慢或网络连接不稳定，请稍后重试。",
  },
  {
    pattern: /^expected json from\s+(.+?), but received.*$/i,
    build: () => "后端返回了非 JSON 内容，可能是接口不存在、登录失效，或后端服务没有正确响应。",
  },
  {
    pattern: /^invalid json response from\s+(.+)$/i,
    build: () => "后端返回的 JSON 格式不正确，请刷新后重试；如果持续出现，说明接口响应异常。",
  },
  {
    pattern: /^http error! status:\s*(\d+)$/i,
    build: (match) => statusLabels[Number(match[1])] || `请求失败：HTTP ${match[1]}`,
  },
  {
    pattern: /^http\s+(\d+)$/i,
    build: (match) => statusLabels[Number(match[1])] || `请求失败：HTTP ${match[1]}`,
  },
  {
    pattern: /^http\s+(\d+):\s*(.+)$/i,
    build: (match) => statusLabels[Number(match[1])] || `请求失败：HTTP ${match[1]}：${match[2]}`,
  },
  {
    pattern: /^rpc error\s+(-?\d+):\s*(.+)$/i,
    build: (match, context) => `RPC 调用失败（${match[1]}）：${translateNested(match[2] || "", context)}`,
  },
  {
    pattern: /^unauthorized ip address:\s*(.+)$/i,
    build: (match) => `服务商拒绝了当前服务端出口 IP：${match[1]}。请在服务商 API 访问控制里允许这个 IP，或关闭 API IP 白名单限制。`,
  },
  {
    pattern: /^cloud provider\s+(.+?)\s+is disabled for this user$/i,
    build: (match) => `当前用户未开通 ${labelField(match[1] || "")} 云服务权限。`,
  },
  {
    pattern: /^unsupported failover v2 member provider:\s*(.+)$/i,
    build: (match) => `故障切换 V2 暂不支持这个成员云服务商：${match[1]}。`,
  },
  {
    pattern: /^provider\s+(.+?)\s+entry\s+(.+?)\s+was not found$/i,
    build: (match) => `${match[1]} 的云凭证 ${match[2]} 不存在，请重新选择凭证。`,
  },
  {
    pattern: /^provider\s+(.+?)\s+group\s+(.+?)\s+was not found$/i,
    build: (match) => `${match[1]} 的凭证分组 ${match[2]} 不存在，请重新选择分组。`,
  },
  {
    pattern: /^provider\s+(.+?)\s+entry\s+(.+?)\s+is not in group\s+(.+)$/i,
    build: (match) => `${match[1]} 的云凭证 ${match[2]} 不在分组 ${match[3]} 中，请重新选择。`,
  },
  {
    pattern: /^invalid\s+(.+?):\s*(.+)$/i,
    build: (match, context) => `${labelField(match[1] || "")}格式无效：${translateNested(match[2] || "", context)}`,
  },
  {
    pattern: /^(.+?)\s+is required(?:\s+for\s+(.+))?$/i,
    build: (match) => `${labelField(match[1] || "")}必填。`,
  },
  {
    pattern: /^(.+?)\s+must be greater than or equal to\s+(\d+)$/i,
    build: (match) => `${labelField(match[1] || "")}必须大于或等于 ${match[2]}。`,
  },
  {
    pattern: /^(.+?)\s+must be at least\s+(\d+)$/i,
    build: (match) => `${labelField(match[1] || "")}必须至少为 ${match[2]}。`,
  },
  {
    pattern: /^(.+?)\s+must be at most\s+(\d+)\s+characters long$/i,
    build: (match) => `${labelField(match[1] || "")}最多 ${match[2]} 个字符。`,
  },
  {
    pattern: /^(.+?)\s+must be greater than\s+0$/i,
    build: (match) => `${labelField(match[1] || "")}必须大于 0。`,
  },
  {
    pattern: /^(.+?)\s+is empty$/i,
    build: (match) => `${labelField(match[1] || "")}为空，请填写后再试。`,
  },
  {
    pattern: /^(.+?)\s+is not configured$/i,
    build: (match) => `${labelField(match[1] || "")}未配置，请先配置后再试。`,
  },
  {
    pattern: /^(.+?)\s+configuration is missing$/i,
    build: (match) => `${labelField(match[1] || "")}配置缺失，请先配置后再试。`,
  },
  {
    pattern: /^(.+?)\s+not found$/i,
    build: (match) => `${labelField(match[1] || "")}不存在或已被删除。`,
  },
  {
    pattern: /^(.+?)\s+was not found$/i,
    build: (match) => `${labelField(match[1] || "")}不存在或已被删除。`,
  },
  {
    pattern: /^(.+?)\s+response is empty$/i,
    build: (match) => `${labelField(match[1] || "")}返回内容为空，请稍后重试。`,
  },
  {
    pattern: /^(.+?)\s+api request failed:\s*(.+)$/i,
    build: (match, context) => `${labelField(match[1] || "")} API 请求失败：${translateNested(match[2] || "", context)}`,
  },
];

function translateEnglishMessage(message: string, context: ApiErrorMessageContext) {
  const exact = exactMessages[normalizeLookupKey(message)];
  if (exact) {
    return exact;
  }

  for (const rule of translationRules) {
    const match = message.match(rule.pattern);
    if (match) {
      return rule.build(match, context);
    }
  }

  return "";
}

export function formatApiErrorMessage(value: unknown, context: ApiErrorMessageContext = {}) {
  const message = normalizeMessage(value, context);
  if (!shouldUseChineseErrorMessage() || /[\u4e00-\u9fff]/.test(message)) {
    return message;
  }

  return (
    translateEnglishMessage(message, context)
    || (/[A-Za-z]/.test(message) ? `请求失败：${message}` : message)
  );
}

export function getReadableErrorMessage(error: unknown, fallback = "请求失败。") {
  if (error instanceof Error) {
    return formatApiErrorMessage(error.message);
  }
  const message = String(error ?? "").trim();
  return message ? formatApiErrorMessage(message) : fallback;
}

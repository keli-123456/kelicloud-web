# Color Status Map

## 目标
定义整个项目中“状态语义 -> 颜色语义 -> 组件表现”的统一映射规则，避免页面各自上色，导致：

- 同一状态在不同页面颜色不一致
- 颜色只为好看，不表达风险
- warning / danger / disabled 混淆
- 表格和弹窗里状态颜色失控

本文件只定义**语义映射**，不直接绑定具体十六进制颜色值。具体颜色实现应来自设计 token、主题变量或统一组件 variant。

---

## 一、基础语义

全项目状态颜色只允许落到以下语义层：

- `default`
- `info`
- `success`
- `warning`
- `danger`
- `disabled`

说明：

- `default`：中性、普通、未强调
- `info`：流程中、提示中、进行中、说明性状态
- `success`：正常、成功、启用、通过
- `warning`：需关注、部分异常、接近阈值、待处理
- `danger`：失败、高风险、错误、不可逆操作
- `disabled`：不可用、未启用、未配置、被关闭、不可操作

---

## 二、统一映射规则

### 1. 常见状态文案映射

| 业务状态文案 | 语义颜色 |
|---|---|
| 在线 | success |
| 正常 | success |
| 已启用 | success |
| 已连接 | success |
| 已同步 | success |
| 已成功 | success |
| 可用 | success |
| 运行中 | success 或 info |
| 处理中 | info |
| 初始化中 | info |
| 同步中 | info |
| 排队中 | info |
| 加载中 | info |
| 待执行 | info 或 warning |
| 待处理 | warning |
| 部分异常 | warning |
| 即将超限 | warning |
| 资源偏高 | warning |
| 需关注 | warning |
| 风险较高 | warning |
| 离线 | danger |
| 失败 | danger |
| 异常 | danger |
| 已删除 | danger |
| 删除中 | danger |
| 已禁用 | disabled 或 danger（按风险语义决定） |
| 未启用 | disabled |
| 未配置 | disabled |
| 不可用 | disabled |
| 无数据 | default 或 disabled |
| 未知 | default |

---

## 三、判定优先级

当一个状态可能同时命中多个语义时，按以下顺序判断：

1. **是否有风险 / 是否会造成失败**
   - 有明显风险或失败后果：`danger`
2. **是否需要用户立即关注**
   - 需要关注但未失败：`warning`
3. **是否正在进行流程**
   - 正在进行、等待完成：`info`
4. **是否表示成功 / 正常**
   - 稳定成功、稳定可用：`success`
5. **是否只是中性信息**
   - 非重点状态：`default`
6. **是否不可用 / 未启用**
   - 不可交互、未配置、关闭：`disabled`

---

## 四、各组件映射规范

## 4.1 Badge

### 适用场景
- 状态标签
- 列表状态列
- 简短结果态
- 小型提示状态

### 规则
- Badge 是最常见的状态承载组件
- 优先使用 Badge 呈现“可扫读”的状态
- 同屏 Badge 颜色种类应尽量少
- 同一状态在所有页面必须映射一致

### 映射
- `success` -> 成功/在线/正常类 Badge
- `info` -> 流程中/同步中/处理中类 Badge
- `warning` -> 需关注/待处理/接近阈值类 Badge
- `danger` -> 失败/离线/异常/删除类 Badge
- `disabled` -> 未启用/未配置/不可用类 Badge
- `default` -> 中性/未知/普通标识类 Badge

### 禁止
- 同一页面出现过多彩色 Badge
- 用 Badge 承载大段说明文字
- 把 `disabled` 做得像 `warning`

---

## 4.2 Alert / Notice

### 适用场景
- 页面级提示
- 弹窗内风险提示
- 表单区说明
- 错误态说明

### 规则
- 只用于需要额外解释的提示
- 默认优先轻量 alert，不用大面积重背景
- 一屏内不要同时出现多个主提示区

### 映射
- `info` -> 普通提示、说明、流程提示
- `success` -> 成功反馈、操作完成
- `warning` -> 可恢复问题、需注意事项
- `danger` -> 阻断错误、不可逆风险、关键失败

### 禁止
- 用 success/warning/danger 做大面积情绪化色块
- 同类问题在不同页面使用不同 alert 级别

---

## 4.3 Button

### 适用场景
- 主操作
- 次操作
- 危险操作
- 状态切换操作

### 规则
- 按钮颜色优先表达“操作性质”，不是“页面氛围”
- 页面主按钮通常不需要带状态色，除非操作本身是危险或确认类
- danger 只能用于真正危险的操作

### 映射
- 默认主操作：`default` 或主品牌色
- 信息类辅助操作：`info` 或默认次级
- 保存成功态不通过按钮长期着色表达，应通过反馈提示表达
- 删除/清空/重置/不可逆：`danger`
- 不可点击：`disabled`

### 禁止
- 把 warning/danger 按钮用在普通操作上
- 用 success 按钮表示“这个页面是好的”
- 同一类操作按钮不同页面不同颜色

---

## 4.4 Progress / Resource Indicators

### 适用场景
- CPU
- RAM
- 磁盘
- 流量
- 使用率
- 队列占用
- 配额消耗

### 核心原则
**进度条颜色按风险走，不按指标种类走。**

### 规则
- 正常区间：`default` 或 `success`
- 接近阈值：`warning`
- 超阈值：`danger`

### 示例
- CPU 28% -> default
- CPU 74% -> warning
- CPU 93% -> danger

### 禁止
- CPU 永远蓝色
- RAM 永远绿色
- 磁盘永远橙色

原因：
这种固定颜色只表达“指标类型”，不表达“风险程度”，会降低扫表效率。

---

## 4.5 Table Row / Text / Icon

### 状态列
- 状态优先用 Badge 或 icon + text 表达
- 不建议直接把整列文字染满颜色
- 正文文本应保持高可读性，颜色只做辅助

### 图标
- success：正常/通过/已启用
- info：说明/处理中
- warning：需关注
- danger：错误/失败/高风险
- disabled：未启用/不可用

### 整行高亮
- 尽量少用
- 只有在异常、选中、告警需要强提醒时使用
- 整行高亮也必须轻量，不可压过正文可读性

### 禁止
- 大面积彩色文字正文
- 靠颜色单独传达所有含义，不配文字或图标
- 一张表里状态颜色过多，影响扫表

---

## 五、业务状态映射建议

## 5.1 节点 / 服务器类

| 状态 | 建议语义 |
|---|---|
| 在线 | success |
| 离线 | danger |
| 未知 | default |
| 异常 | danger |
| 部分异常 | warning |
| 升级中 | info |
| 初始化中 | info |
| 已禁用 | disabled |
| 已删除 | danger |

## 5.2 Agent / 服务类

| 状态 | 建议语义 |
|---|---|
| 已安装 | success |
| 未安装 | disabled |
| 升级可用 | warning |
| 升级中 | info |
| 升级失败 | danger |
| 已停止 | disabled 或 warning |
| 运行中 | success |

## 5.3 任务 / 作业类

| 状态 | 建议语义 |
|---|---|
| 待执行 | info |
| 排队中 | info |
| 运行中 | info |
| 部分成功 | warning |
| 已成功 | success |
| 已失败 | danger |
| 已取消 | default 或 disabled |

## 5.4 通知 / 告警类

| 状态 | 建议语义 |
|---|---|
| 已发送 | success |
| 发送中 | info |
| 待发送 | info |
| 重试中 | warning |
| 发送失败 | danger |
| 已关闭 | disabled |

## 5.5 配置 / 接入类

| 状态 | 建议语义 |
|---|---|
| 已配置 | success |
| 未配置 | disabled |
| 配置不完整 | warning |
| 校验失败 | danger |
| 校验通过 | success |

---

## 六、文本与背景强度规则

### 规则
- 正文内容优先使用正常文字颜色，不大面积染色
- 颜色主要落在：
  - Badge
  - Alert
  - Icon
  - Progress
  - Button
- 状态背景默认轻量
- 危险背景不要过饱和
- 状态色应服务于扫读，而不是让页面花掉

### 推荐强度
- 文本：轻度带语义
- 边框：比文本更弱
- 背景：最弱
- 图标：可略强于文字
- 按钮 danger：最强，仅限危险操作

---

## 七、颜色与文案共同表达

### 原则
颜色不能单独承担全部语义。

### 要求
- 状态尽量使用“颜色 + 文案”
- 高风险状态优先使用“颜色 + 图标 + 文案”
- 不要只靠颜色区分 success / warning / danger
- 色弱用户仍应能理解状态

### 示例
推荐：
- `Badge(danger) + 文案“离线”`
- `Alert(warning) + icon + 文案“接近阈值”`

不推荐：
- 一个红点，不写任何文字
- 一段黄色背景，不说明风险是什么

---

## 八、统一来源规则

### 原则
所有状态颜色必须来自统一语义映射，而不是页面临时决定。

### 要求
- 页面代码不要自己决定“这个状态今天用蓝色”
- 状态到颜色的映射应尽量通过：
  - shared helpers
  - variant 映射函数
  - 统一常量
  来完成

### 推荐
创建统一 helper，例如：

- `getStatusVariant(status)`
- `getRiskVariant(level)`
- `getUsageVariant(percent)`

而不是在页面里到处写 if/else + className。

---

## 九、禁止项

- 同一业务状态在不同页面颜色不同
- warning / danger / disabled 混用
- 资源指标按指标类型固定颜色
- 大量页面直写颜色类
- 用渐变、强背景、过饱和色块表达普通状态
- 用颜色装饰替代状态语义
- 不写状态文案，只给颜色
- 在表格正文大面积使用彩色文字

---

## 十、DoD

涉及状态颜色的 UI 改动完成前，必须检查：

- 是否使用统一语义：default / info / success / warning / danger / disabled
- 同一状态是否与全项目一致
- 颜色是否表达风险，而不是表达“我想区分一下”
- 是否同时提供了状态文案
- warning / danger / disabled 是否可明显区分
- 资源指标是否按阈值变色
- 页面是否存在大量直写颜色类
- Badge / Alert / Button / Progress 是否符合统一规则
- 是否通过 lint / typecheck / build / test

# Markdown 阅读样式

所有经过 Hexo 渲染的 Markdown 使用同一套标题、提示块、引用、表格、折叠块与移动端规范，再按内容类型调整阅读宽度、字体和行距。已有文章已添加样式字段，正文、原有分行、分类、标签、链接及时间字段保持原样。首页、标签、分类、总览和木缘桑庭保留各自的专门布局。

## 头字段

在原 frontmatter 中添加：

```yaml
reading_style: story
reading_tone: blue
```

`reading_style` 只控制呈现方式，不改变文章的分类和标签。`reading_tone` 控制标题、标签与引用等处的点缀色，省略时优先沿用元素标签的颜色，再使用该类型的默认色。

| 值 | 内容类型 | 排版特点 |
| --- | --- | --- |
| `story` | 故事、人物叙事 | 衬线正文，较窄阅读栏，18px 正文与舒展行距，正文段首缩进 |
| `lore` | 世界设定、神系、规划 | 16px 正文，突出章节与条目层级，条目标题使用浅色底，表格便于查阅 |
| `essay` | 随笔、感受与记录 | 18px 正文，较窄阅读栏，保留原有分行和自然段 |
| `poetry` | 诗歌、诗化表达 | 衬线正文，更宽松的行距与段间距，保留诗行 |
| `info` | 项目、公告、链接说明 | 紧凑正文，简洁的资料提示块、链接和表格 |
| `profile` | 人物与协作者档案 | 资料分区与角色图片；桌面图片分栏，手机纵向阅读 |
| `guide` | 时间线与篇目导览 | 木缘桑庭使用时代时间轴、类型篇目索引与可展开解读 |

`home` 和 `directory` 是现有首页与目录页的保留值，继续使用其专门模板。无需把正文中的每一段包进 note 标签，独立标题已经有清晰的层级。

可选颜色为 `violet`、`blue`、`green`、`cyan`、`amber`、`rose`。不要填写未支持的类型或颜色，构建会明确报错，以免悄悄套用错误样式。

## 标签与媒体

- 原有 `note` 的五种语义颜色保留。带标题的静态 note 使用单层书页章节框：标题采用清晰的语义色，整块使用浅色底和同色细边，旁侧细线由短段实色过渡至淡色，不使用折角、独立标题色块和叠纸阴影。标题与块内直接正文共用同一左边缘，不再额外内缩；长标题自然换行，仅含标题和包含正文的 note 使用相同外框。无标题 note 和原生折叠块保留各自语义色边线与留白。
- 带标题的折叠 note 保留原有展开状态，支持鼠标及键盘。既有按钮、弹窗脚本和 iframe 继续保留。
- 表格置于可横向滚动且可聚焦的容器内，窄屏时不会挤宽整个页面。
- 正文链接默认使用红色加粗与下划线，暗色模式自动提高亮度；悬停与键盘聚焦继承最近 note 或内容容器的主题色，使用同色浅底和字体色。未包裹时使用默认红色交互主题。规则覆盖 posts、直接页面、嵌套页面和菜单阅读器，导航和图片入口保留各自交互。
- Markdown `>` 引用使用居中衬线字体、主题色文字和半透明细边底框；保留原有诗行、链接与加粗，引用不做首行缩进。原有 note 的框状样式保留。
- 正文中的按钮使用随主题变化的浅色底和细描边，控制尺寸与正文行高协调；弹窗使用纸面、主题色顶线及同系操作按钮。已有点击脚本、弹窗文字和关闭行为保留。
- 图片和视频保持比例并居中；人物图组桌面三栏、手机单栏。同源独立 HTML 与 iframe 共用主题变量，保留各自内容结构与原有交互。
- 普通自然段自动缩进两个字符，Markdown 的文本换行分别渲染为可缩进的段落行；诗文保留原来的诗行。列表、表格、标题、图片说明与操作控件按各自语义排布。
- 元数据、联系信息、邀请和资源说明不缩进。原有手动全角空格保留于隐藏节点，避免自动缩进变成四字缩进，源文件保持不变。
- 加粗继承所在正文的字体与字号；行内代码统一使用等宽字体、中文回退字体与克制的底色。
- 共用视觉规则及维护边界见 [SITE_STYLE.md](SITE_STYLE.md)。页面顶部和正文使用同一阅读宽度。
- 新文章模板 `scaffolds/post.md` 已提供 `reading_style` 字段，可根据内容修改。

## 章节、说明与并列条目

需要明确区分主章节、说明和同级条目时，可使用以下三个嵌套块标签。标题和正文仍使用原有 Markdown，已有 note 可以放在并列容器内。

```njk
{% content_section violet 01 %}
## 主章节

{% content_panel blue %}
### 前置说明

说明正文。
{% endcontent_panel %}

{% content_grid rows %}
{% note info %}
### 条目一

条目正文。
{% endnote %}

{% note info %}
### 条目二

条目正文。
{% endnote %}
{% endcontent_grid %}
{% endcontent_section %}
```

- `content_section 颜色 [编号]`：主章节，使用独立纸面与同色普通大标题；编号为可选的 1–2 位数字，仅作为结构标记。
- `content_panel 颜色`：前置说明或 Q&A，使用浅色底和侧边线。颜色支持前述六种 `reading_tone` 值。
- `content_grid rows|columns`：同级条目；`rows` 纵向排列，`columns` 桌面双栏、767px 及以下单栏，默认 `rows`。原来的有序列表起始编号会保留。

这些容器按需使用，章节标题直接落在纸面上，避免重复外框。内部自然正文保留两个字符的首行缩进；仅含链接的条目、note 内的直接说明与列表左对齐，引用采用前述居中样式。阴行世界使用四个主章节，保留原文、原标题、链接及元数据。

`{% content_panel blue steps %}` 可将其直接包含的 `#####` 小标题与后续正文组织为编号条目，直到下一个同级小标题。编号由 UI 生成，不写入原文；标题锚点和段落顺序保留。阴行世界的 Q1、Q3 分别采用 3 项和 5 项分组。

`content_panel` 支持可组合的排布选项：`plain` 用于同级问答，保留统一的小标题标记并去掉外框；`compact` 用于短问题或维度列表，以小色标区分主题、减少内边距；`steps` 用于编号的长条目。例如 Q1/Q3 使用 `{% content_panel blue plain steps %}`，Q2 使用 `{% content_panel blue plain %}`，Q2 的四个维度使用 `{% content_panel violet compact %}` 等标签。可配合 `content_grid columns` 在桌面双栏、手机单栏显示，原来的列表序号保持。文章无需内联 CSS 或专属样式。

`{% content_grid columns framed %}` 为一组并列内容增加统一的 1px 中性细框，内部子项不增加框；用于将 Q2 的四个维度与前后说明分开。颜色跟随全站正文色，明亮模式是黑色细线，暗色模式对应浅色细线。

`{% content_panel amber group %}` 将一个子标题及其内容组织为分组，原标题作为浅色标题条，不新增文字；分组间可用 `------` 保留全站统一的空白分割。`separated` 可与 `plain steps` 等选项组合，为并列问答添加一致的细顶线与间距。众生回廊使用金色（`amber`）章节，两个 `group` 分别承载前置说明和具体内容，前置说明中的 Q1/Q2/Q3 均使用 `separated`；信息型 note 保持原来的蓝色。

共用链接、引用、编号条目和弹窗排布由 `source/_data/prose-ui.styl` 维护，弹窗主题继承脚本为 `source/js/world-content-ui.js`。

Markdown 分割线保留“空白、视觉断开”的样式：隐藏线条和伪元素装饰，以透明留白分隔相邻纸面；不会将多个章节合成连续的背景块。与“总览”共用 `--world-separator-gap`：桌面 34px、手机 24px；相邻章节不再叠加上下外边距。

标签入口为 `scripts/content-containers.js`，渲染逻辑为 `lib/content-containers.cjs`，共享样式为 `source/_data/content-containers.styl`。

## 实现与检查

类型选择与正文装饰位于 `lib/reading-profiles.cjs`，Hexo helper 位于 `scripts/reading-profiles.js`，样式位于 `source/_data/reading-profiles.styl`。修改 helper 后应重启本地 Hexo 服务；修改样式后清理并构建。

```powershell
npm.cmd run test:directory
```

该命令验证目录和标签，逐项核对所有 Markdown 的原文、标题锚点、链接、图片、脚本、折叠块与内嵌页面。此次原文件备份保存在忽略发布的 `.repair-backups/20261001/markdown-reading/`，不会被 Hexo 当成重复文章渲染。

如需对照一次排版前的文件快照校验 Markdown 字节和元数据，设置 `MARKDOWN_BASELINE_MANIFEST` 为该次备份的清单路径，再运行检查。历史快照不会默认限制日后的正文更新。

浏览器检查为 `tests/reading-profiles-browser.cjs`，使用 Playwright 和 Chrome，检查全部50份渲染 Markdown 的桌面与手机页面，并对各类型样例补充平板与320px窄屏检查。

`tests/notes-browser.cjs` 检查不同正文量的 note 边框一致性、封面标题对齐与间距、链接悬停及键盘高亮；右上角书签按钮通过 `_config.next-restored.yml` 的 `bookmark.enable: false` 关闭。

`tests/markdown-deep-browser.cjs` 进一步测量全部 50 份源 Markdown 的实际首字位置，核对顶部元数据、正文和 UI 缩进边界、不透明底色、红色链接与末尾排布；覆盖桌面/手机及明暗模式，并保存每页顶部和末尾截图。

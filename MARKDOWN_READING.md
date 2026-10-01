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

- 原有 `note` 的五种语义颜色保留，统一使用轻边框、左侧色线与留白。仅含标题和包含正文的 note 使用相同外框，不根据内容多少自动去掉边框。
- 带标题的折叠 note 保留原有展开状态，支持鼠标及键盘。既有按钮、弹窗脚本和 iframe 继续保留。
- 表格置于可横向滚动且可聚焦的容器内，窄屏时不会挤宽整个页面。
- 正文链接在悬停与键盘聚焦时使用浅色底高亮，拖选文字使用主题选区色。
- 图片和视频保持比例；人物图组桌面三栏、手机单栏。原生 HTML 页面及 iframe 内部页面保持各自样式。
- 新文章模板 `scaffolds/post.md` 已提供 `reading_style` 字段，可根据内容修改。

## 实现与检查

类型选择与正文装饰位于 `lib/reading-profiles.cjs`，Hexo helper 位于 `scripts/reading-profiles.js`，样式位于 `source/_data/reading-profiles.styl`。修改 helper 后应重启本地 Hexo 服务；修改样式后清理并构建。

```powershell
npm.cmd run test:directory
```

该命令验证目录和标签，逐项核对所有 Markdown 的原文、标题锚点、链接、图片、脚本、折叠块与内嵌页面。此次原文件备份保存在忽略发布的 `.repair-backups/20261001/markdown-reading/`，不会被 Hexo 当成重复文章渲染。

浏览器检查为 `tests/reading-profiles-browser.cjs`，使用 Playwright 和 Chrome，检查全部50份渲染 Markdown 的桌面与手机页面，并对各类型样例补充平板与320px窄屏检查。

`tests/notes-browser.cjs` 检查不同正文量的 note 边框一致性、封面标题对齐与间距、链接悬停及键盘高亮；右上角书签按钮通过 `_config.next-restored.yml` 的 `bookmark.enable: false` 关闭。

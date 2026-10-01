# 分类与内容入口

总览 `/archives/` 按文明、子分类、文章逐级展示。分类入口 `/categories/` 提供文明分区卡片，每个分类页包含完整路径、子分类入口和全部相关文章。

总览末尾与分类入口均提供四个内容区的入口，对应原文顶部也有内容导航：

- `/yinxing_world/`：众生回廊、合作赠稿、现世之篇、世界区域，共七篇独立页面。
- `/light_withme/`：发行计划、协作者档案、测试题部分与扩列内容。测试使用原文的外站链接；扩列内容平铺各个独立页面，读取 HTML 标题，不展示子文件夹与编辑工具。
- `/bingjie_domain/`：五个网站与微信公众号，使用彩色图标卡片；公众号点击弹出二维码。原文 `/posts/25.html` 同样使用卡片展示。
- `/yanghui_days/`：发展历程、世界导读、设定集；栏目跳转原文标题，设定集使用原文下载链接。

文件夹中的正文页显示同目录导航，当前内容高亮。发行计划封面限制高度，取消负边距，避免与导航重叠。左侧标签改为彩色标签簇，显示数量，支持鼠标、键盘与正常页面滚动。

`/tags/` 使用标签阅读地图，明确分成文化体系、十二元素、世界三元三种类型，显示类型说明、标签数量及相关内容数量。每个标签卡片展示真实文明分布、最近更新的两篇相关文章及分类路径。侧栏只提供居中的紧凑筛选按钮，形成内容信息上的区别；“创作”分组改名为“三元”，排列为创造、记录、感知。单个标签结果页直接读取分页文章，显示分类路径及更新时间，不再使用遗漏“基础”分类的旧名单。九虹重启的两页分别展示十篇与一篇。

## 日常维护

- 文章仍放在 `source/_posts/`，使用原有 `categories` 分类链；新分类自动显示，不受排序名单限制。
- 独立页面仍放在 `source/yinxing_world/`、`source/light_withme/` 的子目录中。标题、日期和作者来自页面元数据；独立 HTML 优先读取文档标题，简介取自正文。
- 子目录的中文名称、说明，以及文明和分类的优先顺序，配置于 `source/_data/content_directory.yml`。未配置的新目录自动使用文件夹名称。
- 目录样式位于 `source/_data/content-directory.styl`，仅作用于目录与同目录导航。
- 页面模板位于 `themes/next-restored/layout/`；自动收录逻辑位于 `scripts/content-directory.js` 与 `lib/content-directory.cjs`。
- `source_post`、`headings` 从原文查找资源；`direct_links` 使用原文链接，`qr` 打开二维码；`flatten` 平铺子目录内容，`exclude_index` 排除该分区根目录的工具页。卡片简介剔除“定向到”的跳转说明。
- 网站图标位于 `source/images/directory/`，来源为各站首页实际配置的 favicon。二维码交互位于 `themes/next-restored/source/js/directory-interactions.js`，支持 Escape 与焦点恢复。

## 检查与预览

```powershell
npm.cmd run test:directory
npm.cmd run server
```

检查命令会清理 Hexo 缓存、重新构建，并验证文章覆盖、分类路径、文件夹内容与同目录导航。修改自定义 Stylus 文件后，先运行 `npm.cmd run clean` 再构建，以免继续使用旧 CSS。已运行的 Hexo 服务需要重启才能加载新增的脚本和配置。

浏览器检查脚本为 `tests/directory-browser.cjs`，需可用的 Playwright 与 Chrome；可通过 `NODE_PATH` 指向已有 Playwright 环境，通过 `CHROME_PATH` 指定浏览器路径。检查桌面、平板、手机布局、封面间距、导航、标签交互与二维码。截图保存在忽略提交的 `.repair-backups/20261001/directory-ui-v2/`。

图标来源：`https://picbed.sch-nie.com/social/world.jpg`、`https://picbed.sch-nie.com/social/zero.jpg`、`https://blog.sch-nie.com/img/blog.png`、`https://ark.sch-nie.com/favicon.svg`、`https://launcher.sch-nie.com/favicon.svg`。

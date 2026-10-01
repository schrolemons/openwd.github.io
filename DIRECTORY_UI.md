# 分类与内容入口

总览 `/archives/` 按文明、子分类、文章逐级展示。分类入口 `/categories/` 提供文明分区卡片，每个分类页包含完整路径、子分类入口和全部相关文章。

总览末尾与分类入口均提供四个内容区的入口，对应原文顶部也有内容导航：

- `/yinxing_world/`：众生回廊、合作赠稿、现世之篇、世界区域，共七篇独立页面。
- `/light_withme/`：发行计划、协作者档案、测试题部分。测试使用原文的外站链接；扩列内容不再展示在主目录及导航中，其原有独立页面链接仍可访问。
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
- `hidden_from_collection` 从主目录及同级导航中隐藏分区，同时保留独立页面和分区旧链接。
- 网站图标位于 `source/images/directory/`，来源为各站首页实际配置的 favicon。二维码交互位于 `themes/next-restored/source/js/directory-interactions.js`，支持 Escape 与焦点恢复。

首页 `source/index.md` 使用 `home` 布局，原文介绍、公告和导航表仍是内容来源；`lib/reading-layout.cjs` 将其组织为开篇、公告、介绍和导引。木缘桑庭 `/posts/24.html` 同样从原文渲染：时代组成时间轴，篇目直接展示概述，导言、定位、结构与资料可展开查看，抉择点的不同发展方向分栏排列。正文及日期仍在原 Markdown 中维护，保留标题锚点。样式独立于其他文章，位于 `source/_data/reading-layout.styl`。

首页依次展示 WORLD 开篇、动态公告、网站介绍、导引；开篇右下角三元顺序为感知、创造、记录。木缘桑庭的“内容包含”使用彩色类型索引，可跳到对应篇目的解读；时代及抉择点中以“【内容】”开头的条目自动显示为同色篇目块。页首阅读说明突出时间线顺序与“第九边缘宇宙”的术语含义。全站 Markdown 的类型头字段与阅读规范详见 `MARKDOWN_READING.md`。

首页开篇采用深紫主视觉与分层 WORLD 标题，导引使用无背景的篇目列表及署名收尾。抉择点内的“【内容】”使用细分隔线与轻量链接，区别于普通时代的内容索引卡片。

## 检查与预览

```powershell
npm.cmd run test:directory
npm.cmd run server
```

检查命令会清理 Hexo 缓存、重新构建，并验证文章覆盖、分类路径、文件夹内容与同目录导航。修改自定义 Stylus 文件后，先运行 `npm.cmd run clean` 再构建，以免继续使用旧 CSS。已运行的 Hexo 服务需要重启才能加载新增的脚本和配置。

`tests/reading-layout.test.cjs` 额外核对首页内容、木缘桑庭全部正文、时代顺序、标题锚点和链接；`tests/reading-browser.cjs` 检查首页与阅读导览的四种宽度、目录跳转、正文链接与键盘展开交互，截图保存在 `.repair-backups/20261001/reading-ui/`。

浏览器检查脚本为 `tests/directory-browser.cjs`，需可用的 Playwright 与 Chrome；可通过 `NODE_PATH` 指向已有 Playwright 环境，通过 `CHROME_PATH` 指定浏览器路径。检查桌面、平板、手机布局、封面间距、导航、标签交互与二维码。截图保存在忽略提交的 `.repair-backups/20261001/directory-ui-v2/`。

图标来源：`https://picbed.sch-nie.com/social/world.jpg`、`https://picbed.sch-nie.com/social/zero.jpg`、`https://blog.sch-nie.com/img/blog.png`、`https://ark.sch-nie.com/favicon.svg`、`https://launcher.sch-nie.com/favicon.svg`。

## 分支与部署

`source` 保存 Hexo 源码，`main` 是现有 Hexo 发布配置指定的生成站点分支。根目录 `vercel.json` 使用 `git.deploymentEnabled.source: false` 排除源码分支的 Git 自动部署。提交源码使用 `git push origin source`；正式站点发布沿用 `_config.yml` 的部署设置。

# 全站视觉体系

面向 Agent 的视觉设计原则、内容结构判断与验收要求，集中记录于 [网站视觉方案参考（Agent 指南）](docs/网站视觉方案参考.md)。具体标签写法见 [Hexo 额外 Markdown 样式使用说明](docs/Hexo额外Markdown样式使用说明.md)；本文件继续维护全站样式职责与实现入口。

## 样式所有者

- `source/_data/world-tokens.styl`：明暗主题、纸面、文字、语义色、间距、字体及交互色。
- `world-components.styl`：按钮、焦点、顶部元信息、页末说明、主题切换、弹窗与嵌入外壳。
- `world-prose.styl`：段落、强调、行内代码、标题、分割线、note、表格和媒体。
- `prose-ui.styl`：所有 Markdown 和菜单阅读器的统一链接、强调引用、编号条目与正文按钮/弹窗呈现。
- `reading-profiles.styl`：故事、诗文、设定、随笔、信息、人物档案和导览的阅读宽度、字体与节奏。
- `content-directory.styl`、`reading-layout.styl`：保留目录和时间线的内容结构，公共表面与文字引用设计变量。
- `lib/content-layout.cjs`、`content-modules.styl`：发行计划、协作者及关于的内容结构适配；源文不加页面样式，模块沿用公共标题、纸面、字体、链接和折叠规则。
- `home-refinement.styl`、`home-letter.styl`：仅首页的信封、信纸与艺术布局。
- `welcome-dialog.styl`：仅 `.world-welcome-dialog` 欢迎弹窗的纸面、原文标题层级与金色操作按钮，不添加 logo 或图案；自动聚焦采用细内描边，沿用共用明暗主题变量。
- `world-standalone.styl`：受控独立 HTML 的 UI 适配，保留原画布、星图和内容交互。

欢迎弹窗的“最新更新时间”由 `scripts/build-date.js` 在每次 Hexo 生成前按 `Asia/Shanghai` 固定日期，经首页模板的 `data-world-built-at` 注入页面。无需在 Markdown 中填写日期；访客打开页面不改变时间，下一次生成会重新计算。日期表示构建时间，发布后线上页面读取该次构建的日期；动态公告等原文日期保持独立。

不在单篇 Markdown 中声明配色与组件样式。新内容通过 `reading_style` / `reading_tone` 声明阅读类型与语义分类；同一角色的按钮、链接、note 和标题使用共用规则。

协作者档案由内容适配器组织为人物卡，姓名、原文角色与已有入职日期在折叠前可读；原始贡献介绍仍使用 details 展开。管理条目组织为文件类型标记、标题说明和文件操作的紧凑资源卡。发行计划保留阶段结构，关于保留邀请、联系和赞赏的不同内容角色。

「添加微信」使用 `data-qr-src` 接入共用原生 dialog，读取站内现有二维码文件，支持 Escape、关闭按钮和遮罩关闭并恢复焦点；原图 href 保留作为无脚本及修饰键打开的入口。`directory-interactions.js` 是共用二维码行为所有者，`.directory-qr-dialog` 使用 border-box 限制手机弹窗宽度。

## 渲染规则

`lib/reading-profiles.cjs` 保留原文节点，将顶层章节与原有分割线组织成静态阅读分区。普通自然段使用两个汉字的首行缩进；旧 Markdown 在同一段中用 `<br>` 换行的文本逐行组成自然段，保留原始换行、链接、加粗与代码节点。列表、表格、标题、摘要控件和图片说明不套用自然段缩进；诗文保留原始诗行。媒体与表格容器居中。

联系文案、资源说明、邀请及协作入口标为 `world-ui-copy`，不使用正文缩进。旧文手动输入的全角或不换行空格保留在 DOM 的 `world-source-indent` 节点中并隐藏，避免与自动缩进叠加；源 Markdown 不改写。加粗继承所在段落字号与字体，行内代码使用等宽字体及中文回退。

顶部信息、路径导航、正文、页末与评论区使用同一完整阅读列，超宽屏也不交替伸缩。作者、日期和更新信息来自明确的原始 frontmatter，缺失字段不由文件时间或站点作者补造。分类兼容 Hexo Query、数组及单个字符串。

版权声明由 `world_copyright_enabled` 共用判定：配置具有 `creative_commons.license`、开启 `creative_commons.post`，且文档未设置 `copyright: false`。正式 Markdown 内容页与 post 共用 `post-copyright.njk`，读取当前文档的作者、永久链接以及 `post_link` / `copyright_reprint` 转载字段，不改写源 Markdown。非文章用途的首页、目录、404、测试页与第三方库说明不自动加入声明；原有 post 的许可开关行为保持一致。

总览、分类和标签索引也使用同一元信息 partial；生成上下文缺少 source 时按实际路径查找原始页面，仅提取其明确字段。目录路径放在顶部纸面内，列表、说明、分组标题、二维码卡及标签页末说明均有不透明底色。

## 主题与交互

`source/js/world-theme.js` 在 head 同步读取 `localStorage.darkmode`，保留旧用户选择；未选择时跟随系统。跨页面、标签页及同源独立 iframe 使用同一状态来源。主题按钮采用抽象半色几何标记，并提供可访问的名称与状态。

电脑和手机的返回顶部使用与主题切换相同的 40px 圆角纸面按钮，保持同一底部水平线；进度以小号等宽数字置于细线箭头下方，百分比不会撑宽控件。手机端目录按钮位于其上方，间距 10px。左侧边距在电脑端为 24px，手机端为 16px；保留触控功能，并采用原生 button 支持键盘操作，底部位置兼容安全区。按钮外观为共用规则，媒体查询仅调整位置。

返回顶部在页面初始化及 `pageshow` 恢复阅读位置时同步进度，滚动不足 5% 时隐藏；锚点和刷新恢复的位置无需额外滚动便可显示正确进度。

侧栏导航使用中性悬停底色及清晰的标记；文章入口及导览解读的悬停底色跟随各自语义色。正文链接默认红色、加粗与下划线，悬停及键盘聚焦继承最近 note 或内容容器的主题色，添加同色浅底并保留细下划线，不改变文字几何尺寸。未包裹时沿用默认红色交互主题；暗色模式使用对应明亮色。正文按钮采用主题色浅底与细描边，尺寸适配正文行高；弹窗使用纸面、主题色顶线与同系操作按钮，原有文字和行为保持。

`scripts/site-presentation.js` 为公共 CSS、主题脚本和二维码行为脚本生成内容版本号，防止新 HTML 配合旧缓存样式。关于页的邀请标题和联系卡有明确层级，赞赏栏使用低饱和金色细边、内框和几何标记，金额与日期明确分开，保留原始数值及脚本。

发行计划由 `lib/content-layout.cjs` 根据原文组织为纯文字三元索引、12/12/4 数量卡、现况任务和两步参与流程。三元按感知、创造、记录排序，不新增标识图案；数量均来自原文，不添加日期、完成比例或未声明的阶段。图片、标题锚点与所有链接保持原样，源 Markdown 不写入视觉规则。三元原文介绍、首页介绍与标签导航同步采用同一顺序。

发行计划支持简短标题和既有带前缀标题：简短标题不补充重复前缀，既有前缀与主标题并排，隐藏原分隔短横线但保留源文本及锚点。任务和参与卡片同时支持独立自然段与段内换行；现况 01 使用统一纸面，“当前时间点”与“欢迎访问”使用同一提示框样式，提示框不做正文缩进。

`decorateFileNotes` 为普通静态 note 添加书页章节框：同色细边、整块浅色底、直接落在纸面上的语义色标题和旁侧细线。颜色遵循原有 note 类型；标题色为 90% 语义色混合正文色，边框混入 40% 语义色，纸面混入 6% 语义色，细线由短段实色过渡至淡色。不使用折角、独立标题色块或叠纸阴影。标题原有文字、链接与锚点保留在可换行的行内内容容器中；标题和块内直接正文共用同一左边缘。块外正文保留原阅读缩进，原生 details 及已经定制的内容模块保留自身组织方式。目录入口颜色由 `featureTone` 优先读取文章首个静态 note 的类型，无 note 时使用阅读主题，资源卡的显式配色仍优先。

`lib/standalone-presentation.cjs` 为独立 HTML 注入公共资产，不重写其正文或原脚本。`scripts/raw-html.js`、`redirect-pages.js` 使 Hexo server 与静态生成入口一致。Markdown 中有意隔离的任意 rawhtml 内容保留原文，其外壳使用共同规则。

## 可复用正文容器

`source/_data/content-containers.styl` 负责按需使用的章节、说明区和并列条目；统一继承 `world-tokens` 的六种语义色和明暗模式纸面颜色。`scripts/content-containers.js` 注册 `content_section`、`content_panel`、`content_grid`，选项和 HTML 外框由 `lib/content-containers.cjs` 管理。具体 Markdown 用法见 `MARKDOWN_READING.md`。

章节使用普通大标题和细线，不重复增加外框；说明区使用侧边线，同级条目共用网格与间距。自然正文保留两字符首行缩进，纯链接条目和直接 note 说明左对齐；引用居中并使用衬线字体和半透明底框。`content_panel 颜色 steps` 把直接包含的五级标题及后续正文组织为编号条目，不改写文字与锚点。不要在文章中写独立颜色值、用空格对齐或复制一套页面专属样式。现有总览、文章解读和其他专门布局继续由各自模块维护。

全站 Markdown 分割线用透明空白形成视觉断开，隐藏实线和伪元素。`--world-separator-gap` 与总览分区共用：桌面 34px、手机 24px；章节、普通文章和菜单阅读器的相邻纸面不叠加额外外边距。`tests/separators-browser.cjs` 对照总览实测纸面间距，并检查所有含分割线的 Markdown 页面。

`tests/content-containers.test.cjs` 检查嵌套渲染、链接与锚点、选项校验及 Stylus 编译后的配色；`tests/content-containers-browser.cjs` 检查阴行世界在 1440、390、320px 和明暗模式下的结构、颜色、双栏切换、首字对齐、溢出与目录跳转。

`content_panel` 的 `plain`、`compact`、`steps` 选项可组合复用：同级问答用 `plain`，短维度列表用 `compact`，长条目编号用 `steps`。大标题、直接子标题、问答标题、枚举项标题逐级降低字号；子标题不再重复横线，Q1/Q2/Q3 共用一种标题角色。Markdown 只选择语义色与排布，Hexo 渲染类名，共享容器样式管理外观。

`group` 将原标题与内容组织成独立分组，用浅色标题条说明分组边界；`separated` 为并列问答增加一致的细顶线。众生回廊的前置说明和具体内容使用两个金色分组，组间沿用 Markdown 空白分割；信息型 note 仍使用蓝色。细顶线属于问答组件，不能覆盖全站 `hr` 的空白分割规则。

阳汇彼日使用五个章节，日期与出版记录采用有序条目，四类创作物在桌面双栏、手机单栏呈现。光与流辰使用测试题部分、协作者档案、发行计划三个章节。栏目目录提取兼容 note、content_panel 和 content_section，保留原有标题锚点及直接链接入口。总览的文章行悬浮和键盘焦点继承所在目录分组的主题色，资源卡仍使用自身声明的颜色。

## 验证

先 clean/build，再执行内容保真与浏览器测试；公共脚本、模板或 `_data` 导入改变后重启 server，避免旧渲染缓存。

```powershell
npm.cmd run test:directory
node --test tests/site-presentation.test.cjs
node --test tests/content-layout.test.cjs
$env:NODE_PATH = 'C:\Users\24329\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:TEST_URL = 'http://localhost:4010'
node tests/site-style-browser.cjs --all
node tests/site-style-browser.cjs --small
node tests/site-style-browser.cjs --wide
node tests/markdown-deep-browser.cjs
node tests/content-modules-browser.cjs
node tests/refined-content-browser.cjs
node tests/plan-link-browser.cjs
node tests/standalone-style-browser.cjs
node tests/typography-browser.cjs
node tests/notes-browser.cjs
node tests/interactions-browser.cjs
node tests/directory-browser.cjs
node tests/reading-browser.cjs
node tests/homepage-browser.cjs
```

执行前源码快照和验收证据保存在 `.repair-backups/20261003/style-unification/`。最终验证范围记录于实施计划。

深度 Markdown 检查递归覆盖 `_posts`、直接页面与嵌套子目录中的 50 份源文件，按实际输出路由验证。使用浏览器 Range 测量首字真实位置，检查普通文章和定制目录的文字底色、正文链接、元数据、页末与移动端溢出；每页保留明暗两套、桌面和手机的顶部及末尾截图。

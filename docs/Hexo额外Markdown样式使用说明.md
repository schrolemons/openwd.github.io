# Hexo 额外 Markdown 样式使用说明

本文介绍本站已经实现的 Markdown 排版扩展，依据 2026-10-04 的代码整理。文章只需要选择容器、颜色和排布方式，由 Hexo 渲染成统一样式，无需在 Markdown 中写内联 CSS。

新增的块标签是 `content_section`、`content_panel`、`content_grid`。`note`、按钮、引用和链接仍沿用已有写法，主要调整了外观与交互。

面向 Agent 的组件选择原则、实现边界与验收要求，见 [网站视觉方案参考（Agent 指南）](网站视觉方案参考.md)。

## 1. 快速选择

| 想实现的效果 | 推荐写法 |
| --- | --- |
| 主章节、独立纸面、大标题 | `{% content_section amber 01 %}` |
| 普通说明框、浅色底与侧边线 | `{% content_panel blue %}` |
| 前置说明、具体内容等独立分组 | `{% content_panel amber group %}` |
| 同级问题，避免每题套大框 | `{% content_panel amber plain %}` |
| 问题之间增加一致的分界线 | `{% content_panel amber plain separated %}` |
| 长说明分成带 1、2、3 标记的条目 | `{% content_panel amber plain steps separated %}` |
| 短问题、分类维度、紧凑列表 | `{% content_panel violet compact %}` |
| 日期与事件用细竖线串联 | `{% content_panel rose plain steps timeline %}` |
| 关键词、风格等紧凑标签行 | `{% content_panel blue compact tags %}` |
| 同级条目纵向排列 | `{% content_grid rows %}` |
| 同级条目桌面双栏、手机单栏 | `{% content_grid columns %}` |
| 多个条目共用一个细线外框 | `{% content_grid columns framed %}` |
| 蓝色信息框 | `{% note info %}`，属于原有主题标签 |
| 强调引用 | 使用普通 Markdown 的 `>` |
| 空白分割 | 单独一行 `------` |

三个新增容器都必须配对关闭：

```text
content_section → endcontent_section
content_panel   → endcontent_panel
content_grid    → endcontent_grid
```

颜色写在容器名后，其他选项写在颜色之后。`content_grid` 的第一个参数是布局，不是颜色。

## 2. 可用主题色

| 参数 | 颜色含义 | 常见用途 |
| --- | --- | --- |
| `violet` | 紫色 | 世界设定、宏观内容 |
| `blue` | 蓝色 | 信息、提示、资料说明 |
| `green` | 绿色 | 发展、现世、自然相关内容 |
| `cyan` | 青色 | 当下、联系、清晰的分类标记 |
| `amber` | 金色／琥珀色 | 众生回廊、重要说明、归属 |
| `rose` | 玫瑰色 | 人物、关系、提醒 |

这些用途是排版建议，颜色不会改变文章分类。明暗模式使用同一参数，网站会自动调整实际颜色。

`amber` 的正文标题采用可读的金棕色，暗色模式使用较亮的金色，不会把长篇正文变成亮黄色。

## 3. 主章节：content_section

语法：`{% content_section 颜色 [编号] %}`。

```njk
{% content_section amber 02 %}

## 众生回廊

这里放置章节正文或其他容器。

{% endcontent_section %}
```

主章节使用独立纸面背景，`##` 标题采用章节主题色和细标题线。直接放在章节内的 `###` 子标题更小，避免重复画横线。

编号是可选的一位或两位数字，例如 `1`、`01`、`02`。目前只保存为结构标记，不会自动把“02”显示到标题前面。

不同主章节之间，可以使用本站统一的空白分割：

```njk
{% content_section violet 01 %}

## 第一章

第一章正文。

{% endcontent_section %}

------

{% content_section amber 02 %}

## 第二章

第二章正文。

{% endcontent_section %}
```

## 4. 内容模块：content_panel

语法：`{% content_panel 颜色 [选项…] %}`。没有选项时，是浅色底、细边与侧边线的普通说明框。

```njk
{% content_panel blue %}

### 前置说明

这里放置需要单独说明的正文。

{% endcontent_panel %}
```

### 4.1 group：把标题与内容组成一个分组

适合“前置说明”和“具体内容”这样的大分区。分组本身没有厚重外框，其直接包含的 `###` 标题显示为浅色标题条。

```njk
{% content_panel amber group %}

### 前置说明

这里放置阅读前需要了解的说明。

{% endcontent_panel %}

------

{% content_panel amber group %}

### 具体内容

这里放置正式内容。

{% endcontent_panel %}
```

标题条使用你原本写下的标题，不自动添加“前置声明”等新文字。两个分组之间的 `------` 仍是空白，不变成实线。

### 4.2 plain：同级问答，不重复套框

`plain` 去掉模块外框、底色和内部大留白，直接包含的 `####` 问题标题使用统一的字号和小色标。

```njk
{% content_panel amber plain %}

#### Q1：第一个问题？

问题的回答正文。

{% endcontent_panel %}
```

多个并列问题应使用相同的标题级别和容器选项。例如 Q1、Q2、Q3 都用 `####`，而不要让 Q2 成为 Q1 的子标题。

### 4.3 separated：为并列问题增加边界

通常与 `plain` 组合，为模块增加细顶线及标题上方的间距。

```njk
{% content_panel amber group %}

### 前置说明

{% content_panel amber plain separated %}

#### Q1：第一个问题？

第一个问题的回答。

{% endcontent_panel %}

{% content_panel amber plain separated %}

#### Q2：第二个问题？

第二个问题的回答。

{% endcontent_panel %}

{% endcontent_panel %}
```

这条细线属于问题模块的边界，与 Markdown 的空白分割线是两种不同用途。全站 `------` 的空白样式不会因此改变。

### 4.4 steps：长内容自动形成编号条目

`steps` 将模块内直接包含的 `#####` 标题及后续内容组成条目，自动添加圆形 1、2、3 编号。

```njk
{% content_panel amber plain steps separated %}

#### Q1：为什么需要这个角色？

##### 角色与自我

第一个条目的正文。

> 第一个条目中的强调引用。

##### 幻想与现实

第二个条目的正文。

##### 向内寻找

第三个条目的正文。

{% endcontent_panel %}
```

每个 `#####` 开始一个新条目，直到下一个同级标题；其中的段落、引用、链接和列表一起归入该条目。每个 `steps` 模块从 1 重新编号，数字由 UI 生成，不写入正文。

注意：这些 `#####` 必须直接属于这个 panel。如果再把标题包进别的容器，当前实现不会把它识别为本层编号条目。

### 4.5 compact：短问题与维度列表

`compact` 去掉模块边框和底色，用小色标、较小的 `#####` 标题与紧凑列表区分内容。

```njk
{% content_panel violet compact %}

##### 【宏观】

1. 第一个问题。
2. 第二个问题。

{% endcontent_panel %}
```

它适合放进并列网格。和 `steps` 不同，`compact` 不给标题生成编号；列表中的数字来自 Markdown 本身。

### 4.6 推荐组合

`timeline` 可与 `plain steps` 组合：五级标题写日期，后面的正文写事件。圆形编号之间由细竖线串联，事件文字与日期对齐，最后一项不再向下延伸。普通 `steps` 不受影响。

`tags` 可与 `compact` 组合：五级标题写类别名，无序列表写各个词条。类别名位于左侧，词条在右侧自动换行；词条只是信息标记，没有点击行为。多个类别可放进 `content_grid rows`，无需加大外框。例如：

```njk
{% content_panel blue compact tags %}

##### 关键词

- 文明塔
- 宇宙移动

{% endcontent_panel %}
```

| 组合 | 适合的内容 |
| --- | --- |
| 无选项 | 普通说明框 |
| `group` | 子章节、前置说明、具体内容 |
| `plain` | 无外框的同级问题 |
| `plain separated` | 有清晰边界的同级问题 |
| `plain steps separated` | 同级问题内部还有多个长条目 |
| `compact` | 网格中的短维度、问题列表 |

选项可以组合，但建议先使用以上组合，避免让同一个模块同时承担“分组标题条”和“紧凑条目”等不同角色。

## 5. 并列布局：content_grid

语法：`{% content_grid rows|columns [framed] %}`。

`rows` 纵向排列；`columns` 在桌面使用两列，在 767px 及以下自动变为一列。省略布局参数时默认使用 `rows`。

网格中的每个条目应放在独立的 `content_panel` 或 `note` 中。这样标题和正文属于同一个网格项，不会被拆成多个格子。

### 四个维度共用一个细框

下面是 Q2 所采用的排布方式：一个统一外框，内部四个维度不再各自套框。

```njk
{% content_grid columns framed %}

{% content_panel violet compact %}

##### 【宏观】

1. 第一个问题。
2. 第二个问题。

{% endcontent_panel %}

{% content_panel cyan compact %}

##### 【当下】

3. 第三个问题。
4. 第四个问题。

{% endcontent_panel %}

{% content_panel green compact %}

##### 【发展】

5. 第五个问题。
6. 第六个问题。

{% endcontent_panel %}

{% content_panel amber compact %}

##### 【归属】

7. 第七个问题。
8. 第八个问题。

{% endcontent_panel %}

{% endcontent_grid %}
```

`framed` 使用一个 1px 中性细框。明亮模式是黑色细线，暗色模式变为浅色细线；只有外层网格有框。各列表的起始序号 1、3、5、7 会保留。

如果希望前后说明在框外，把它们写在 `content_grid` 标签之前或 `endcontent_grid` 之后。

## 6. 原有 note：保留框状特点

`note` 是原有 Hexo 主题标签，新增的是统一外观：取消折角，保留同色细边、浅色纸面、主题色标题及旁侧细线。标题与直接说明共用左边缘。

```njk
{% note info %}

#### 资料信息

这里放置资料说明。

[阅读相关内容](/posts/27.html)

{% endnote %}
```

| note 参数 | 主题色 |
| --- | --- |
| `primary` | 紫色 |
| `info` | 蓝色 |
| `success` | 绿色 |
| `warning` | 金色 |
| `danger` | 玫瑰色 |

`note info` 与 `content_panel blue` 属于不同组件，不要把两套参数混写成 `note blue` 或 `content_panel info`。

原有折叠 note 也可以继续使用：

```njk
{% note info 点击展开资料 %}

这里放置折叠内容。

{% endnote %}
```

颜色之后的文字成为折叠标题。只需要普通带框信息时，使用前一个静态 note 示例。

## 7. 自动应用的正文样式

### 引用与强调

```markdown
> 一个生命在其历途中，只能遇见**唯一**的它。
```

`>` 引用自动使用居中衬线字体、主题色文字、半透明底框和细边，不做首行缩进。链接、加粗和原有分行仍保留，无需添加新的引用容器。

### 链接

```markdown
[阅读阴行世界](/posts/27.html)
```

普通正文链接默认是加粗红色及细下划线，不需要再手动加 `**`。鼠标悬停或键盘聚焦时，文字与浅色背景跟随最近的 note 或内容容器主题；外面没有主题容器时，使用默认红色交互主题。

这套规则用于普通文章、经过共享阅读渲染的独立 Markdown 页面和菜单阅读器。导航、图片入口和按钮使用各自的交互样式。

### 段落缩进

普通自然段自动首行缩进两个汉字，放进新增容器后仍然生效。标题、引用、列表、表格、仅包含链接的入口段落及 note 的直接说明按各自规则对齐，不套用自然段缩进。

无需在段首额外输入两个全角空格来模拟缩进。

### 空白分割

```markdown
------
```

分割线隐藏线条及装饰，以透明空白形成视觉断开，与“总览”共用间距：桌面 34px、手机 24px。

在两个独立纸面章节之间，它会露出页面背景；在一个章节内部，它表现为正文留白。不要通过连续多个分割线堆叠间距。

### 表格、图片与加粗

表格继续使用普通 Markdown 表格，窄屏时放进可横向滚动的区域；图片保持比例、限制最大宽度并居中。加粗继承所在段落的字体与字号，行内代码使用等宽字体和轻底色。

### 按钮与已有弹窗

原有跳转按钮写法仍可使用：

```njk
{% button /posts/27.html, 阅读阴行世界 %}
```

`button` 与 `btn` 是现有主题支持的同一类标签。按钮外观使用主题色浅底、细描边和适合正文的尺寸。

这个例子是跳转按钮。已有 SweetAlert 弹窗仍由原来的点击脚本触发，采用纸面、主题色顶线和同系操作按钮；样式调整不会自动为按钮创建弹窗，也没有新增 `popup` 标签。

## 8. 文章阅读类型

在已有 frontmatter 内添加或修改以下字段：

```yaml
reading_style: info
reading_tone: amber
```

| reading_style | 用途 |
| --- | --- |
| `story` | 故事、叙事；衬线正文与较舒展行距 |
| `lore` | 世界设定；突出结构、条目和资料阅读 |
| `essay` | 随笔与记录；较窄阅读栏 |
| `poetry` | 诗文；保留诗行与更舒展的间距 |
| `info` | 项目、说明、资料内容 |
| `profile` | 人物、协作者档案 |
| `guide` | 阅读导览与已有时间线组织 |

`reading_tone` 使用第 2 节中的六种颜色。它设置文章阅读主题；嵌套的 `content_section`、`content_panel` 与 note 可以分别声明自己的颜色。

这些字段只控制呈现，不修改标题、分类、标签、作者或日期。首页、总览、分类等专用页面保留各自布局；`home`、`directory` 是这些布局的保留类型。

## 9. 众生回廊的当前组织方式

```text
content_section amber 02
└─ ## 众生回廊
   ├─ content_panel amber group
   │  └─ ### 众生回廊前置说明
   │     ├─ plain steps separated：Q1，内部三个编号条目
   │     ├─ plain separated：Q2
   │     │  └─ columns framed：四个 compact 维度，保留八个问题
   │     └─ plain steps separated：Q3，内部五个编号条目
   ├─ ------：全站统一的空白分割
   └─ content_panel amber group
      └─ ### 众生回廊具体内容
         ├─ >：金色主题的强调引用
         └─ note info：蓝色的信息条目
```

这里的 Q1、Q2、Q3 是并列内容，编号条目是问题内部的下一层。金色用于章节与说明，蓝色用于信息型 note，从颜色和结构上同时区分用途。

## 10. 写作与维护

日常写文章时，优先修改 Markdown 的标题层级、容器标签、颜色参数和组合选项。标签两侧保留空行，嵌套时按相反顺序关闭容器。

未知颜色或选项会报错；当前没有 `gold`、`red` 等颜色别名，金色应写 `amber`。

| 实现文件 | 负责内容 |
| --- | --- |
| [scripts/content-containers.js](../scripts/content-containers.js) | 注册三个新增 Hexo 块标签 |
| [lib/content-containers.cjs](../lib/content-containers.cjs) | 参数校验、容器渲染、编号条目组织 |
| [content-containers.styl](../source/_data/content-containers.styl) | 章节、普通说明框与网格 |
| [prose-ui.styl](../source/_data/prose-ui.styl) | 容器选项、引用、链接、分割及弹窗排布 |
| [world-tokens.styl](../source/_data/world-tokens.styl) | 明暗主题、字体、颜色与共享间距 |
| [reading-profiles.cjs](../lib/reading-profiles.cjs) | 阅读类型、段落与表格装饰 |
| [world-content-ui.js](../source/js/world-content-ui.js) | 已有正文弹窗的主题继承 |

修改共享样式后，在项目根目录重新构建：

```powershell
npm.cmd run clean
npm.cmd run build
```

修改标签渲染脚本后，还需要重启本地 Hexo 服务。标签示例需要在本站 Hexo 环境中渲染，普通 Markdown 编辑器只会显示标签文字。

进一步的阅读规则见 [MARKDOWN_READING.md](../MARKDOWN_READING.md)，样式维护分工见 [SITE_STYLE.md](../SITE_STYLE.md)。

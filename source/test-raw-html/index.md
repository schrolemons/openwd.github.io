---
title: 测试页 - 原生HTML渲染
layout: pages
---

本页面展示了 ` rawhtml ` 容器的用法。你可以在 Markdown 文件的**任意位置、任意数量**地插入 HTML 容器，它们与周围的 Markdown 内容无缝共存。

## 使用方式

容器标签支持两种模式：

| 参数 | 说明 |
|------|------|
| `title` | 容器左上方的标题 |
| `width` / `height` | iframe 的宽高 |
| `minHeight` | 最小高度 |
| `src` | 外部 HTML 页面的 URL 路径 |

### 模式一：`src` 引用内部或者外部的页面

适合引用已有的独立 HTML 页面：

```
{% rawhtml src="/light_withme/friend_lists/mosae/" title="..." width="100%" height="calc(100vh - 160px)" %}
{% endrawhtml %}
```

### 模式二：内嵌 HTML代码

适合直接在标签内编写小型 HTML 片段：

```
{% rawhtml title="示例" height="400px" %}
<!DOCTYPE html>
<html>
<body><h1>Hello World</h1></body>
</html>
{% endrawhtml %}
```

---

## 效果演示：src 模式（内部）

下面以 `src` 模式加载墨薛的个人扩列条页面：

{% rawhtml src="/light_withme/friend_lists/mosae/" title="墨薛的个人扩列条" width="100%" height="calc(100vh - 160px)" minHeight="400px" %}
{% endrawhtml %}

---

## 效果演示：src 模式（外部）

下面以 `src` 模式加载第九边缘方舟页面：

{% rawhtml src="https://ark.sch-nie.com" title="SCHNIE:ARK" width="100%" height="calc(100vh - 360px)" minHeight="100px" %}
{% endrawhtml %}

---


## 效果演示：内嵌 HTML 模式

下面是一个简单的内嵌 HTML 页面：

{% rawhtml title="内嵌 HTML 示例" width="100%" height="300px" minHeight="200px" %}
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', 'Noto Sans SC', sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    text-align: center;
  }
  .card {
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    padding: 2rem 3rem;
    border: 1px solid rgba(255,255,255,0.3);
  }
  h1 { font-size: 2rem; margin-bottom: 0.5rem; }
  p { font-size: 1.1rem; opacity: 0.9; }
</style>
</head>
<body>
<div class="card">
  <h1>这是一个内嵌 HTML 示例</h1>
  <p>这段 HTML 完全隔离在 iframe 中</p>
</div>
</body>
</html>
{% endrawhtml %}

---

> 你可以在一个 `.md` 文件中放置**任意多个**这样的容器，它们之间可以用普通的 Markdown 内容隔开。

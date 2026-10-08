---
layout: home
title: 第九边缘：WORLD
comments: false
reading_style: home
---

<script>
if (sessionStorage.getItem("isPopupWindow") != "1") {
    swal({
  title: "欢迎访问第九边缘：WORLD",
  text: "最新更新时间：" + document.querySelector("[data-world-built-at]").dataset.worldBuiltAt,
  className: "world-welcome-dialog",
  button: "启航",
});
// Give the existing welcome text a hierarchy without adding any wording or logo.
var welcomeTitle = document.querySelector(".world-welcome-dialog .swal-title");
var welcomeParts = welcomeTitle && welcomeTitle.textContent.match(/^(欢迎访问)(.*?)(WORLD)$/);
if (welcomeParts) {
  welcomeTitle.textContent = "";
  ["world-welcome-greeting", "world-welcome-name", "world-welcome-world"].forEach(function (className, index) {
    var part = document.createElement("span");
    part.className = className;
    part.textContent = welcomeParts[index + 1];
    welcomeTitle.appendChild(part);
  });
}
sessionStorage.setItem("isPopupWindow", "1");
}
</script>



{% note danger%}
### 网站介绍

1.这里记载着“第九边缘文化体系”下的内容，既包含宏大的世界设定，又不乏良性的哲理反思。
2.我们将世界体系分为科幻（**九虹重启**）的部分，与哲思（**灵耀体系**）的部分。并将**三大规划**作为世界观的背景框架，将**体系核心**作为第九边缘文化的哲学核心。
3.我们不具备传统的“**具体的条目+人物插曲、故事**”的世界观结构：第九边缘于**文明、科技、生命**的交汇之处，以“**感知、创造、记录**”为世界三元、以“**极简、精确、相和、理性**”的认知风格、以“**时间点+信息条目/核心叙事**”为写作笔法，将那三个遥相呼应、命运交织的文明图景相结成章。
4.生活本就布满不如意，道德与规则划定秩序的同时，也遮蔽了事物原本的闪光点。**虚构世界**在反对“现实规训”的同时，抽离了现实中的压迫、磨难与残缺，因而保留住那份最为纯真、洁净的炽热。若您对我们的世界感兴趣，请联系QQ-UID：schrolemon
{% endnote%}

------

{%note info%}
### 动态公告 
**UPUDATE:2026-10-2**
欢迎访问《第九边缘：SCHNIE》3.0版本！
我们大幅度优化了包含首页、木缘桑庭、阴行世界、categories与tags在内的诸多UI设计。
{%link **2025设定集下载**  https://zero.sch-nie.com/core%}
{% endnote %}



------

{% note primary %}
### 导引
{% endnote %}
{%note info%}

| 名称                                                           | 概述               |
|----------------------------------------------------------------|--------------------|
| {%link **木缘桑庭**  https://world.sch-nie.com/posts/24.html%} | 第九边缘解读线索。 |
| {%link 目录总览  https://world.sch-nie.com/archives/%}         | 第九边缘内容展开。 |
| {%link 发行计划 https://world.sch-nie.com//light_withme/key_part/%} | 第九边缘发行计划。 |
| {%link 协作档案 https://world.sch-nie.com/light_withme/operator/%}          | 第九边缘协作档案。 |   
{% endnote %}

------

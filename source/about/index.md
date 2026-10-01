---
layout: pages
title: 关于
abbrlink: 2147483647
date: 2025-02-21 16:57:09
top: 999999
comments: false
reading_style: info
reading_tone: cyan
---

{% note primary %}
### 关于建设
网站初步建设（3.0）中，期待您对排版、世界观设定的建议/意见。
{% endnote %}


{%note info%}
### 欢迎加入
欢迎加入[第九边缘发行计划](https://world.sch-nie.com/my_world/key_part/)。成为**协作者**的一员，我们将记载您的故事。
{% endnote %}

{%note info%}
### 联系邮箱
**定向** 到 schnie@foxmail.com
{% endnote %}

{%note info%}
### 添加微信
**定向** 到 [添加微信](http://world.sch-nie.com/images/wechat_channel.png)
{% endnote %}

{% note primary %}
### 赞赏信息
{% endnote %}

<div class="reward-wrap" id='reward'>

<script>
const data = [
  { name: 'schrolemons', money: '999999', date: '2025/6/19'},
];

(function(){
  const rewardDom = document.getElementById('reward');
  var html = '';
  for(var i = 0; i < data.length; i++) {
    html += `<div class="reward-item-content">
        <div class="reward-item-name">${data[i].name}</div>
        <div class="reward-item-time">
            <div class="reward-item-money">￥${data[i].money}</div>
            <div>${data[i].date}</div>
        </div>
        </div>`;
  };
  rewardDom.innerHTML = html;
})();
</script>





</div>
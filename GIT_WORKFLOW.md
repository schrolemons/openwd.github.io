# 本地源码与远程仓库

项目根目录是网站源码仓库，唯一远程 `origin` 指向你现有的个人项目 `schrolemons/openwd.github.io`。

- `source` 分支保存 Hexo 源码、文章、配置、插件与主题文件。
- `main` 分支由 Hexo 部署生成的网站文件继续使用。
- `.deploy_git` 是 Hexo 自动维护的发布缓存，不要在这里保存源码。

主题固定使用 `themes/next-restored` 中恢复的 NexT 8.22.0，自定义主题配置保存于根目录 `_config.next-restored.yml`。原来的 NexT、Desktop、Tag Cloud、Pace 与 Reading Progress 已转换为普通文件目录，不再连接各自的上游远程仓库。它们的 Git 元数据完整备份在 `.repair-backups/20261001/git-metadata/`，源码文件没有改变。

IDE 的 Git 映射只包含项目根目录。日常拉取与推送只操作自己的远程 `source` 分支。

本地已启用 `.githooks/pre-push`：推送目标必须是自己的上述项目，且目标分支必须是 `source`。误推其他项目或将源码推到发布分支 `main` 会被阻止。默认 fetch/push 也限定于自己的 `source` 分支。

保存源码：

```powershell
git add .
git commit -m "Update site sources"
git push origin source
```

发布网站：

```powershell
npm.cmd run build
npm.cmd run deploy
```

配置时已只读确认远程没有 `source` 分支。此保护设置本身未进行任何远程推送。

以后在新电脑克隆源码后，启用同一保护：

```powershell
git config core.hooksPath .githooks
git config remote.origin.push refs/heads/source:refs/heads/source
git config remote.origin.fetch '+refs/heads/source:refs/remotes/origin/source'
```

以后需要升级主题时，请在单独目录试用新版本，确认自定义配置、模板、文章总览和排版全部兼容后再切换。不要在当前主题目录重新克隆上游仓库，或恢复 IDE 对依赖目录的独立 Git 映射。

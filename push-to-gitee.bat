@echo off
REM ======================================================================
REM  万年历项目 - 一键推送到 Gitee（用于 Gitee Pages 在线部署）
REM  使用方法：
REM    1. 先去 Gitee 新建一个空仓库，比如 https://gitee.com/a-treasure-trove-of-wisdom/wannianli-app
REM    2. 把下面 GIT_REMOTE_URL 改成你自己的仓库 .git HTTPS 地址
REM    3. 保存本文件后双击运行
REM ======================================================================
setlocal

REM ====================== 【集中配置区】只改这一行 ======================
set "GIT_REMOTE_URL=https://gitee.com/a-treasure-trove-of-wisdom/astrology-online-web.git"
REM ====================================================================

REM -------- 锁定工作目录：永远切到 bat 自身所在目录（即项目根）--------
cd /d "%~dp0"
set "PROJECT_DIR=%cd%"

echo.
echo ==============================================================
echo   Gitee 项目一键推送脚本
echo   当前目录: %PROJECT_DIR%
echo   目标仓库: %GIT_REMOTE_URL%
echo ==============================================================
echo.

REM ---------------- [0/6] 环境检查：Git 是否安装 ----------------
where git >nul 2>nul
if errorlevel 1 goto :ERR_NO_GIT

REM ---------------- [1/6] 初始化本地仓库（仅首次） ----------------
if not exist ".git" (
    echo [1/6] 未检测到 .git 目录，开始初始化本地仓库...
    git init -b master
    if errorlevel 1 goto :ERR_GIT_INIT
    echo       OK - 本地仓库初始化完成。
    echo.
) else (
    echo [1/6] 本地仓库已存在，跳过初始化。
    echo.
)

REM ---------------- [2/6] 绑定或更新远程 origin 地址 ----------------
echo [2/6] 绑定/更新远程仓库地址 origin...
git remote get-url origin >nul 2>nul
if errorlevel 1 (
    git remote add origin "%GIT_REMOTE_URL%"
) else (
    git remote set-url origin "%GIT_REMOTE_URL%"
)
if errorlevel 1 goto :ERR_GIT_REMOTE
echo       OK - 已绑定远程仓库。
echo.

REM ---------------- [3/6] 添加所有源代码变更 ----------------
echo [3/6] 添加源代码变更到暂存区（.gitignore 内的文件会被自动忽略）...
git add -A
if errorlevel 1 goto :ERR_GIT_ADD
echo       OK - 暂存区准备完毕。
echo.

REM ---------------- [4/6] 检查是否有实际变更 ----------------
git diff --cached --quiet >nul 2>nul
if not errorlevel 1 goto :PUSH_ONLY_NO_COMMIT

REM ---------------- 提交 ----------------
echo [4/6] 提交本地变更...
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"`) do set "NOW=%%a"
git commit -m "update: %NOW%"
if errorlevel 1 goto :ERR_GIT_COMMIT
echo       OK - 本地提交成功。
echo.
goto :DO_PUSH

:PUSH_ONLY_NO_COMMIT
echo [4/6] 没有检测到新的代码变更，跳过本地 commit 步骤。
echo.

REM ---------------- [5/6] 推送到 Gitee 远程 ----------------
:DO_PUSH
echo [5/6] 推送到 Gitee 远程 master 分支...
git push -u origin master
if errorlevel 1 goto :ERR_GIT_PUSH
echo       OK - 推送成功！
echo.

REM ---------------- [6/6] 成功指引 ----------------
echo [6/6] 启用 Gitee Pages 指引：
echo       ============================================================
echo         1. 浏览器打开: %GIT_REMOTE_URL:.git=%
echo         2. 仓库页面右上角点击 "服务" - 然后选择 "Gitee Pages"
echo         3. 部署分支选择 master，部署目录填写 / ，点击启动
echo         4. 等待 1 到 2 分钟后，在同一页面能看到在线地址
echo            在线地址格式一般是: https://用户名.gitee.io/仓库名/
echo       ============================================================
goto :END

REM ============================================================
REM  以下是所有错误分支的 label（统一跳出括号块避免 cmd 解析乱码）
REM ============================================================

:ERR_NO_GIT
color 4F
echo.
echo [错误] 没有检测到已安装的 Git 命令。
echo        请先下载并安装 Git for Windows，安装完成后请重启电脑。
echo        下载地址：https://git-scm.com/download/win
goto :END

:ERR_GIT_INIT
color 4F
echo.
echo [错误] git init 初始化本地仓库失败。
goto :END

:ERR_GIT_REMOTE
color 4F
echo.
echo [错误] 远程仓库地址绑定失败。
echo        请检查 bat 文件顶部的 GIT_REMOTE_URL 是否和你在 Gitee 新建的仓库地址完全一致。
goto :END

:ERR_GIT_ADD
color 4F
echo.
echo [错误] git add 暂存文件失败。
goto :END

:ERR_GIT_COMMIT
color 4F
echo.
echo [错误] git commit 提交本地变更失败。
goto :END

:ERR_GIT_PUSH
color 4F
echo.
echo [错误] git push 推送失败，常见原因与处理方式如下：
echo   1. 账号未登录或凭据过期
echo      请按以下步骤清理旧凭据，然后用 Gitee 私人令牌重新登录：
echo        a. 按 Win+R 输入 rundll32.exe keymgr.dll,KRShowKeyMgr 回车
echo        b. 删除所有含 gitee.com 的条目后关闭窗口
echo        c. 再次双击本 bat，弹出登录框时：用户名随便填
echo           密码那一栏粘贴你自己的 Gitee 私人令牌（不是 Gitee 登录密码）
echo        d. 令牌创建方法：Gitee 页面右上角头像 - 设置 - 私人令牌
echo           - 生成新令牌 - 勾选 projects 权限 - 复制保存
echo   2. 仓库地址不存在或写错
echo      检查 bat 顶部 GIT_REMOTE_URL 与 Gitee 页面上 HTTPS 克隆地址是否完全一致
echo   3. 远端已有其他人的提交
echo      这个情况出现在多人协作，第一次推送到空仓库不会出现
echo   4. 网络不通
echo      请用浏览器打开 https://gitee.com 确认网络能正常访问
goto :END

:END
echo.
pause
endlocal

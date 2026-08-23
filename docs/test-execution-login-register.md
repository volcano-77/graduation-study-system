# 登录与注册功能测试执行报告（第一批）

## 1. 报告说明

本报告整理第一批已经实际执行的登录、注册功能测试，测试依据为 [`test-cases-login-register.md`](./test-cases-login-register.md)。结果来自本轮手工测试确认和 [`screenshots/`](./screenshots/) 中的 8 张证据截图。

- 只记录已经执行的 6 条用例。
- Pass/Fail 使用实际确认结果，不推断未执行内容。
- 截图未展示的数据库结果、浏览器版本和密码明文不作补充判断。
- 本轮没有修改业务代码、截图或测试数据，也没有修复缺陷。

## 2. 测试范围

| 模块 | 已执行内容 | 用例编号 |
| --- | --- | --- |
| 注册 | 正常注册、重复用户名注册、1 位密码注册 | REGISTER-001、REGISTER-003、REGISTER-011 |
| 登录与退出 | 正常登录、错误密码、退出后访问受保护页面 | LOGIN-001、LOGIN-003、LOGIN-014 |

本轮未执行其他登录/注册用例，因此本报告不包含空值、邮箱格式、长度上限、特殊字符、重复提交等结果。

## 3. 执行环境

| 项目 | 本轮环境 |
| --- | --- |
| 执行方式 | 本地手工测试 |
| 操作系统 | Windows |
| 前端 | React + Vite，本地地址 `http://localhost:5173` |
| 后端 | Node.js + Express，本地端口 `3001` |
| 数据库 | 本地 MySQL |
| 观察工具 | Chromium 系浏览器开发者工具 Network 面板 |
| 执行日期 | 2026-08-23 |
| 浏览器/数据库精确版本 | 本轮证据未记录 |

## 4. 执行结果汇总

| 用例编号 | 测试内容 | 预期结果摘要 | 实际结果 | 结果 | 证据 |
| --- | --- | --- | --- | --- | --- |
| REGISTER-001 | 合法信息正常注册 | 注册返回 201，成功后进入登录页 | `register` 返回 201，页面跳转到登录页 | **Pass** | [REGISTER-001-201.png](./screenshots/REGISTER-001-201.png) |
| LOGIN-001 | 正确账号密码登录 | 登录返回 200，进入普通用户学习空间 | `login` 返回 200，成功进入“学习空间总览” | **Pass** | [LOGIN-001-200.png](./screenshots/LOGIN-001-200.png) |
| LOGIN-003 | 正确用户名配错误密码 | 登录返回 401，显示统一错误提示，不进入系统 | `login` 返回 401，页面提示“账号或密码错误”，仍停留登录页 | **Pass** | [LOGIN-003-401.png](./screenshots/LOGIN-003-401.png) |
| REGISTER-003 | 使用已存在用户名注册 | 不创建用户，接口应使用 409 表示重复冲突 | 页面提示用户名或邮箱可能已存在，但 `register` 实际返回 500 | **Fail** | [REGISTER-003-500.png](./screenshots/REGISTER-003-500.png) |
| REGISTER-011 | 使用 1 位密码注册并登录 | 注册阶段应有最小长度限制，拒绝过短密码 | 密码 `1` 注册返回 201；随后同一账号登录返回 200 并进入学习空间 | **Fail** | [REGISTER-011-201.png](./screenshots/REGISTER-011-201.png)、[REGISTER-011-login-200.png](./screenshots/REGISTER-011-login-200.png) |
| LOGIN-014 | 退出后访问受保护页面 | 退出回到登录页；直接访问 `/dashboard` 仍重定向登录页 | 退出后回到登录页；手动访问 `/dashboard` 后再次显示登录页 | **Pass** | [LOGIN-014-logout.png](./screenshots/LOGIN-014-logout.png)、[LOGIN-014-redirect.png](./screenshots/LOGIN-014-redirect.png) |

## 5. 详细执行记录与证据

### REGISTER-001：正常注册

- 实际数据：截图中注册后登录页显示账号 `qa_user01`；邮箱和密码明文未在证据中展示。
- 实际结果：Network 面板中的 `register` 请求状态为 201，页面已经跳转到登录页。
- 判定：**Pass**。

![REGISTER-001：register 返回 201，注册后跳转登录页](./screenshots/REGISTER-001-201.png)

### LOGIN-001：正确账号密码登录

- 实际数据：用户名 `qa_user01`，密码在截图中已遮罩。
- 实际结果：Network 面板中的 `login` 请求状态为 200；页面进入“学习空间总览”，页面左下角显示当前用户 `qa_user01`。
- 判定：**Pass**。

![LOGIN-001：login 返回 200 并进入学习空间](./screenshots/LOGIN-001-200.png)

### LOGIN-003：正确用户名加错误密码

- 实际数据：用户名 `qa_user01`，错误密码在截图中已遮罩。
- 实际结果：Network 面板中的 `login` 请求状态为 401；登录页显示“账号或密码错误”，没有进入系统。
- 判定：**Pass**。

![LOGIN-003：错误密码返回 401 并显示统一提示](./screenshots/LOGIN-003-401.png)

### REGISTER-003：重复用户名注册

- 实际数据：已存在用户名 `qa_user01`；本次邮箱 `qa.user02@example.com`；密码在截图中已遮罩。
- 实际结果：页面显示“注册失败，用户名或邮箱可能已存在”，Network 面板中的 `register` 请求状态为 500。
- 与预期差异：重复用户名属于业务冲突，更合理的接口状态为 409 Conflict，而不是表示服务器内部错误的 500。
- 判定：**Fail**。
- Bug：[`BUG-LR-001`](./bug-report.md#bug-lr-001重复用户名注册返回-500)。

![REGISTER-003：重复用户名提示存在，但 register 返回 500](./screenshots/REGISTER-003-500.png)

### REGISTER-011：1 位密码注册并登录

- 实际数据：用户名 `qa_pwd1`；密码 `1`；注册邮箱未在截图中展示。
- 实际结果一：使用 1 位密码提交注册后，`register` 返回 201，并跳转登录页。
- 实际结果二：随后使用 `qa_pwd1` 和密码 `1` 登录，`login` 返回 200，进入“学习空间总览”。
- 与预期差异：注册端缺少密码最小长度校验，过短密码能够成为有效登录凭据。
- 判定：**Fail**。
- Bug：[`BUG-LR-002`](./bug-report.md#bug-lr-002允许-1-位密码注册并成功登录)。

![REGISTER-011：1 位密码注册返回 201](./screenshots/REGISTER-011-201.png)

![REGISTER-011：新账号使用 1 位密码登录返回 200](./screenshots/REGISTER-011-login-200.png)

### LOGIN-014：退出后访问受保护页面

- 实际数据：退出前登录用户为 `qa_user01`。
- 实际结果一：执行退出后回到登录页。
- 实际结果二：手动访问 `/dashboard` 后再次被重定向到登录页。
- 证据边界：本轮截图证明了页面跳转和路由保护结果，没有展示 Application 面板，因此本报告不额外声称已用截图验证 Local Storage 内容。
- 判定：**Pass**。

![LOGIN-014：退出后回到登录页](./screenshots/LOGIN-014-logout.png)

![LOGIN-014：手动访问 dashboard 后重新跳转登录页](./screenshots/LOGIN-014-redirect.png)

## 6. 统计总结

### 总体结果

| 指标 | 数量 | 占比 |
| --- | ---: | ---: |
| 已执行用例 | 6 | 100% |
| Pass | 4 | 66.7% |
| Fail | 2 | 33.3% |
| 本轮确认 Bug | 2 | — |

### 按模块统计

| 模块 | 已执行 | Pass | Fail |
| --- | ---: | ---: | ---: |
| 登录与退出 | 3 | 3 | 0 |
| 注册 | 3 | 1 | 2 |
| **合计** | **6** | **4** | **2** |

## 7. 本轮结论

第一批手工测试确认：正常注册、正常登录、错误密码提示和退出后的页面访问控制符合本轮用例预期；重复用户名注册的 HTTP 状态码处理和注册密码最小长度校验不符合预期，已分别记录为两个独立缺陷。其他登录、注册场景尚未执行，不能根据本轮结果推断其通过情况。

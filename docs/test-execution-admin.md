# 管理员模块测试执行报告

## 1. 测试范围

本报告记录管理员模块 `ADMIN-001`～`ADMIN-008` 共8条已经实际执行的手工测试，覆盖：

- 管理员登录、未登录和普通用户路由隔离；
- 平台数据中枢统计及最新动态；
- Top 10和全量小组活跃度排行；
- 用户新增、搜索、编辑、删除、输入校验和角色生命周期；
- 小组监督、编辑、权限隔离、强制解散及关联数据清理；
- 页面、REST API、MySQL与本地物理文件的一致性。

此前已经完成的 `FILE-015-A`～`FILE-015-E`、`FILE-016`、`TASK-015`、`TASK-016` 不在本轮重复执行或重复统计。`ADMIN-001` 同时完成原设计用例 `LOGIN-002` 的正式验证，但累计执行数只按 `ADMIN-001` 计算一次。

## 2. 测试环境与账号

| 项目 | 实际环境 |
| --- | --- |
| 前端 | Vite，`http://localhost:5173` |
| 后端 | Node.js / Express，`http://localhost:3001` |
| 数据库 | 本地 MySQL |
| 分支 | `clean-main` |
| 管理员 | `admin`，user id 3，role `admin` |
| 普通用户 A | `qa_user01`，user id 21 |
| 普通用户 C | `qa_nonmember01`，user id 26 |
| 基线小组 | group 31；本轮结束后保持原基线 |

公开报告不记录登录密码、完整token、数据库口令或 `.env` 内容。

## 3. 执行结果汇总

| 编号 | 场景 | 结果 | 关联问题 |
| --- | --- | --- | --- |
| ADMIN-001 | 管理员登录与路由隔离 | Pass | — |
| ADMIN-002 | 平台统计与最新动态三边一致 | Pass | — |
| ADMIN-003 | Top 10与全量活跃排行一致 | Pass | — |
| ADMIN-004 | 管理员用户正常CRUD | Pass | — |
| ADMIN-005 | 用户输入校验与ID边界 | Fail | 扩展BUG-LR-002、BUG-LR-003；新增BUG-ADMIN-001 |
| ADMIN-006 | 第二管理员生命周期与删除自己保护 | Risk | RISK-ADMIN-001 |
| ADMIN-007 | 小组监督编辑与关联数据准备 | Pass | — |
| ADMIN-008 | 管理员接口权限与强制解散一致性 | Fail | BUG-ADMIN-002 |

| 统计项 | 数量 |
| --- | ---: |
| 实际执行 | 8 |
| Pass | 5 |
| Fail | 2 |
| Risk | 1 |
| 通过率 | 62.5% |

## 4. 详细执行记录与证据

### ADMIN-001：管理员登录与路由隔离 — Pass

- 未登录访问 `/admin/overview` 时自动跳转 `/login`。
- 管理员登录请求 `POST /api/login` 返回200，并进入 `/admin/overview`。
- C以普通用户身份访问 `/admin/users` 时被重定向回 `/dashboard`。
- 本场景完成了原 `LOGIN-002` 的正式验证，但未重复增加执行数量。

![ADMIN-001：管理员登录并进入后台概览](./screenshots/ADMIN-001-admin-login-redirect.png)

![ADMIN-001：普通用户访问管理员路由被拦截](./screenshots/ADMIN-001-user-admin-route-blocked.png)

### ADMIN-002：平台统计与最新动态一致性 — Pass

- 概览显示：用户21、小组11、任务18、资料5。
- 四项页面统计与数据库SQL完全一致。
- `GET /api/admin/activities` 返回200。
- 最新平台动态与users最新3条、groups_table最新3条SQL记录一致，并符合 `created_at` 倒序逻辑。

![ADMIN-002：概览统计SQL](./screenshots/ADMIN-002-stats-sql.png)

![ADMIN-002：最新动态接口](./screenshots/ADMIN-002-activities-api.png)

![ADMIN-002：最新动态页面](./screenshots/ADMIN-002-activities-ui.png)

![ADMIN-002：最新用户SQL](./screenshots/ADMIN-002-latest-users-sql.png)

![ADMIN-002：最新小组SQL](./screenshots/ADMIN-002-latest-groups-sql.png)

### ADMIN-003：小组活跃度排行 — Pass

- 全量榜显示11个小组，包括3个0分小组。
- 页面分数依次为 `21 / 13 / 12 / 10 / 9 / 9 / 7 / 2 / 0 / 0 / 0`。
- 页面与SQL计算结果一致；同分时按group id升序。
- 概览Top 10与全量榜使用相同的“讨论×1 + 任务×2 + 文件×3”评分逻辑。

![ADMIN-003：全量活跃度排行榜](./screenshots/ADMIN-003-full-ranking-ui.png)

![ADMIN-003：排行SQL核对](./screenshots/ADMIN-003-ranking-sql.png)

### ADMIN-004：管理员用户正常CRUD — Pass

- 管理员创建临时普通用户，`POST /api/admin/users` 返回201，页面搜索可以找到。
- 编辑用户名和邮箱时密码留空，`PUT /api/admin/users/27` 返回200。
- 使用原密码仍能登录，说明留空密码没有被错误覆盖。
- 页面与SQL数据一致。
- `DELETE /api/admin/users/27` 返回200，SQL确认记录已删除。

![ADMIN-004：创建用户返回201](./screenshots/ADMIN-004-create-user-201.png)

![ADMIN-004：编辑用户返回200](./screenshots/ADMIN-004-edit-user-200.png)

![ADMIN-004：编辑后用户SQL](./screenshots/ADMIN-004-edited-user-sql.png)

![ADMIN-004：删除用户返回200](./screenshots/ADMIN-004-delete-user-200.png)

![ADMIN-004：删除后SQL无记录](./screenshots/ADMIN-004-delete-user-sql-clean.png)

### ADMIN-005：用户输入校验与ID边界 — Fail

本场景包含4个实际检查点：

1. 管理员新增用户接口接受非法邮箱并返回201，SQL确认非法邮箱真实写入id 29；该结果扩展已有BUG-LR-003。
2. 接口接受1位密码并返回201，使用密码 `1` 可以真实登录id 30；该结果扩展已有BUG-LR-002。
3. `PUT /api/admin/users/29abc` 返回200，SQL确认真实id 29被修改；新增BUG-ADMIN-001。
4. 使用重复用户名创建时返回409和“用户名或邮箱已存在”，该子项符合预期。

![ADMIN-005：非法邮箱用户创建成功](./screenshots/ADMIN-005-invalid-email-api.png)

![ADMIN-005：1位密码用户创建成功](./screenshots/ADMIN-005-one-char-password-api.png)

![ADMIN-005：1位密码可以登录](./screenshots/ADMIN-005-one-char-password-login-success.png)

![ADMIN-005：数字前缀ID请求返回200](./screenshots/ADMIN-005-loose-id-parse-api.png)

![ADMIN-005：数字前缀ID命中真实用户](./screenshots/ADMIN-005-loose-id-parse-sql.png)

![ADMIN-005：重复用户返回409](./screenshots/ADMIN-005-duplicate-user-409.png)

![ADMIN-005：临时用户清理完成](./screenshots/ADMIN-005-cleanup-sql.png)

### ADMIN-006：第二管理员生命周期 — Risk

- `POST /api/admin/users` 成功创建role为admin的临时账号，SQL确认role已写入。
- 该账号不出现在管理员用户列表中，但后端重启前可以登录 `/admin/overview`。
- 后端完整重启后，其role自动变成user，再次登录只能进入 `/dashboard`。
- 主admin删除自己时返回400和“不能删除当前登录的管理员账号”，该子项符合预期。
- 由于项目没有明确说明是否支持多个管理员，“允许创建admin、列表隐藏、重启后降级”记录为RISK-ADMIN-001，不直接判确认缺陷。

![ADMIN-006：创建第二管理员返回201](./screenshots/ADMIN-006-create-admin-201.png)

![ADMIN-006：第二管理员SQL记录](./screenshots/ADMIN-006-created-admin-sql.png)

![ADMIN-006：重启前第二管理员可登录](./screenshots/ADMIN-006-secondary-admin-login-success.png)

![ADMIN-006：重启后角色自动降级](./screenshots/ADMIN-006-role-after-backend-restart-sql.png)

![ADMIN-006：降级后进入普通用户页面](./screenshots/ADMIN-006-secondary-admin-downgraded-login.png)

![ADMIN-006：禁止当前管理员删除自己](./screenshots/ADMIN-006-delete-self-400.png)

![ADMIN-006：临时账号清理完成](./screenshots/ADMIN-006-cleanup-sql.png)

### ADMIN-007：小组监督编辑与关联数据准备 — Pass

- A创建临时小组后，admin可以在 `/admin/groups` 找到并编辑。
- `PUT /api/admin/groups/33` 返回200；SQL确认owner id 21、名称和简介均正确更新。
- 随后使用正常业务流程准备任务、讨论、pending邀请和真实上传文件；汇总SQL确认这些数据均属于group 33。
- 首次误写入group31的临时数据已经通过UI和SQL清理，不计入正式测试，也没有引用相关排错截图。

![ADMIN-007：管理员编辑小组返回200](./screenshots/ADMIN-007-edit-group-200.png)

![ADMIN-007：编辑后小组SQL](./screenshots/ADMIN-007-edit-group-sql.png)

![ADMIN-007：强制解散前关联数据基线](./screenshots/ADMIN-007-related-data-baseline.png)

### ADMIN-008：权限隔离与强制解散一致性 — Fail

权限检查均符合预期：

- C调用 `GET /api/admin/stats` 返回403；
- C调用 `POST /api/admin/users` 返回403；
- C调用 `DELETE /api/admin/groups/33` 返回403；
- SQL确认被拒绝的请求没有创建用户，也没有影响group 33及其关联数据。

管理员强制解散时：

- `DELETE /api/admin/groups/33` 返回200，页面中小组消失；
- groups、group_members、tasks、discussions、notifications、shared_files、group_files相关记录全部为0；
- 但 `server/uploads` 仍残留 `1789572361032-ADMIN-GROUP-FILE-001.txt`，形成无数据库记录的孤儿文件，因此本场景最终判Fail并登记BUG-ADMIN-002。

![ADMIN-008：普通用户读取管理员统计返回403](./screenshots/ADMIN-008-user-admin-stats-403.png)

![ADMIN-008：普通用户新增管理员用户返回403](./screenshots/ADMIN-008-user-admin-create-403.png)

![ADMIN-008：普通用户强制解散小组返回403](./screenshots/ADMIN-008-user-admin-delete-group-403.png)

![ADMIN-008：权限拒绝后数据库无副作用](./screenshots/ADMIN-008-forbidden-no-side-effects-sql.png)

![ADMIN-008：管理员强制解散返回200](./screenshots/ADMIN-008-admin-delete-group-200.png)

![ADMIN-008：解散后数据库关联记录全部清理](./screenshots/ADMIN-008-delete-group-sql-clean.png)

![ADMIN-008：解散后物理文件仍残留](./screenshots/ADMIN-008-orphan-file-remains.png)

## 5. 缺陷与风险归并

| 记录 | 性质 | 本轮处理 |
| --- | --- | --- |
| BUG-LR-002 | 已确认缺陷 | 增加ADMIN-005：管理员新增用户接口允许1位密码并可登录 |
| BUG-LR-003 | 已确认缺陷 | 增加ADMIN-005：管理员新增用户接口允许非法邮箱并落库 |
| BUG-ADMIN-001 | 新增已确认缺陷 | 管理员用户接口将数字前缀字符串ID当作真实ID处理 |
| BUG-ADMIN-002 | 新增已确认缺陷 | 管理员强制解散小组后残留物理上传文件 |
| RISK-ADMIN-001 | 新增风险候选 | 第二管理员列表、登录权限与重启后的角色状态不一致 |

本轮新增确认缺陷2个、风险候选1个；另外两个输入校验结果扩展已有同根因缺陷，不重复计数。

## 6. 测试数据恢复与清理

- ADMIN-004临时用户已删除；
- ADMIN-005的id 29、30已删除；
- ADMIN-006的id 32已删除；
- group 33已被管理员强制解散，关联数据库记录全部为0；
- 强制解散残留的物理文件已手工删除；
- 误写入group31的task 52、discussion 138、invite 76、file 23均已清理；
- group31中的相关 `ADMIN-GROUP-*` 数据最终为0；
- C仍不是group31成员；A、B、C和admin正式测试账号保持可用。

## 7. 项目累计统计

| 模块 | 执行 | Pass | Fail | Risk |
| --- | ---: | ---: | ---: | ---: |
| 登录与注册 | 11 | 7 | 4 | 0 |
| 小组基础管理 | 4 | 3 | 0 | 1 |
| 小组邀请与成员权限 | 8 | 7 | 0 | 1 |
| 任务管理 | 21 | 10 | 11 | 0 |
| 讨论与实时消息 | 19 | 9 | 5 | 5 |
| 文件上传、下载与资料共享 | 24 | 11 | 11 | 2 |
| 通知模块 | 10 | 8 | 1 | 1 |
| Dashboard | 9 | 9 | 0 | 0 |
| 个人资料与密码 | 10 | 7 | 2 | 1 |
| 管理员模块 | 8 | 5 | 2 | 1 |
| **累计** | **124** | **77** | **37** | **10** |

截至本模块完成，项目累计有21个已确认缺陷、1个业务规则缺口 / 可疑缺陷、9个需求待确认 / 风险候选，共31条问题记录。

## 8. 本轮结论

管理员登录、前端路由、后台统计、最新动态、活跃度排行、正常用户CRUD、小组编辑和后端管理员权限中间件均有实际证据支持。主要问题集中在管理员用户接口复用不完整的邮箱、密码和ID校验，以及强制解散小组时数据库与物理文件系统清理不一致。第二管理员生命周期存在明显规则冲突，但在多管理员需求明确前继续按风险候选记录。

本轮没有修改业务代码，也没有修复任何缺陷。

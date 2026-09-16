# 个人控制台 / Dashboard 数据联动测试执行报告

## 1. 测试范围

本报告只记录已经实际执行并留有截图证据的普通用户 Dashboard 场景，覆盖：

- 组长、普通成员和非成员的数据范围；
- 小组成员关系变化与“我的小组数”联动；
- 任务新增、状态迁移、删除与统计卡片、饼图联动；
- 文件上传、删除与“最新资料速递”联动；
- 页面保持打开和刷新后的数据更新机制；
- 测试数据清理及权限环境恢复。

管理员使用独立的 `/admin/overview` 页面，不混入本轮普通用户 Dashboard 统计。未把源码预测或未执行场景计入本报告。

## 2. 测试环境与角色

| 项目 | 实际环境 |
| --- | --- |
| 项目路径 | `D:\my-study-system` |
| 分支 | `clean-main` |
| 前端 | Vite，`http://localhost:5173` |
| 后端 | Express，`http://localhost:3001` |
| 数据库 | MySQL 本地测试库 |
| 页面 | `/dashboard`、`/groups/31`、`/notifications` |
| A | `qa_user01`，user id 21，group 31 owner |
| B | `demo_user`，user id 20，group 31 member |
| C | `qa_nonmember01`，user id 26；本轮开始和结束时均不是 group 31 成员 |
| 目标小组 | group 31：`qa_group01` |

公开报告不记录账号密码、登录 token、数据库口令或 `.env` 内容。

## 3. Dashboard 真实统计口径

页面加载时并行请求 `/api/dashboard/stats`、`/api/groups`、`/api/global/tasks` 和 `/api/files/recent`。

- “我的小组数”优先使用 `/api/groups` 返回数组长度；
- 三种任务数量和饼图优先根据 `/api/global/tasks` 返回数据在前端统计；
- “最新资料速递”来自 `/api/files/recent`，最多显示当前用户可访问范围内最近5条 `group_files`；
- 页面只在首次挂载或刷新、重新进入时加载，没有轮询、Socket 或手动刷新按钮；
- Dashboard 本身不展示通知数据，侧边栏通知红点使用独立逻辑。

## 4. 实际执行结果

| 编号 | 场景 | 实际结果摘要 | 结论 |
| --- | --- | --- | --- |
| DASH-001 | C 非成员 Dashboard 基线 | 小组、三种任务、总任务均为0；任务和资料为空；3个业务接口均返回空数组 | Pass |
| DASH-002 | A/B Dashboard 基线与权限范围 | A 为2组、1个已完成任务；B为1组、1个已完成任务；两者资料均为空 | Pass |
| DASH-003 | C 加入 group 31 后联动 | 成员关系写入后，C刷新页面，小组数0→1、已完成及总任务0→1 | Pass |
| DASH-004 | 页面保持打开时的数据刷新机制 | A新增任务后，未刷新的C页面仍显示旧快照；符合当前仅页面加载时取数的设计 | Pass / 当前设计说明 |
| DASH-005 | 新增待处理任务后联动 | C刷新后待处理0→1、总任务1→2，饼图同步出现待处理和已完成 | Pass |
| DASH-006 | 任务状态迁移联动 | 待处理→进行中→已完成后，每次刷新对应卡片和饼图均同步变化 | Pass |
| DASH-007 | 删除任务后统计恢复 | 删除测试任务后，小组看板和C刷新后的Dashboard均恢复为总任务1、已完成1 | Pass |
| DASH-008 | 最新资料上传、删除联动 | 上传后C刷新可见文件、小组和上传者；删除再刷新后恢复无资料，任务数不变 | Pass |
| DASH-009 | C 被移除后的权限恢复 | group 31恢复2人；C刷新后小组、任务、资料均回到空状态 | Pass |

## 5. 详细执行记录与证据

### 5.1 DASH-001：C 非成员基线 — Pass

C 在不属于 group 31 时打开 Dashboard：小组数、待处理、进行中、已完成和总任务均为0，任务图表和最新资料均为空。

控制台分别请求 `/api/groups`、`/api/global/tasks`、`/api/files/recent`，3个响应均为 `success: true` 和空数组，证明页面空状态不是单纯的前端显示结果。

![DASH-001：非成员Dashboard基线](./screenshots/DASH-001-nonmember-baseline-ui.png)

![DASH-001：非成员接口均返回空数组](./screenshots/DASH-001-nonmember-api-empty.png)

### 5.2 DASH-002：A/B 基线与权限范围 — Pass

A 可以访问2个小组和1个已完成任务，B可以访问1个小组和同一条已完成任务；两人均没有可访问的最新上传资料。页面数字与各自接口数组长度一致。

![DASH-002：A组长基线页面](./screenshots/DASH-002-owner-baseline-ui.png)

![DASH-002：A组长接口范围](./screenshots/DASH-002-owner-baseline-api.png)

![DASH-002：B普通成员基线页面](./screenshots/DASH-002-member-baseline-ui.png)

![DASH-002：B普通成员接口范围](./screenshots/DASH-002-member-baseline-api.png)

### 5.3 DASH-003：加入小组后联动 — Pass

A邀请C加入 group 31，C接受邀请后页面显示“已同意”；SQL确认 `group_members(group_id=31,user_id=26,role=member)` 已创建。

C刷新 Dashboard 后，小组数由0变1，已完成任务和总任务由0变1；接口数组也分别变为 groups 1、tasks 1、files 0。

![DASH-003：C接受邀请](./screenshots/DASH-003-c-accept-invite.png)

![DASH-003：C成员关系写入数据库](./screenshots/DASH-003-c-member-sql.png)

![DASH-003：C加入后Dashboard联动](./screenshots/DASH-003-c-after-join-ui.png)

![DASH-003：C加入后接口范围](./screenshots/DASH-003-c-after-join-api.png)

### 5.4 DASH-004～DASH-005：新增任务与刷新机制 — Pass

A在 group 31 新增待处理任务 `DASH-TEST-001`，小组看板总任务数由1变2。此时一直保持打开的C Dashboard仍显示旧快照：待处理0、已完成1、总任务1。

刷新C Dashboard 后，待处理变为1，总任务变为2，饼图同步显示待处理和已完成两个状态。该结果与源码仅在页面挂载时加载数据的机制一致，不判 Bug。

![DASH-004/005：A新增待处理任务](./screenshots/DASH-004-005-create-pending-task-ui.png)

![DASH-004：未刷新页面保持旧快照](./screenshots/DASH-004-dashboard-stale-before-refresh.png)

![DASH-005：刷新后新增任务进入统计](./screenshots/DASH-005-task-create-after-refresh-ui.png)

### 5.5 DASH-006：任务状态迁移联动 — Pass

`DASH-TEST-001` 从待处理移动到进行中后，小组看板显示进行中1；C刷新 Dashboard 后显示待处理0、进行中1、已完成1、总任务2。

任务再从进行中移动到已完成后，小组看板显示已完成2；C刷新后显示进行中0、已完成2、总任务2，饼图同步变为全部已完成。

![DASH-006：任务转为进行中](./screenshots/DASH-006-task-pending-to-inprogress-ui.png)

![DASH-006：刷新后进行中统计更新](./screenshots/DASH-006-inprogress-after-refresh-ui.png)

![DASH-006：任务转为已完成](./screenshots/DASH-006-task-inprogress-to-completed-ui.png)

![DASH-006：刷新后已完成统计更新](./screenshots/DASH-006-completed-after-refresh-ui.png)

### 5.6 DASH-007：删除任务后统计恢复 — Pass

A删除 `DASH-TEST-001` 后，小组看板只剩原有已完成任务；C刷新 Dashboard 后恢复为待处理0、进行中0、已完成1、总任务1。

![DASH-007：测试任务已从小组看板删除](./screenshots/DASH-007-delete-test-task-ui.png)

![DASH-007：刷新后任务统计恢复](./screenshots/DASH-007-after-delete-refresh-ui.png)

### 5.7 DASH-008：最新资料联动 — Pass

A上传 `DASH-FILE-001.txt` 后，group 31资料页显示该文件；C刷新 Dashboard 后，“最新资料速递”显示文件名、`qa_group01` 和上传者 `qa_user01`，任务统计保持不变。

A删除该测试文件后，小组资料页和C刷新后的最新资料区均恢复为空。

![DASH-008：A上传联动测试文件](./screenshots/DASH-008-upload-test-file-ui.png)

![DASH-008：C刷新后看到最新资料](./screenshots/DASH-008-recent-file-after-refresh-ui.png)

![DASH-008：测试文件已从小组资料页删除](./screenshots/DASH-008-delete-test-file-ui.png)

![DASH-008：C刷新后最新资料恢复为空](./screenshots/DASH-008-recent-file-after-delete-ui.png)

### 5.8 DASH-009：成员移除后权限恢复 — Pass

A将C移出 group 31 后，成员页只剩A和B，共2人。C刷新 Dashboard 后，小组数、三种任务和总任务全部恢复为0，任务与资料区域均为空。

![DASH-009：A移除C后小组恢复2人](./screenshots/DASH-009-remove-c-ui.png)

![DASH-009：C移除后Dashboard恢复非成员状态](./screenshots/DASH-009-c-after-remove-dashboard.png)

## 6. 测试数据清理

- `DASH-TEST-001` 已通过正常任务删除操作清理，小组看板恢复为原有1条已完成任务；
- `DASH-FILE-001.txt` 已通过正常文件删除操作清理，group 31资料页及Dashboard最新资料均恢复为空；
- C 已由A移出 group 31，group 31成员数恢复为2；
- C 最终重新成为 group 31 非成员，Dashboard权限范围恢复到测试前状态；
- 本轮没有修改业务代码，也没有把测试账号密码、token 或数据库配置写入报告。

## 7. 测试统计

### 7.1 Dashboard 模块

| 状态 | 数量 | 占比 |
| --- | ---: | ---: |
| 实际执行场景 | 9 | 100% |
| Pass | 9 | 100% |
| Fail | 0 | 0% |
| Risk / 待确认 | 0 | 0% |

### 7.2 项目累计

| 测试报告 | 实际执行场景 | Pass | Fail | 需求待确认 / 风险候选 |
| --- | ---: | ---: | ---: | ---: |
| 登录注册 | 11 | 7 | 4 | 0 |
| 小组管理第一批 | 4 | 3 | 0 | 1 |
| 小组邀请与成员权限 | 8 | 7 | 0 | 1 |
| 任务管理 | 21 | 10 | 11 | 0 |
| 讨论与实时消息 | 13 | 8 | 5 | 0 |
| 文件上传、下载与资料共享 | 24 | 11 | 11 | 2 |
| 讨论区 `@` 提及补充 | 6 | 2 | 1 | 3 |
| 通知模块 | 10 | 8 | 1 | 1 |
| Dashboard 数据联动 | 9 | 9 | 0 | 0 |
| 个人资料与密码 | 10 | 7 | 2 | 1 |
| 管理员模块 | 8 | 5 | 2 | 1 |
| **累计** | **124** | **77** | **37** | **10** |

截至管理员模块完成，项目累计有21个已确认缺陷、1个业务规则缺口 / 可疑缺陷、9个需求待确认 / 风险候选，共31条问题记录。详情见 [`test-execution-admin.md`](./test-execution-admin.md)。

## 8. 本轮结论

Dashboard 的小组、任务、状态分布和最新资料均能在刷新后按当前用户的 owner/member 范围正确联动。加入小组后数据增加，被移除后数据恢复为空；新增、迁移、删除任务以及上传、删除文件均会在下一次页面加载时反映。

Dashboard 当前是“页面加载时快照”，不是实时看板。未刷新页面保持旧数据符合当前源码实现，本轮作为设计说明记录，不认定为缺陷。9个场景均为 Pass，没有新增确认缺陷或风险记录。

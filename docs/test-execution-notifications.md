# 通知模块测试执行报告

## 1. 报告说明

本报告记录 2026-09-09 至 2026-09-10 实际完成的通知模块手工测试。测试覆盖邀请通知、用户数据隔离、已读状态、对象级权限、接受/拒绝状态转换、重复响应、通知删除、参数边界和未登录访问。

- 本轮共执行 `NOTIF-001`～`NOTIF-010` 10 个正式场景。
- 实际结果为 Pass 8、Fail 1、Risk 1。
- `NOTIF-003` 因“未读”与“待处理”语义缺少明确需求，记录为风险候选，不强判 Bug。
- `NOTIF-009` 已实际证明通知 ID 接受数字前缀非法字符串，登记为 `BUG-NOTIF-001`。
- 本报告不重复计算此前已完成的小组邀请场景，也不把源码预测当作执行结果。
- 测试过程中没有修改业务代码或数据库表结构。

## 2. 测试环境与固定角色

| 项目 | 内容 |
| --- | --- |
| 前端 | React + Vite，`http://localhost:5173` |
| 后端 | Node.js + Express，`http://localhost:3001` |
| 数据库 | 本地 MySQL |
| 测试方式 | 页面操作、DevTools Network/Console、只读 SQL 校验 |
| 目标小组 | group 31，`qa_group01` |

| 角色 | username | user_id | 本轮身份 |
| --- | --- | ---: | --- |
| A：组长 | `qa_user01` | 21 | group 31 owner、邀请发起人 |
| C：非成员 | `qa_nonmember01` | 26 | 邀请接收人；收尾后恢复为非成员 |

## 3. 执行结果汇总

| 场景 | 测试内容 | 主要实际结果 | 判定 | 关联问题 |
| --- | --- | --- | --- | --- |
| NOTIF-001 | 新邀请、未读红点与未入组状态 | 新增 `invite/pending/is_read=0`；C 尚未入组；红点为1 | **Pass** | — |
| NOTIF-002 | 当前用户通知数据隔离 | A、C 的 GET 响应只包含各自 `user_id` 的通知 | **Pass** | — |
| NOTIF-003 | 全部标记已读与刷新持久化 | PUT 200、SQL 为 `is_read=1`；pending 邀请仍显示“未读消息：1” | **Risk** | RISK-NOTIF-001 |
| NOTIF-004 | 处理、删除他人通知 | A respond C 通知返回403；DELETE返回404；状态和成员关系不变 | **Pass** | — |
| NOTIF-005 | 拒绝邀请与结果通知 | 原邀请 rejected；C 未入组；A 收到 `invite_result/rejected/is_read=0` | **Pass** | — |
| NOTIF-006 | 再邀请、接受与成员一致性 | 新建邀请；接受后 invite=accepted、C 成为member、A收到accepted结果 | **Pass** | — |
| NOTIF-007 | 重复响应与错误通知类型 | 已accepted邀请重复响应400；invite_result响应400；无重复数据 | **Pass** | — |
| NOTIF-008 | 删除自己的已读和未读通知 | 两类通知DELETE均200且数据库记录真实删除 | **Pass** | — |
| NOTIF-009 | ID、action参数边界 | 999999为404、0为400、非法action为400；`72abc`进入真实ID 72分支 | **Fail** | BUG-NOTIF-001 |
| NOTIF-010 | 无token访问四个通知接口 | GET、mark-read、respond、delete均返回401 | **Pass** | — |

## 4. 详细执行结果

### NOTIF-001：新邀请、未读红点与未入组状态 — Pass

- 前置SQL确认 C 不在 group 31，且没有该组 pending 邀请。
- A 邀请 C 后，notifications 新增 id 67：`user_id=26`、`sender_id=21`、`group_id=31`、`type=invite`、`status=pending`、`is_read=0`。
- C 的 `GET /api/notifications` 返回200、`unreadCount=1`，侧边栏红点显示1。
- 邀请发出后 C 仍不在 `group_members`，符合“确认后才加入小组”的流程。

证据：

- [前置：C不是成员](./screenshots/NOTIF-001-precheck-nonmember-sql.png)
- [前置：没有pending邀请](./screenshots/NOTIF-001-precheck-pending-invite-sql.png)
- [新建invite记录](./screenshots/NOTIF-001-invite-created-sql.png)
- [C收到未读通知接口数据](./screenshots/NOTIF-001-get-notifications-unread.png)
- [侧边栏未读红点](./screenshots/NOTIF-001-unread-badge-ui.png)
- [邀请后C仍未入组](./screenshots/NOTIF-001-after-invite-still-nonmember-sql.png)

### NOTIF-002：通知数据按当前用户隔离 — Pass

- C 的响应只包含 `user_id=26`，A 的响应只包含 `user_id=21`。
- 接口没有通过请求参数指定其他用户，未出现A读取C完整通知或C读取A完整通知的情况。
- 本场景验证读取隔离；NOTIF-004继续验证修改、删除权限。

证据：

- [A的通知响应只包含user_id 21](./screenshots/NOTIF-002-a-own-notifications-only.png)
- [C的通知响应只包含user_id 26](./screenshots/NOTIF-001-get-notifications-unread.png)

### NOTIF-003：已读持久化与pending计数语义 — Risk

- C进入通知页后，`PUT /api/notifications/mark-read` 返回200。
- SQL确认 id 67 的 `is_read` 由0变为1，刷新页面后仍为1。
- 但是原邀请仍为pending时，页面“未读消息”和侧边栏红点继续显示1。
- 当前前端把“pending邀请”或“is_read=0”都计入红点。需求没有明确红点表示未读消息还是待处理事项，因此本场景记录为 `RISK-NOTIF-001`，不计确认缺陷。

证据：

- [mark-read返回200但页面仍显示未读1](./screenshots/NOTIF-003-mark-read-ui-count-mismatch.png)
- [SQL确认is_read=1](./screenshots/NOTIF-003-mark-read-sql.png)
- [刷新后is_read仍为1](./screenshots/NOTIF-003-refresh-is-read-persist-sql.png)
- [刷新后pending计数仍为1](./screenshots/NOTIF-003-refresh-pending-count-ui.png)

### NOTIF-004：他人通知对象级权限 — Pass

- A直接对属于C的 id 67 调用respond，返回403“无权处理该通知”。
- A删除同一通知返回404“通知不存在或无权删除”。
- SQL确认通知仍为pending、`is_read=1`，C也没有被加入group 31。

证据：

- [他人respond返回403](./screenshots/NOTIF-004-other-user-respond-403.png)
- [他人DELETE返回404](./screenshots/NOTIF-004-other-user-delete-404.png)
- [越权操作后通知未改变](./screenshots/NOTIF-004-after-forbidden-notification-sql.png)
- [越权操作后成员关系未改变](./screenshots/NOTIF-004-after-forbidden-member-sql.png)

### NOTIF-005：拒绝邀请与结果通知 — Pass

- C拒绝 id 67，`POST /api/notifications/67/respond` 返回200。
- 原invite更新为rejected；C未加入group 31。
- A收到新的 id 68：`invite_result/rejected/is_read=0`。

证据：

- [拒绝请求返回200](./screenshots/NOTIF-005-reject-invite-200.png)
- [原invite更新为rejected](./screenshots/NOTIF-005-rejected-invite-sql.png)
- [拒绝后C仍未入组](./screenshots/NOTIF-005-reject-no-member-sql.png)
- [A收到拒绝结果通知](./screenshots/NOTIF-005-reject-result-notification-a.png)

### NOTIF-006：再次邀请、接受与成员一致性 — Pass

- rejected邀请没有被复用，再次邀请会创建新通知。
- 测试准备过程中 id 69 被拒绝并产生结果id 70；最终用于接受流程的是新建的id 71。这些均属于本场景测试数据，不额外计为正式场景。
- C对id 71提交 `{action: "accept"}` 后页面显示已同意。
- SQL确认id 71为accepted，`group_members(31,26)`新增且`role=member`。
- A收到id 72：`invite_result/accepted/is_read=0`。

证据：

- [再次邀请页面提示发送成功](./screenshots/NOTIF-006-reinvite-ui.png)
- [再次邀请创建新记录而非复用旧记录](./screenshots/NOTIF-006-reinvite-created-sql.png)
- [最终接受使用的新pending邀请](./screenshots/NOTIF-006-third-invite-created-sql.png)
- [accept请求payload与页面结果](./screenshots/NOTIF-006-accept-payload-ui.png)
- [原invite更新为accepted](./screenshots/NOTIF-006-accepted-invite-sql.png)
- [C新增为member](./screenshots/NOTIF-006-member-created-sql.png)
- [A收到accepted结果通知](./screenshots/NOTIF-006-accept-result-notification-a.png)

### NOTIF-007：状态与通知类型保护 — Pass

- C再次响应已accepted的id 71，返回400“该邀请已处理过”。
- A对`invite_result` id 72执行respond，返回400“暂不支持该类型通知”。
- 没有新增第二条成员记录，也没有重复创建接受结果通知。
- `invite_result`不支持respond属于当前明确设计，不是Bug。

证据：

- [已接受邀请重复respond返回400](./screenshots/NOTIF-007-repeat-respond-accepted-400.png)
- [invite_result类型respond返回400](./screenshots/NOTIF-007-invite-result-respond-400.png)

### NOTIF-008：删除自己的已读和未读通知 — Pass

- A删除自己的已读id 72，DELETE返回200，SQL确认记录不存在。
- 为验证未读删除，先由A移除C，使其恢复非成员；确认A没有未读通知后再创建id 73 `invite/pending/is_read=0`。
- C未进入通知页，直接删除自己的id 73，DELETE返回200，SQL确认记录不存在。

证据：

- [删除自己的已读通知返回200](./screenshots/NOTIF-008-delete-own-read-200.png)
- [已读通知数据库记录已删除](./screenshots/NOTIF-008-delete-own-read-sql.png)
- [准备未读删除前移除C](./screenshots/NOTIF-008-remove-c-before-unread-delete.png)
- [A当前无其他未读结果通知](./screenshots/NOTIF-008-no-unread-notification-sql.png)
- [id 73为未读pending邀请](./screenshots/NOTIF-008-unread-invite-before-delete-sql.png)
- [删除自己的未读通知返回200](./screenshots/NOTIF-008-delete-own-unread-200.png)
- [未读通知数据库记录已删除](./screenshots/NOTIF-008-delete-own-unread-sql.png)

### NOTIF-009：通知参数边界 — Fail

- 不存在id 999999返回404。
- id 0返回400“无效的通知ID”。
- 非法action返回400并说明只支持accept/reject。
- 路径使用`72abc`时，接口没有按非法ID返回“无效的通知ID”，而是将其解析为真实id 72并进入该记录的业务分支，最终返回“暂不支持该类型通知”。
- 该结果证明宽松`parseInt`解析已实际发生，登记为 `BUG-NOTIF-001`。

证据：

- [不存在通知ID返回404](./screenshots/NOTIF-009-nonexistent-id-404.png)
- [ID为0返回400](./screenshots/NOTIF-009-id-zero-400.png)
- [非法action返回400](./screenshots/NOTIF-009-invalid-action-400.png)
- [72abc被解析为真实ID 72](./screenshots/NOTIF-009-prefixed-id-loose-parse.png)

### NOTIF-010：未登录接口访问 — Pass

- 无痕窗口中`localStorage.getItem('token')`为null。
- GET notifications、PUT mark-read、POST id 71 respond、DELETE id 71均返回401“未登录或令牌无效”。
- 未读取或修改通知数据。

证据：

- [无痕环境无token](./screenshots/NOTIF-010-anonymous-no-token.png)
- [匿名GET返回401](./screenshots/NOTIF-010-anonymous-get-401.png)
- [匿名mark-read返回401](./screenshots/NOTIF-010-anonymous-mark-read-401.png)
- [匿名respond返回401](./screenshots/NOTIF-010-anonymous-respond-401.png)
- [匿名DELETE返回401](./screenshots/NOTIF-010-anonymous-delete-401.png)

## 5. 缺陷与风险归类

| 记录 | 性质 | 关联场景 | 结论 |
| --- | --- | --- | --- |
| BUG-NOTIF-001 | 已确认缺陷 | NOTIF-009 | 数字前缀非法notification id会被解析为真实ID并进入业务处理 |
| RISK-NOTIF-001 | 需求待确认 / 风险候选 | NOTIF-003 | pending invite在is_read=1后仍计入页面“未读消息”和侧边栏红点 |

## 6. 测试数据清理

- 本轮notification测试数据范围为id 67～73。
- id 72、73已在NOTIF-008中通过DELETE接口删除。
- 收尾前查询确认id 67～71均属于本轮邀请和邀请结果数据，随后精确删除。
- 最终查询`notifications WHERE id BETWEEN 67 AND 73`为0行。
- C最终已从group 31移除，`group_members WHERE group_id=31 AND user_id=26`为0行。
- 未删除范围外的历史notifications，也未修改A、B的正常成员关系。

清理证据：

- [清理前本轮剩余记录](./screenshots/NOTIF-CLEANUP-round-records-before-delete.png)
- [id 67～73清理后为0行](./screenshots/NOTIF-CLEANUP-round-records-deleted.png)
- [C最终恢复为非成员](./screenshots/NOTIF-CLEANUP-c-nonmember-sql.png)

## 7. 统计

### 7.1 通知模块

| 状态 | 数量 | 占比 |
| --- | ---: | ---: |
| 实际执行 | 10 | 100% |
| Pass | 8 | 80% |
| Fail | 1 | 10% |
| Risk / 待确认 | 1 | 10% |

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
| **累计** | **116** | **72** | **35** | **9** |

截至个人资料与密码模块完成，项目累计有19个已确认缺陷、1个业务规则缺口 / 可疑缺陷、8个需求待确认 / 风险候选，共28条问题记录。详情见 [`test-execution-profile.md`](./test-execution-profile.md)。

## 8. 结论

通知模块的主流程和对象级权限整体有效：通知按当前用户隔离，未登录请求被拦截，接受/拒绝状态只能转换一次，邀请结果和成员数据保持一致，用户只能处理或删除自己的通知。实际发现一项确认缺陷：通知ID接受数字前缀非法字符串；另有一项待确认风险：pending邀请已读后仍被显示为“未读消息”。

本轮共保留47张互不相同的通知测试截图，覆盖前置状态、页面、接口、SQL和最终清理。没有修改或修复业务代码。

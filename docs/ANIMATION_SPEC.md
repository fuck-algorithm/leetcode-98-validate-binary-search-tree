# 动画规格：LeetCode 98 验证二叉搜索树

## 可观察状态与结构
- 主结构：按层序输入重建的二叉树；节点身份由根到节点的路径（root/L/R）决定，坐标按树层和子树顺序固定。
- 辅助状态：递归调用栈、每个递归帧的严格上下界、当前节点及本次递归结果。
- 空子节点：在树最后一层显式绘制 null 位置；输入首项必须为整数。
- 当前仓库仍使用 `AlgorithmStep` 的 `nodeId/action/annotations` 快照；下一轮需迁移到通用 `frame/operation/narration/anchorIds` 动画契约。

## 布局预算
- Header 44–52px；输入条 ≤44px；页签当前不适用；底部控制条 ≤56px。
- 工作区为 `minmax(0, 1fr) clamp(320px, 24vw, 400px)`，代码栏置右，画布优先。
- 逻辑节点位置按稳定树路径和层级生成；窗口 resize 只按新画布尺寸确定布局，不在相邻步骤间重新随机布局。

## 步骤语义
| 事件 | operation（目标契约） | 焦点 | 解说重点 | 代码锚点 |
|---|---|---|---|---|
| 初始化 | init | 根节点 | 根节点允许的全局范围为负无穷到正无穷 | 初始化入口 |
| 进入递归 | recurse | 当前节点/空位 | 节点继承父节点传入的严格范围 | helper |
| 校验范围 | compare | 当前节点 | 必须严格满足 lower < value < upper，重复值也非法 | 比较条件 |
| 进入左子树 | recurse | 当前节点与左分支 | 左子树上界收紧为当前值 | 左递归 |
| 进入右子树 | recurse | 当前节点与右分支 | 右子树下界收紧为当前值 | 右递归 |
| 空节点返回 | return | 空位或调用栈 | 没有节点违反限制，因此该分支成立 | base case |
| 失败/完成 | done | 错误节点或结果 | 越界立即短路；所有分支成立才是 BST | return |

每个生成步骤都需要至少一个代码 anchor；焦点节点离开后应保留 visited，最终结果使用 done/error。

## 运动、色板与无障碍
- 目标色板：idle #dde9e6、current #2f9e7d、compare #e8b04b、visited #9ad3c2、done #18765a、error #c94a4a；不使用紫色，颜色外还需徽标/描边状态。
- 目标动效统一从 motion token 获取，最长不超过 dwell 的 55%；跳步中断现有过渡；退出使用统一淡出清理。
- `prefers-reduced-motion: reduce` 下 JS 时长归零、CSS 动效关闭，但步骤、解说、图例与代码高亮仍更新。

## 已知差距（阻断验收）
现有实现尚无固定操作徽标/图例/指标与 narration/anchorIds 通用字段，也没有 D3 enter/update/exit 运动 token；当前 D3 虽复用 keyed join，但坐标直接更新。必须完成渲染器拆分与覆盖测试、15 条 Playwright 验收和实际动效证据后，才可判 PASS。

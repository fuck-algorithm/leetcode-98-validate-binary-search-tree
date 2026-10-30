# 质量门禁

发布前必须执行 `npm run lint`、`npm run type-check`、`npm run build`、`npm run test:coverage`、`npm run test:e2e`。任一退出码非 0 即阻断发布。覆盖率要求 lines/functions ≥60%、branches ≥50%。最终验收还需核对 AC-001～AC-023、B1～B7、P0/P1=0，并保存首屏、播放、语言切换及 reduced-motion 证据。

当前状态：FAIL。详见 `ACCEPTANCE_REPORT_TEMPLATE.md` 与 `ANIMATION_SPEC.md` 中列出的未满足项。

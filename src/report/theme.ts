/**
 * Fabric brand tokens for the printed report.
 *
 * Taken from the Fabric house deck system: the brand is purple on light
 * surfaces with a black wordmark, Arial for body and headers, and Cambria
 * italic for a single accent phrase per title. (The earlier build of this tool
 * inherited a dark green theme from a prototype; that was never Fabric's.)
 *
 * Arial resolves to Liberation Sans and Cambria to Caladea where those are not
 * installed. Both are metric-compatible substitutes, so layout holds either
 * way.
 */
export const BRAND = {
  primary: '#8A61FF',
  deep: '#6A56DF',
  focus: '#6E47D4',
  button: '#624DAD',
  buttonHover: '#523D91',
  iconTint: '#6652C7',
  iconBg: '#EADDFF',
  light: '#E6DBFF',
  selected: '#E3D9FF',
  tintBg: '#FAF5FF',
  tintBorder: '#F3E8FF',
  bullet: '#C3B1FF',

  black: '#111111',
  gray: '#5B5B66',
  grayLight: '#8D8D97',
  line: '#E6E1EE',
  darkBg: '#111014',
} as const;

/**
 * Chart fills, validated with the dataviz palette validator against white.
 *
 * Human cost stages use a neutral ordinal ramp (they are ordered funnel
 * stages); Fabric spend uses the brand purple. Grey for the old way, purple
 * for the new one. The neutral-to-purple pair sits in the CVD warn band, so
 * every bar carries a direct label and the cost table always prints.
 */
export const VIZ = {
  stage1: '#ADA9B6', // resume screening  (2.30:1 on white)
  stage2: '#8D8D97', // phone screening
  stage3: '#5B5B66', // round 1 panels
  fabric: BRAND.primary,
  grid: BRAND.line,

  /**
   * Purple ordinal ramp for the candidate funnel, which is Fabric's own
   * activity rather than "the old way". Validated on white: lightest step
   * clears 2:1 (#BDA9FF at 2.04:1).
   */
  funnel1: '#BDA9FF',
  funnel2: BRAND.primary,
  funnel3: '#523D91',
} as const;

export const PAGE = {
  widthMm: 210,
  heightMm: 297,
  marginMm: 15,
} as const;

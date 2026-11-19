/**
 * Fee → Pricing Rules → one rule, opened: everything the rule resolves to, seven ways.
 *
 * A rule card is a summary of a cross product (fee-tree.ts). This page draws the product
 * itself, so the question the card cannot answer — *which instrument, on which method,
 * actually charges what* — is answered by looking rather than by clicking through a form.
 *
 * Two of the seven are trees, on a dial (fee-layout.ts). `down` is an org chart: a parent
 * centred over its children, which makes the shape of the configuration legible before any of
 * the detail is. `right` is a file tree: every level costs one indent instead of one row of
 * width, so a deep rule stays on one screen.
 *
 * Both are drawn with the same two connectors, and the difference between them is only which
 * one is used where. `Fan` brackets children under a parent; `Rail` hangs them off a vertical.
 * The `down` tree fans its fixed top (merchant → category → kind) and rails everything that
 * grows with the rule; the `right` tree rails the whole way.
 *
 * **The trees draw `BRANCHES` of each level below a fee kind, not all of them** — two methods,
 * two instruments each. That cap lives here rather than in the data, because it is a property
 * of *drawing a tree*: past two children a fan is wider than a screen and the shape stops
 * being the thing you can see. The other five views are built from the same data uncapped
 * (fee-views.ts), which is the trade they exist to make.
 *
 * The other five are not layouts of the tree. Each is one question a tree answers badly, and
 * they live in FeeViews.tsx; this file picks between them and nothing more.
 *
 * blend-gap: Blend has no tree, org-chart or hierarchy component — the nearest are `Directory`
 * (a flat nav rail) and `Timeline` (one vertical sequence), and neither draws a branching
 * parent/child connector. So the nodes and connectors are composed from Tailwind layout and
 * `FOUNDATION_THEME` tokens; everything inside a node that Blend does have — the mode tag, the
 * buttons, the breadcrumb — is Blend's.
 */

import {
  BreadcrumbV2,
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
  TabsV2,
  TabsV2Content,
  TabsV2List,
  TabsV2Size,
  TabsV2Trigger,
  TabsV2Variant,
} from "@juspay/blend-design-system";
import {
  ArrowLeft,
  CircleAlert,
  FileText,
  ListTree,
  Network,
} from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import { FEE_PATH } from "../../layout/navigation";
import { font, PrimitiveText } from "../../primitives";
import { HAIRLINE, PANEL_STYLE } from "../pacb/helpers";
import { PacbPage } from "../pacb/kit";
import { FEE_RULES, type FeeRule } from "./data";
import {
  useFeeView,
  type FeeView,
  type FlatView,
  type TreeDirection,
} from "./fee-layout";
// `FeeTree` is this file's own default export, so the tree's type comes in renamed.
import {
  branch,
  feeTree,
  type FeeTree as RuleTree,
  type TreeCategory,
  type TreeLeaf,
  type TreeScope,
} from "./fee-tree";
import { feeRows, type FeeRow } from "./fee-views";
import {
  FeeCompare,
  FeeCoverage,
  FeeOutline,
  FeeSummary,
  FeeTable,
} from "./FeeViews";
import { Empty, ModeTag } from "./tags";

const { colors } = FOUNDATION_THEME;

/** The connector's colour — the module's hairline, so the tree sits on the page's own grid. */
const LINE = colors.gray[200];

/** The fan: how far a parent drops to the bar, and the bar to a child. */
const DROP = 20;
/** The fan: between two children of the same parent. */
const FAN_GAP = 24;

/** The rail: between rows, the elbow's reach, and how far in the rail hangs. */
const RAIL_GAP = 12;
const RAIL_ARM = 20;
const RAIL_INDENT = 16;

/** The corner that takes a fanned parent's centre across to the rail hanging under it. */
const ELBOW = 14;

/** The left-to-right tree's own rail, with a longer arm because it carries the whole level. */
const LR_GAP = 12;
const LR_ARM = 28;

/** The leaf cards are a fixed width, so a column of them has one left and one right edge. */
const LEAF_WIDTH = 264;

const ICON_SIZE = 14;
const BACK_ICON_SIZE = 16;

// ─── Nodes ───────────────────────────────────────────────────────────────────────────────

/**
 * Every node but the leaf is the same pill in a different colour, and the colour is the only
 * thing carrying the level — so they are one component with a palette, rather than four
 * near-copies that can drift apart.
 */
function Pill({
  label,
  fill,
  ink,
  icon,
}: {
  label: string;
  // Blend types every ramp step as `Color | undefined` — the ramps are partial records, and a
  // step that is absent is `undefined` rather than a type error. CSS reads undefined as
  // "unset", which is the right fallback, so they are passed through as they come.
  fill: string | undefined;
  ink: string | undefined;
  icon?: ReactNode;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-2 px-4 py-2"
      style={{
        backgroundColor: fill,
        borderRadius: FOUNDATION_THEME.border.radius[8],
      }}
    >
      {icon}
      <PrimitiveText
        {...font(FOUNDATION_THEME.font.size.body.sm)}
        color={ink}
        style={{ whiteSpace: "nowrap" }}
      >
        {label}
      </PrimitiveText>
    </div>
  );
}

/** One scope on a leaf: what it is, then every line it charges. */
function Scope({ scope }: { scope: TreeScope }) {
  return (
    <div className="flex flex-col">
      <PrimitiveText
        {...font(FOUNDATION_THEME.font.size.body.sm)}
        color={colors.orange[500]}
      >
        {scope.label}
      </PrimitiveText>
      {scope.lines.map((line, index) => (
        // Keyed by position: a rule may price two bands the same, and two identical strings
        // cannot both be a React key.
        <PrimitiveText
          key={index}
          {...font(FOUNDATION_THEME.font.size.body.sm)}
          color={colors.green[600]}
        >
          {line}
        </PrimitiveText>
      ))}
    </div>
  );
}

/** An instrument and what it is priced at — the only node that is a card rather than a pill. */
function Leaf({ leaf }: { leaf: TreeLeaf }) {
  return (
    <div
      className="flex shrink-0 flex-col gap-2 px-3.5 py-3"
      style={{ ...PANEL_STYLE, width: LEAF_WIDTH }}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <PrimitiveText
          {...font(FOUNDATION_THEME.font.size.body.sm)}
          color={colors.gray[700]}
          style={{ flex: "1 0 0", minWidth: 0 }}
          truncate
        >
          {leaf.name}
        </PrimitiveText>
        <ModeTag mode={leaf.mode} />
      </div>
      <div
        className="flex flex-col gap-1.5 pt-2"
        style={{ borderTop: HAIRLINE }}
      >
        {leaf.scopes.map((scope) => (
          <Scope key={scope.label} scope={scope} />
        ))}
      </div>
    </div>
  );
}

/** A branch with nothing configured under it. Said out loud, rather than left out. */
function NoData() {
  return (
    <Pill
      label="No data"
      fill={colors.gray[100]}
      ink={colors.gray[500]}
      icon={
        <CircleAlert size={ICON_SIZE} color={colors.gray[500]} aria-hidden />
      }
    />
  );
}

// ─── Connectors ──────────────────────────────────────────────────────────────────────────

/**
 * Children hung off a vertical rail, each reached by an elbow into its middle.
 *
 * The rail is drawn per row rather than as one element spanning the list, because its ends
 * have to stop at the *first and last rows' centres*, and only a row knows where its own
 * centre is — a leaf card and a pill are different heights. Each row draws the segment above
 * its elbow and the segment below it, overhanging the flex gap by exactly the gap, so
 * consecutive segments meet without anything measuring anything.
 *
 * `bracket` is which end the parent arrives from. Hanging (the default) the rail runs up past
 * the first row to the container's top edge, where a `Branch` elbow is waiting. Bracketed, it
 * stops at the first row's centre, because the parent arrives horizontally into the middle of
 * the list instead — which is the whole of the left-to-right tree.
 */
function Rail({
  items,
  bracket = false,
  indent = RAIL_INDENT,
  gap = RAIL_GAP,
  arm = RAIL_ARM,
}: {
  items: ReactNode[];
  bracket?: boolean;
  indent?: number;
  gap?: number;
  arm?: number;
}) {
  const last = items.length - 1;
  return (
    <div className="flex flex-col" style={{ gap, paddingLeft: indent + arm }}>
      {items.map((item, index) => (
        <div key={index} className="relative">
          <div
            className="absolute w-px"
            style={{
              left: -arm,
              top: index === 0 ? (bracket ? "50%" : -(gap + ELBOW)) : -gap,
              bottom: index === last ? "50%" : -gap,
              backgroundColor: LINE,
            }}
            aria-hidden
          />
          <div
            className="absolute h-px"
            style={{
              left: -arm,
              top: "50%",
              width: arm,
              backgroundColor: LINE,
            }}
            aria-hidden
          />
          {item}
        </div>
      ))}
    </div>
  );
}

/**
 * A fanned parent centred over its children, joined by a drop, a bar and a drop each.
 *
 * Two things make the bar actually meet the children, and both were wrong the first time.
 * The bar is clipped to half width at each end, so it starts and stops at the outermost
 * children's *centres* rather than overhanging them. And it overhangs the flex gap by half
 * on every inner edge — an absolutely positioned child is bounded by its parent's padding
 * box, so a bar that stopped at `0` stopped at the column's edge and left the gap unbridged.
 */
function Fan({ node, items }: { node: ReactNode; items: ReactNode[] }) {
  const last = items.length - 1;
  return (
    <div className="flex flex-col items-center">
      {node}
      <div
        className="w-px"
        style={{ height: DROP, backgroundColor: LINE }}
        aria-hidden
      />
      <div className="flex items-start" style={{ gap: FAN_GAP }}>
        {items.map((item, index) => (
          <div key={index} className="flex flex-col items-center">
            <div
              className="relative w-full"
              style={{ height: DROP }}
              aria-hidden
            >
              <div
                className="absolute top-0 h-px"
                style={{
                  left: index === 0 ? "50%" : -FAN_GAP / 2,
                  right: index === last ? "50%" : -FAN_GAP / 2,
                  backgroundColor: LINE,
                }}
              />
              <div
                className="absolute left-1/2 top-0 w-px"
                style={{ height: DROP, backgroundColor: LINE }}
              />
            </div>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The join between the two connectors: a fanned pill, and a rail hanging under it.
 *
 * The pill is centred over its subtree — which is what lets `Fan` anchor its bar on the
 * column's midpoint and have it land on the pill — while the rail hangs at a fixed indent
 * from the column's left edge. So the two do not share an x, and this corner is what takes
 * the line from one to the other: down from the pill's centre, then left to the rail.
 */
function Branch({ pill, children }: { pill: ReactNode; children?: ReactNode }) {
  if (!children) return <>{pill}</>;
  return (
    <div className="flex flex-col items-center">
      {pill}
      <div className="relative w-full" style={{ height: ELBOW }} aria-hidden>
        <div
          className="absolute left-1/2 top-0 w-px"
          style={{ height: ELBOW, backgroundColor: LINE }}
        />
        <div
          className="absolute h-px"
          style={{
            top: ELBOW,
            left: RAIL_INDENT,
            right: "50%",
            backgroundColor: LINE,
          }}
        />
      </div>
      <div className="self-start">{children}</div>
    </div>
  );
}

/**
 * The left-to-right tree's one shape: a parent, an arm out of its right edge, and its children
 * stacked to the right off a bracket.
 *
 * Every level is this, which is why the horizontal tree needs no `Fan` and no `Branch` — the
 * parent arrives into the middle of its children's list, so the rail brackets rather than
 * hangs, and nothing has to change x between levels.
 */
function Row({ node, items }: { node: ReactNode; items: ReactNode[] }) {
  return (
    <div className="flex items-center">
      {node}
      <div
        className="h-px shrink-0"
        style={{ width: LR_ARM, backgroundColor: LINE }}
        aria-hidden
      />
      <Rail items={items} bracket indent={0} gap={LR_GAP} arm={LR_ARM} />
    </div>
  );
}

// ─── The two trees ───────────────────────────────────────────────────────────────────────

const RootPill = ({ label }: { label: string }) => (
  <Pill
    label={label}
    fill={colors.purple[500]}
    ink={colors.gray[0]}
    icon={<FileText size={ICON_SIZE} color={colors.gray[0]} aria-hidden />}
  />
);

const CategoryPill = ({ label }: { label: string }) => (
  <Pill label={label} fill={colors.gray[950]} ink={colors.gray[0]} />
);

const KindPill = ({ label }: { label: string }) => (
  <Pill label={label} fill={colors.purple[50]} ink={colors.purple[600]} />
);

const MethodPill = ({ label }: { label: string }) => (
  <Pill label={label} fill={colors.green[50]} ink={colors.green[600]} />
);

function DownTree({
  root,
  categories,
}: {
  root: string;
  categories: TreeCategory[];
}) {
  return (
    <Fan
      node={<RootPill label={root} />}
      items={categories.map((category) => (
        <Fan
          key={category.id}
          node={<CategoryPill label={category.label} />}
          items={category.kinds.map((kind) => (
            <Branch key={kind.id} pill={<KindPill label={kind.label} />}>
              <Rail
                items={
                  kind.methods.length === 0
                    ? [<NoData key="none" />]
                    : branch(kind.methods).map((method) => (
                        <Branch
                          key={method.id}
                          pill={<MethodPill label={method.label} />}
                        >
                          <Rail
                            items={branch(method.leaves).map((leaf) => (
                              <Leaf key={leaf.id} leaf={leaf} />
                            ))}
                          />
                        </Branch>
                      ))
                }
              />
            </Branch>
          ))}
        />
      ))}
    />
  );
}

function RightTree({
  root,
  categories,
}: {
  root: string;
  categories: TreeCategory[];
}) {
  return (
    <Row
      node={<RootPill label={root} />}
      items={categories.map((category) => (
        <Row
          key={category.id}
          node={<CategoryPill label={category.label} />}
          items={category.kinds.map((kind) =>
            kind.methods.length === 0 ? (
              <Row
                key={kind.id}
                node={<KindPill label={kind.label} />}
                items={[<NoData key="none" />]}
              />
            ) : (
              <Row
                key={kind.id}
                node={<KindPill label={kind.label} />}
                items={branch(kind.methods).map((method) => (
                  <Row
                    key={method.id}
                    node={<MethodPill label={method.label} />}
                    items={branch(method.leaves).map((leaf) => (
                      <Leaf key={leaf.id} leaf={leaf} />
                    ))}
                  />
                ))}
              />
            ),
          )}
        />
      ))}
    />
  );
}

// ─── The page ────────────────────────────────────────────────────────────────────────────

/** The chart scrolls on its own, so a wide or deep tree never resizes the page around it. */
const SCROLLER: CSSProperties = { overflowX: "auto" };

/** `down` centres under the page; `right` starts at the left edge and runs off to the side. */
const ALIGN: Record<TreeDirection, string> = {
  down: "inline-flex min-w-full justify-center px-2",
  right: "inline-flex min-w-full px-2",
};

/**
 * Every view that is not a tree, keyed by its dial value.
 *
 * A record rather than a switch, for the reason `GRIDS` is one on the rules page: it is keyed
 * by the union, so adding a value to `FlatView` without a screen to draw it is a build error
 * rather than a dial option that renders nothing.
 */
const FLAT: Record<
  FlatView,
  (props: { rows: FeeRow[]; rule: FeeRule }) => ReactNode
> = {
  table: ({ rows }) => <FeeTable rows={rows} />,
  outline: ({ rows }) => <FeeOutline rows={rows} />,
  coverage: ({ rule }) => <FeeCoverage rule={rule} />,
  compare: ({ rows }) => <FeeCompare rows={rows} />,
  summary: ({ rows, rule }) => <FeeSummary rows={rows} rule={rule} />,
};

const FLAT_VIEWS = Object.keys(FLAT) as FlatView[];

const isTree = (view: string): view is TreeDirection =>
  view === "down" || view === "right";

/**
 * What the page's switcher offers: six tabs, not seven.
 *
 * The two trees are one tab. They are the same view drawn two ways — same nodes, same depth,
 * same cap — and the thing that differs is a property of the drawing, so it belongs to the
 * tree rather than beside the five things that are genuinely other views. Six one-word labels
 * also survive a narrow screen, which "Tree 1 — Top to bottom" does not.
 *
 * The dial keeps all seven flat, because a workbench panel is a list of states and does not
 * have to model them (fee-layout.ts). Both write the same value, so neither is the odd one.
 */
const TREE_TAB = "tree";

const TABS: { value: string; label: string }[] = [
  { value: TREE_TAB, label: "Tree" },
  { value: "table", label: "Table" },
  { value: "outline", label: "Outline" },
  { value: "coverage", label: "Coverage" },
  { value: "compare", label: "Compare" },
  { value: "summary", label: "Summary" },
];

/**
 * `TabsV2List` in a box that clips.
 *
 * The list scrolls its own triggers correctly — an inner `overflow-x: auto` with the
 * scrollbar hidden — but the element around that scroller is `overflow: visible` and keeps
 * the full track width. At 375px that leaked 45px of horizontal scroll onto the shell's
 * `[data-main-content]`, so clicking a tab off the right edge dragged the whole page sideways
 * with the tab row. `min-w-0` so the wrapper may be narrower than its content,
 * `overflow-hidden` so the leak stops here.
 *
 * Wrapping is safe: `TabsV2.renderChildren` injects `variant`/`size` into a child it
 * recognises by displayName, which a wrapper hides — but `TabsV2List` falls back to
 * `useTabsV2Context()`, and the root's provider carries both (tabsV2.context.tsx:6).
 */
function TabBar({ children }: { children: ReactNode }) {
  return <div className="min-w-0 overflow-hidden">{children}</div>;
}

/** Which way the tree grows — shown inside the tree's own panel, next to what it changes. */
const DIRECTION_ICON: Record<TreeDirection, typeof Network> = {
  down: Network,
  right: ListTree,
};

const DIRECTION_LABEL: Record<TreeDirection, string> = {
  down: "Top to bottom",
  right: "Left to right",
};

/**
 * The tree, and the pair of pills that says which way it grows.
 *
 * A second `TabsV2` rather than two buttons, and PILLS rather than the page's UNDERLINE, for
 * two reasons. Blend has no borderless button — the enum is PRIMARY, SECONDARY, DANGER,
 * SUCCESS — so a hand-built pair would have had to invent an unselected state, and inventing
 * a state is how a design system starts to drift. And the trees *are* this control's panels,
 * so putting them inside its `TabsV2Content` is the honest markup: the triggers point at
 * something, rather than carrying an `aria-controls` that leads nowhere.
 *
 * PILLS against the page's UNDERLINE so the two do not read as two tab bars. One is where
 * you are in the page; this is a property of what you are looking at.
 */
function TreePanel({
  tree,
  direction,
  onChange,
}: {
  tree: RuleTree;
  direction: TreeDirection;
  onChange: (next: TreeDirection) => void;
}) {
  return (
    <TabsV2
      value={direction}
      onValueChange={(next) => onChange(next as TreeDirection)}
      variant={TabsV2Variant.PILLS}
      size={TabsV2Size.SM}
      fitContent
    >
      <TabBar>
        <TabsV2List
          variant={TabsV2Variant.PILLS}
          size={TabsV2Size.SM}
          fitContent
        >
          {(Object.keys(DIRECTION_ICON) as TreeDirection[]).map((option) => {
            const Icon = DIRECTION_ICON[option];
            return (
              <TabsV2Trigger
                key={option}
                value={option}
                // Untinted: a tab trigger sets its own colour per state, and the icon should
                // follow it rather than fight it (rule 11 — slots where glyph and label are one
                // thing keep inheriting).
                leftSlot={<Icon size={ICON_SIZE} />}
              >
                {DIRECTION_LABEL[option]}
              </TabsV2Trigger>
            );
          })}
        </TabsV2List>
      </TabBar>
      {(Object.keys(DIRECTION_ICON) as TreeDirection[]).map((option) => (
        <TabsV2Content key={option} value={option}>
          <div style={SCROLLER} className="pb-2 pt-4">
            <div className={ALIGN[option]}>
              {option === "down" ? (
                <DownTree {...tree} />
              ) : (
                <RightTree {...tree} />
              )}
            </div>
          </div>
        </TabsV2Content>
      ))}
    </TabsV2>
  );
}

export default function FeeTree() {
  const { ruleId } = useParams();
  const navigate = useNavigate();
  const { view, setView } = useFeeView();
  const [direction, setDirection] = useState<TreeDirection>("down");
  const rule = FEE_RULES.find((entry) => entry.id === ruleId);

  const toRules = () => navigate(FEE_PATH);
  const back = (
    <ButtonV2
      buttonType={ButtonV2Type.SECONDARY}
      size={ButtonV2Size.SMALL}
      subType={ButtonV2SubType.ICON_ONLY}
      onClick={toRules}
      aria-label="Back to Pricing Rules"
      leftSlot={{ slot: <ArrowLeft size={BACK_ICON_SIZE} /> }}
    />
  );

  if (!rule) {
    return (
      <PacbPage title="Pricing Rule" description="" lead={back}>
        <Empty query={ruleId ?? ""} />
      </PacbPage>
    );
  }

  const tree = feeTree(rule);

  /**
   * Which way the tree points, kept while you are reading one of the other five.
   *
   * Adjusted during render rather than in an effect — React's documented pattern, and the
   * same reasoning as rule 14's `rendered` flag: an effect would paint one frame of the old
   * direction first. It also keeps this in step when the change came from the dial panel,
   * which sets a direction straight onto `view` and never touches this.
   */
  if (isTree(view) && view !== direction) setDirection(view);

  /** A tab click: the five flat views are their own value, Tree resumes where it left off. */
  const choose = (next: string) =>
    setView(next === TREE_TAB ? direction : (next as FeeView));

  const crumb = (id: string, label: string) => ({
    id,
    label,
    href: FEE_PATH,
    onClick: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      toRules();
    },
  });

  return (
    <PacbPage
      title={rule.name}
      description={rule.description}
      lead={
        <div className="flex flex-wrap items-center gap-3">
          {back}
          <BreadcrumbV2
            items={[
              crumb("fee", "Fee"),
              crumb("rules", "Pricing Rules"),
              { id: rule.id, label: rule.name, href: `${FEE_PATH}/${rule.id}` },
            ]}
          />
        </div>
      }
    >
      <TabsV2 value={isTree(view) ? TREE_TAB : view} onValueChange={choose}>
        <TabBar>
          <TabsV2List>
            {TABS.map((tab) => (
              <TabsV2Trigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsV2Trigger>
            ))}
          </TabsV2List>
        </TabBar>
        <TabsV2Content value={TREE_TAB}>
          <TreePanel tree={tree} direction={direction} onChange={setView} />
        </TabsV2Content>
        {FLAT_VIEWS.map((flat) => (
          // Radix mounts only the open panel, so the four you are not reading cost nothing —
          // which is also why the row model is rebuilt here rather than hoisted above the
          // tabs: hoisting it would compute 36 rows for five views to ignore.
          <TabsV2Content key={flat} value={flat}>
            <div className="pt-4">
              {FLAT[flat]({ rows: feeRows(tree), rule })}
            </div>
          </TabsV2Content>
        ))}
      </TabsV2>
    </PacbPage>
  );
}

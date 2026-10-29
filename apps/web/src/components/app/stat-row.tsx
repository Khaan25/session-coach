import { EMPTY_VALUE } from "@/lib/quartz/format";
import {
  Stat,
  StatDescription,
  StatGroup,
  StatLabel,
  StatUnit,
  StatValue,
} from "@/components/ui/stat";

type StatRowProps = {
  cardsDueToday?: number;
  sessionsThisWeek?: number;
  /** Share of answers scored 2, 0 to 100. null before the first review. */
  explainedPercent?: number | null;
  /** Holds each value's box while the numbers load. */
  loading?: boolean;
};

/** The dashboard's stats strip: one frame, cells split by its rules, never a row of cards. */
export function StatRow({
  cardsDueToday = 0,
  sessionsThisWeek = 0,
  explainedPercent = null,
  loading,
}: StatRowProps) {
  return (
    <StatGroup aria-busy={loading || undefined}>
      <Stat loading={loading}>
        <StatLabel>Cards due today</StatLabel>
        <StatValue>{cardsDueToday}</StatValue>
      </Stat>
      <Stat loading={loading}>
        <StatLabel>Sessions this week</StatLabel>
        <StatValue>{sessionsThisWeek}</StatValue>
      </Stat>
      {/* TODO(zia): confirm what "explained back" counts (answers scored 2, or ARCHITECTURE.md's "can still explain"). */}
      <Stat loading={loading}>
        <StatLabel>Explained back</StatLabel>
        <StatValue>
          {explainedPercent === null ? (
            EMPTY_VALUE
          ) : (
            <>
              {Math.round(explainedPercent)}
              <StatUnit>%</StatUnit>
            </>
          )}
        </StatValue>
        {explainedPercent === null && !loading && <StatDescription>No reviews yet</StatDescription>}
      </Stat>
    </StatGroup>
  );
}

import { days, hours, percent } from '../engine/format';
import type { RoiResult } from '../engine/types';

/**
 * Freed hours, split by whose hours they are.
 *
 * Pooling recruiter and interviewer time into one "hours saved" figure is what
 * made the prototype's story contradict itself: it claimed every hiring hour
 * disappeared while the same recruiters stayed on payroll. Recruiter hours are
 * capacity that gets redeployed; interviewer hours go back to the work those
 * engineers were hired for. Those are different claims, so they are shown as
 * different numbers.
 */
export function TimeSaved({ result }: { result: RoiResult }) {
  const t = result.timeSaved;

  return (
    <div className="timesaved avoid-break">
      <div className="timesaved__grid">
        <div className="timesaved__item">
          <div className="timesaved__label">Recruiter hours freed</div>
          <div className="timesaved__val tnum">{hours(t.recruiterHours)}<span>/mo</span></div>
          <p className="timesaved__note">
            {t.recruiterCapacityFreedPct !== null ? (
              <>
                {percent(t.recruiterCapacityFreedPct)} of your recruiting team&rsquo;s capacity,
                redeployed to sourcing and closing rather than removed from payroll.
              </>
            ) : (
              <>Time returned to sourcing, candidate experience and closing.</>
            )}
          </p>
        </div>

        <div className="timesaved__item">
          <div className="timesaved__label">Senior interviewer hours freed</div>
          <div className="timesaved__val tnum">{hours(t.interviewerHours)}<span>/mo</span></div>
          <p className="timesaved__note">
            Panel and debrief time returned to the engineers and managers who were
            running first rounds.
          </p>
        </div>

        <div className="timesaved__item timesaved__item--total">
          <div className="timesaved__label">Combined</div>
          <div className="timesaved__val tnum">{hours(t.totalHours)}<span>/mo</span></div>
          <p className="timesaved__note">
            About {days(t.workingDays)} working days at 8 hours a day.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * REPLACE FUNCTION WITH COMMAND
 *
 * Turn a function into a command object (a class with an execute method).
 *
 * Motivation:
 * - Commands can have state and multiple methods
 * - Can support undo operations
 * - Can be queued, logged, or serialized
 * - Complex functions become easier to manage
 *
 * Mechanics:
 * 1. Create a class for the function
 * 2. Move the function body to an execute method
 * 3. Move function parameters to constructor or execute
 */

// ============================================================================
// BEFORE: Complex function
// ============================================================================

interface CandidateBefore {
  originState: string;
  score: number;
}

function scoreCandidateBefore(
  candidate: CandidateBefore,
  medicalExam: { isSmoker: boolean },
  scoringGuide: { stateWithLowCertification: (state: string) => boolean }
): number {
  let result = candidate.score;
  let healthLevel = 0;

  if (medicalExam.isSmoker) {
    healthLevel += 10;
  }

  let certificationGrade = "regular";
  if (scoringGuide.stateWithLowCertification(candidate.originState)) {
    certificationGrade = "low";
    result -= 5;
  }

  result -= Math.max(healthLevel - 5, 0);

  return result;
}

// ============================================================================
// AFTER: Command object
// ============================================================================

interface Candidate {
  originState: string;
  score: number;
}

interface MedicalExam {
  isSmoker: boolean;
}

interface ScoringGuide {
  stateWithLowCertification(state: string): boolean;
}

class ScoreCandidateCommand {
  private _candidate: Candidate;
  private _medicalExam: MedicalExam;
  private _scoringGuide: ScoringGuide;
  private _result: number = 0;
  private _healthLevel: number = 0;
  private _certificationGrade: string = "regular";

  constructor(candidate: Candidate, medicalExam: MedicalExam, scoringGuide: ScoringGuide) {
    this._candidate = candidate;
    this._medicalExam = medicalExam;
    this._scoringGuide = scoringGuide;
  }

  execute(): number {
    this._result = this._candidate.score;
    this._healthLevel = 0;
    this.scoreSmoking();
    this.scoreCertification();
    this.scoreHealthLevel();
    return this._result;
  }

  private scoreSmoking(): void {
    if (this._medicalExam.isSmoker) {
      this._healthLevel += 10;
    }
  }

  private scoreCertification(): void {
    if (this._scoringGuide.stateWithLowCertification(this._candidate.originState)) {
      this._certificationGrade = "low";
      this._result -= 5;
    }
  }

  private scoreHealthLevel(): void {
    this._result -= Math.max(this._healthLevel - 5, 0);
  }
}

// Convenience function
function scoreCandidate(
  candidate: Candidate,
  medicalExam: MedicalExam,
  scoringGuide: ScoringGuide
): number {
  return new ScoreCandidateCommand(candidate, medicalExam, scoringGuide).execute();
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Replace Function with Command ===\n");

const candidate: Candidate = { originState: "CA", score: 100 };
const medicalExam: MedicalExam = { isSmoker: true };
const scoringGuide: ScoringGuide = {
  stateWithLowCertification: (state) => state === "TX",
};

const score = scoreCandidate(candidate, medicalExam, scoringGuide);
console.log(`Candidate score: ${score}`);

// Or use command directly for more control
const command = new ScoreCandidateCommand(candidate, medicalExam, scoringGuide);
console.log(`Via command: ${command.execute()}`);

void scoreCandidateBefore;

export {};

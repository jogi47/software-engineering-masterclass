/**
 * CONSOLIDATE CONDITIONAL EXPRESSION
 *
 * Combine multiple conditional checks that result in the same action
 * into a single conditional with a descriptive name.
 *
 * Motivation:
 * - Multiple checks for the same result are confusing
 * - A combined check with a good name explains why
 * - Makes it easier to apply Extract Function
 * - Reduces duplication of the result action
 *
 * Mechanics:
 * 1. Ensure none of the conditionals have side effects
 * 2. Combine the conditionals using logical operators
 * 3. Consider applying Extract Function to the combined condition
 */

// ============================================================================
// BEFORE: Multiple separate checks with same result
// ============================================================================

function disabilityAmountBefore(employee: {
  seniority: number;
  monthsDisabled: number;
  isPartTime: boolean;
}): number {
  // Multiple checks all leading to same result
  if (employee.seniority < 2) return 0;
  if (employee.monthsDisabled > 12) return 0;
  if (employee.isPartTime) return 0;

  // Actual calculation
  return employee.seniority * 100 + employee.monthsDisabled * 50;
}

// ============================================================================
// AFTER: Consolidated into a single, named condition
// ============================================================================

interface Employee {
  seniority: number;
  monthsDisabled: number;
  isPartTime: boolean;
}

function isNotEligibleForDisability(employee: Employee): boolean {
  return (
    employee.seniority < 2 ||
    employee.monthsDisabled > 12 ||
    employee.isPartTime
  );
}

function disabilityAmount(employee: Employee): number {
  if (isNotEligibleForDisability(employee)) return 0;
  return employee.seniority * 100 + employee.monthsDisabled * 50;
}

// ============================================================================
// EXAMPLE: AND conditions
// ============================================================================

interface Vacation {
  daysAccrued: number;
  daysUsed: number;
  approved: boolean;
  department: string;
}

// BEFORE: Separate checks that all need to be true
function canTakeVacationBefore(vacation: Vacation): boolean {
  if (vacation.daysAccrued < vacation.daysUsed + 1) return false;
  if (!vacation.approved) return false;
  if (vacation.department === "emergency") return false;
  return true;
}

// AFTER: Consolidated with AND
function hasAvailableDays(vacation: Vacation): boolean {
  return vacation.daysAccrued >= vacation.daysUsed + 1;
}

function isVacationAllowed(vacation: Vacation): boolean {
  return vacation.department !== "emergency";
}

function canTakeVacation(vacation: Vacation): boolean {
  return hasAvailableDays(vacation) && vacation.approved && isVacationAllowed(vacation);
}

// ============================================================================
// EXAMPLE: Complex eligibility rules
// ============================================================================

interface LoanApplication {
  creditScore: number;
  income: number;
  existingDebt: number;
  employmentYears: number;
  bankruptcyHistory: boolean;
  requestedAmount: number;
}

// BEFORE: Scattered rejection conditions
function approveLoanBefore(app: LoanApplication): { approved: boolean; reason?: string } {
  if (app.bankruptcyHistory) {
    return { approved: false, reason: "Bankruptcy history" };
  }
  if (app.creditScore < 600) {
    return { approved: false, reason: "Credit score too low" };
  }
  if (app.existingDebt / app.income > 0.4) {
    return { approved: false, reason: "Debt to income ratio too high" };
  }
  if (app.employmentYears < 1) {
    return { approved: false, reason: "Insufficient employment history" };
  }
  if (app.requestedAmount > app.income * 5) {
    return { approved: false, reason: "Amount too high relative to income" };
  }

  return { approved: true };
}

// AFTER: Consolidated with clear eligibility checks
function hasBankruptcyHistory(app: LoanApplication): boolean {
  return app.bankruptcyHistory;
}

function hasPoorCredit(app: LoanApplication): boolean {
  return app.creditScore < 600;
}

function hasHighDebtRatio(app: LoanApplication): boolean {
  return app.existingDebt / app.income > 0.4;
}

function hasInsufficientEmployment(app: LoanApplication): boolean {
  return app.employmentYears < 1;
}

function isAmountTooHigh(app: LoanApplication): boolean {
  return app.requestedAmount > app.income * 5;
}

function getRejectionReason(app: LoanApplication): string | null {
  if (hasBankruptcyHistory(app)) return "Bankruptcy history";
  if (hasPoorCredit(app)) return "Credit score too low";
  if (hasHighDebtRatio(app)) return "Debt to income ratio too high";
  if (hasInsufficientEmployment(app)) return "Insufficient employment history";
  if (isAmountTooHigh(app)) return "Amount too high relative to income";
  return null;
}

function isEligibleForLoan(app: LoanApplication): boolean {
  return (
    !hasBankruptcyHistory(app) &&
    !hasPoorCredit(app) &&
    !hasHighDebtRatio(app) &&
    !hasInsufficientEmployment(app) &&
    !isAmountTooHigh(app)
  );
}

function approveLoan(app: LoanApplication): { approved: boolean; reason?: string } {
  const rejectionReason = getRejectionReason(app);
  if (rejectionReason) {
    return { approved: false, reason: rejectionReason };
  }
  return { approved: true };
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Consolidate Conditional Expression ===\n");

console.log("--- Disability Benefits ---");
const eligibleEmployee: Employee = { seniority: 5, monthsDisabled: 6, isPartTime: false };
const ineligibleEmployee: Employee = { seniority: 1, monthsDisabled: 3, isPartTime: false };

console.log(`Eligible employee: $${disabilityAmount(eligibleEmployee)}`);
console.log(`Ineligible (low seniority): $${disabilityAmount(ineligibleEmployee)}`);
console.log(`Not eligible: ${isNotEligibleForDisability(ineligibleEmployee)}`);

console.log("\n--- Vacation Approval ---");
const vacationRequest: Vacation = {
  daysAccrued: 10,
  daysUsed: 5,
  approved: true,
  department: "engineering",
};
console.log(`Can take vacation: ${canTakeVacation(vacationRequest)}`);

const deniedVacation: Vacation = { ...vacationRequest, approved: false };
console.log(`Unapproved: ${canTakeVacation(deniedVacation)}`);

console.log("\n--- Loan Applications ---");
const goodApplication: LoanApplication = {
  creditScore: 720,
  income: 75000,
  existingDebt: 15000,
  employmentYears: 5,
  bankruptcyHistory: false,
  requestedAmount: 200000,
};

const badApplication: LoanApplication = {
  creditScore: 550,
  income: 50000,
  existingDebt: 25000,
  employmentYears: 0.5,
  bankruptcyHistory: false,
  requestedAmount: 300000,
};

console.log("Good application:", approveLoan(goodApplication));
console.log("Bad application:", approveLoan(badApplication));
console.log(`\nBad app - Eligible: ${isEligibleForLoan(badApplication)}`);
console.log(`Bad app - Poor credit: ${hasPoorCredit(badApplication)}`);
console.log(`Bad app - High debt ratio: ${hasHighDebtRatio(badApplication)}`);

export {};

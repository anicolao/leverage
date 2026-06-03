export type InterfaceSection = {
  id: string;
  title: string;
  appLabel: string;
  question: string;
  validationArtifact: string;
};

export const interfaceSections: InterfaceSection[] = [
  {
    id: 'validation-summary',
    title: 'Validation Summary',
    appLabel: 'XAW.TO proxy validation',
    question: 'How closely does the synthetic XAW proxy track real XAW.TO over the overlap period?',
    validationArtifact: 'src/lib/backtest/xaw.test.ts'
  },
  {
    id: 'comparison-charts',
    title: 'Comparison Charts',
    appLabel: 'Total Return, Price Action, and Dividends tabs',
    question: 'Where does the synthetic proxy agree or disagree with actual XAW price, return, and distributions?',
    validationArtifact: 'src/lib/backtest/xaw.test.ts'
  },
  {
    id: 'simulation-controls',
    title: 'Simulation Controls',
    appLabel: 'Monthly leveraged DCA simulator controls',
    question: 'Which assumptions define the monthly borrowing, investing, interest, and outcome horizon?',
    validationArtifact: 'book/examples/default-scenario.ts'
  },
  {
    id: 'portfolio-stats',
    title: 'Portfolio Statistics',
    appLabel: 'Final Assets, Total Debt, Equity, and related summary tiles',
    question: 'What is the terminal portfolio state under the selected scenario?',
    validationArtifact: 'src/lib/backtest/dcaSimulator.test.ts'
  },
  {
    id: 'portfolio-path',
    title: 'Portfolio Path Chart',
    appLabel: 'Portfolio path',
    question: 'How do assets, debt, equity, and proxy price evolve through the simulation?',
    validationArtifact: 'src/lib/backtest/dcaSimulator.test.ts'
  },
  {
    id: 'checkpoint-table',
    title: 'Checkpoint Table',
    appLabel: 'Simulation checkpoints',
    question: 'What exact monthly state did the simulator record after each checkpoint?',
    validationArtifact: 'src/lib/backtest/dcaSimulator.test.ts'
  },
  {
    id: 'outcome-histogram',
    title: 'Outcome Histogram',
    appLabel: 'final equity outcome by start date',
    question: 'How do fixed-horizon final equity outcomes vary across sampled historical start dates?',
    validationArtifact: 'src/lib/backtest/dcaSimulator.test.ts'
  }
];

export function interfaceSectionIds(): string[] {
  return interfaceSections.map((section) => section.id);
}

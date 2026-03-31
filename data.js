export const RESUME_METHODS = {
  star: {
    name: 'STAR Method',
    description: 'Situation–Task–Action–Result',
    template: 'Situation: {situation} | Task: {task} | Action: {action} | Result: {result}',
    best_for: 'Technical and project-based roles'
  },
  car: {
    name: 'CAR Method',
    description: 'Challenge–Action–Result',
    template: 'Challenge: {challenge} | Action: {action} | Result: {result}',
    best_for: 'Leadership and achievements'
  },
  par: {
    name: 'PAR Method',
    description: 'Problem–Action–Result',
    template: 'Problem: {problem} | Action: {action} | Result: {result}',
    best_for: 'Problem-solving roles'
  },
  soar: {
    name: 'SOAR Method',
    description: 'Situation–Obstacle–Action–Result',
    template: 'Situation: {situation} | Obstacle: {obstacle} | Action: {action} | Result: {result}',
    best_for: 'Demonstrating resilience'
  },
  fab: {
    name: 'FAB Method',
    description: 'Features–Advantages–Benefits',
    template: 'Feature: {feature} | Advantage: {advantage} | Benefit: {benefit}',
    best_for: 'Skills and projects showcase'
  }
};


export const INDUSTRY_STANDARDS = {
  tech: {
    colors: ['#2563eb', '#1f2937', '#059669', '#7c3aed'],
    fonts: ['Inter', 'Roboto', 'Poppins'],
    sections: ['contact', 'summary', 'skills', 'experience', 'projects', 'education'],
    emphasis: 'technical_skills_and_projects'
  },
  medical: {
    colors: ['#dc2626', '#1f2937', '#059669', '#0891b2'],
    fonts: ['Times New Roman', 'Georgia', 'Calibri'],
    sections: ['contact', 'summary', 'education', 'certifications', 'experience', 'skills'],
    emphasis: 'education_and_certifications'
  },
  ai: {
    colors: ['#7c3aed', '#1f2937', '#f59e0b', '#059669'],
    fonts: ['Poppins', 'Inter', 'Roboto'],
    sections: ['contact', 'summary', 'skills', 'research', 'projects', 'experience', 'publications'],
    emphasis: 'research_and_technical_skills'
  }
};
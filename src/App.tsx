import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { HomePage } from '@/features/home/HomePage';
import { TamilHomeworkListPage } from '@/features/tamil-homework/TamilHomeworkListPage';
import { TamilHomeworkFormPage } from '@/features/tamil-homework/TamilHomeworkFormPage';
import { ArithmeticSetupPage } from '@/features/arithmetic/ArithmeticSetupPage';
import { ArithmeticLearnPage } from '@/features/arithmetic/ArithmeticLearnPage';
import { ArithmeticQuestionsPage } from '@/features/arithmetic/ArithmeticQuestionsPage';

/**
 * Route map for the whole app. Keep this file thin - it should only wire
 * paths to page components. Page-level logic belongs in src/features/**.
 */
export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tamil-homework" element={<TamilHomeworkListPage />} />
        <Route path="/tamil-homework/new" element={<TamilHomeworkFormPage />} />
        <Route path="/tamil-homework/edit" element={<TamilHomeworkFormPage />} />
        <Route path="/arithmetic" element={<ArithmeticSetupPage />} />
        <Route path="/arithmetic/learn" element={<ArithmeticLearnPage />} />
        <Route path="/arithmetic/questions" element={<ArithmeticQuestionsPage />} />
      </Routes>
    </AppShell>
  );
}

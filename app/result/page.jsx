import ResultClient from './ResultClient';

export const metadata = { title: 'Your Match · Blot.' };

export default function ResultPage({ searchParams }) {
  const sid = searchParams?.sid || '';
  return <ResultClient sessionId={sid} />;
}

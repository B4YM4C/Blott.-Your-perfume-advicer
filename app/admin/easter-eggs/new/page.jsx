import EditEggPage from '../[id]/page';

export const dynamic = 'force-dynamic';

export default function NewEggPage() {
  return EditEggPage({ params: { id: 'new' } });
}
